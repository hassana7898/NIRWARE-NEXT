import {
  InventoryTransactionType,
  InventoryReferenceType,
} from '@nirware/config';
import { NotFoundError, ValidationError } from '@nirware/shared';
import { InventoryLedgerDomain } from '@nirware/domain';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class InventoryService {
  public static async listLedger(productId?: string, limit = 50) {
    let sql = `
      SELECT l.*, p.name as "productName", p.code as "productCode", p.unit,
             u.full_name as "createdByName"
      FROM inventory_ledger l
      JOIN products p ON p.id = l.product_id
      LEFT JOIN users u ON u.id = l.created_by
    `;
    const params: any[] = [];
    if (productId) {
      sql += ' WHERE l.product_id = $1';
      params.push(productId);
    }
    sql += ' ORDER BY l.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    return await query(sql, params);
  }

  public static async getStockSummary() {
    return await query(`
      SELECT p.id, p.name, p.code, p.unit, p.product_type as "productType",
             p.min_stock_level_kg as "minStockLevelKg",
             COALESCE(SUM(l.quantity_delta_kg), 0) as "currentStockKg",
             CASE
               WHEN COALESCE(SUM(l.quantity_delta_kg), 0) <= p.min_stock_level_kg THEN true
               ELSE false
             END as "isLowStock"
      FROM products p
      LEFT JOIN inventory_ledger l ON l.product_id = p.id
      GROUP BY p.id, p.name, p.code, p.unit, p.product_type, p.min_stock_level_kg
      ORDER BY p.product_type ASC, p.name ASC
    `);
  }

  public static async getProductStock(productId: string): Promise<number> {
    const res = await queryOne<{ balance: string | number }>(
      'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
      [productId]
    );
    return res ? Number(res.balance) : 0;
  }

  /**
   * Reverses an incorrect ledger entry and records the compensating correction
   */
  public static async reverseLedgerEntry(
    ledgerId: string,
    reason: string,
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      const origRes = await client.query('SELECT * FROM inventory_ledger WHERE id = $1', [
        ledgerId,
      ]);
      const original = origRes.rows[0];
      if (!original) throw new NotFoundError('تراکنش انبار', ledgerId);

      // Lock product
      await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [
        original.product_id,
      ]);

      const stockRes = await client.query(
        'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
        [original.product_id]
      );
      const currentBalance = Number(stockRes.rows[0].balance);

      const { reversalDeltaKg, newBalanceKg, notes } =
        InventoryLedgerDomain.createReversalEntry(
          {
            id: original.id,
            productId: original.product_id,
            transactionType: original.transaction_type,
            quantityDeltaKg: Number(original.quantity_delta_kg),
            runningBalanceKg: Number(original.running_balance_kg),
            referenceType: original.reference_type,
            referenceId: original.reference_id,
            createdAt: original.created_at,
          },
          currentBalance,
          reason
        );

      const revRes = await client.query(
        `INSERT INTO inventory_ledger (
           product_id, transaction_type, quantity_delta_kg, running_balance_kg,
           reference_type, reference_id, notes, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          original.product_id,
          InventoryTransactionType.REVERSAL,
          reversalDeltaKg,
          newBalanceKg,
          InventoryReferenceType.REVERSAL,
          original.id,
          notes,
          actor.id,
        ]
      );

      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'REVERSE_INVENTORY_LEDGER',
        entityType: 'InventoryLedger',
        entityId: original.id,
        details: { reversalId: revRes.rows[0].id, reversalDeltaKg, reason },
      });

      return revRes.rows[0];
    });
  }
}
