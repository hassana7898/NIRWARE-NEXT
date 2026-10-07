import {
  InventoryTransactionType,
  InventoryReferenceType,
  ProductionBatchStatus,
} from '@nirware/config';
import { NotFoundError, InventoryShortageError } from '@nirware/shared';
import { BomCalculator } from '@nirware/domain';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class ProductionService {
  public static async listBatches() {
    return await query(
      `SELECT pb.*, f.code as "formulaCode", p.name as "productName",
              fo.order_number as "orderNumber", u.full_name as "operatorName"
       FROM production_batches pb
       JOIN formulas f ON f.id = pb.formula_id
       JOIN products p ON p.id = f.product_id
       LEFT JOIN feed_orders fo ON fo.id = pb.feed_order_id
       LEFT JOIN users u ON u.id = pb.operator_id
       ORDER BY pb.created_at DESC`
    );
  }

  public static async getBatchById(id: string) {
    const batch = await queryOne(
      `SELECT pb.*, f.code as "formulaCode", p.name as "productName",
              fo.order_number as "orderNumber", u.full_name as "operatorName"
       FROM production_batches pb
       JOIN formulas f ON f.id = pb.formula_id
       JOIN products p ON p.id = f.product_id
       LEFT JOIN feed_orders fo ON fo.id = pb.feed_order_id
       LEFT JOIN users u ON u.id = pb.operator_id
       WHERE pb.id = $1`,
      [id]
    );
    if (!batch) throw new NotFoundError('بچ تولید', id);
    return batch;
  }

  /**
   * Executes a production batch end-to-end:
   * 1. Validates formula composition
   * 2. Calculates required ingredients for target quantity
   * 3. Locks product inventory rows in PostgreSQL
   * 4. Checks available stock for each raw material (Rolls back if insufficient!)
   * 5. Deducts raw materials from inventory ledger (CONSUMPTION_OUT)
   * 6. Adds finished feed to inventory ledger (PRODUCTION_IN)
   * 7. Records batch as COMPLETED
   * 8. Records transactional audit log
   * 9. Commits transaction
   */
  public static async executeBatch(
    data: {
      formulaId: string;
      feedOrderId?: string;
      targetQuantityKg: number;
      batchNumber: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      // 1. Fetch Formula and items
      const fRes = await client.query('SELECT * FROM formulas WHERE id = $1', [data.formulaId]);
      const formula = fRes.rows[0];
      if (!formula) throw new NotFoundError('فرمولاسیون', data.formulaId);

      const itemsRes = await client.query(
        `SELECT fi.*, p.name as "rawMaterialProductName"
         FROM formula_items fi
         JOIN products p ON p.id = fi.raw_material_product_id
         WHERE fi.formula_id = $1`,
        [data.formulaId]
      );
      const items = itemsRes.rows;

      // 2. Validate BOM
      BomCalculator.validateFormulaComposition(
        items.map((i: any) => ({
          rawMaterialProductId: i.raw_material_product_id,
          quantityKg: Number(i.quantity_kg),
          percentage: Number(i.percentage),
        })),
        Number(formula.batch_size_kg)
      );

      // 3. Calculate Material Requirements
      const requiredMaterials = BomCalculator.calculateRequiredMaterials(
        {
          id: formula.id,
          code: formula.code,
          productId: formula.product_id,
          batchSizeKg: Number(formula.batch_size_kg),
          isActive: formula.is_active,
          items: items.map((i: any) => ({
            rawMaterialProductId: i.raw_material_product_id,
            quantityKg: Number(i.quantity_kg),
            percentage: Number(i.percentage),
          })),
        },
        data.targetQuantityKg
      );

      // 4. Lock raw material products and check inventory
      for (const req of requiredMaterials) {
        // Lock product row to prevent race conditions
        const prodRes = await client.query(
          'SELECT id, name FROM products WHERE id = $1 FOR UPDATE',
          [req.rawMaterialProductId]
        );
        const prod = prodRes.rows[0];

        // Compute current stock from immutable ledger
        const stockRes = await client.query(
          'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
          [req.rawMaterialProductId]
        );
        const availableStock = Number(stockRes.rows[0].balance);

        if (availableStock < req.quantityKg) {
          // STRICT RULE: If inventory insufficient, ROLLBACK!
          throw new InventoryShortageError(
            req.rawMaterialProductId,
            prod.name,
            req.quantityKg,
            availableStock
          );
        }
      }

      // 5. Create Production Batch record
      const batchRes = await client.query(
        `INSERT INTO production_batches (
           batch_number, formula_id, feed_order_id, target_quantity_kg,
           actual_produced_quantity_kg, status, operator_id, started_at, completed_at, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
         RETURNING *`,
        [
          data.batchNumber,
          data.formulaId,
          data.feedOrderId || null,
          data.targetQuantityKg,
          data.targetQuantityKg,
          ProductionBatchStatus.COMPLETED,
          actor.id,
          data.notes || null,
        ]
      );
      const batch = batchRes.rows[0];

      // 6. Deduct raw materials into Ledger (CONSUMPTION_OUT)
      for (const req of requiredMaterials) {
        const stockRes = await client.query(
          'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
          [req.rawMaterialProductId]
        );
        const prevBal = Number(stockRes.rows[0].balance);
        const newBal = prevBal - req.quantityKg;

        await client.query(
          `INSERT INTO inventory_ledger (
             product_id, transaction_type, quantity_delta_kg, running_balance_kg,
             reference_type, reference_id, notes, created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.rawMaterialProductId,
            InventoryTransactionType.CONSUMPTION_OUT,
            -req.quantityKg,
            newBal,
            InventoryReferenceType.PRODUCTION_BATCH,
            batch.id,
            `مصرف ماده اولیه در بچ تولید شماره ${data.batchNumber}`,
            actor.id,
          ]
        );
      }

      // 7. Add finished feed into Ledger (PRODUCTION_IN)
      const finishedProdId = formula.product_id;
      const finStockRes = await client.query(
        'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
        [finishedProdId]
      );
      const finPrevBal = Number(finStockRes.rows[0].balance);
      const finNewBal = finPrevBal + data.targetQuantityKg;

      await client.query(
        `INSERT INTO inventory_ledger (
           product_id, transaction_type, quantity_delta_kg, running_balance_kg,
           reference_type, reference_id, notes, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          finishedProdId,
          InventoryTransactionType.PRODUCTION_IN,
          data.targetQuantityKg,
          finNewBal,
          InventoryReferenceType.PRODUCTION_BATCH,
          batch.id,
          `ورود خوراک تولیدی بچ شماره ${data.batchNumber} به انبار محصول`,
          actor.id,
        ]
      );

      // 8. Transactional Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'EXECUTE_PRODUCTION_BATCH',
        entityType: 'ProductionBatch',
        entityId: batch.id,
        details: {
          batchNumber: data.batchNumber,
          targetQuantityKg: data.targetQuantityKg,
          formulaId: data.formulaId,
        },
      });

      return batch;
    });
  }
}
