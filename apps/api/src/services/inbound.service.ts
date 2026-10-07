import {
  InventoryTransactionType,
  InventoryReferenceType,
} from '@nirware/config';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class InboundService {
  public static async listInbound() {
    return await query(`
      SELECT ir.*, p.name as "rawMaterialProductName", p.code as "rawMaterialProductCode",
             u.full_name as "scaleOperatorName"
      FROM inbound_remittances ir
      JOIN products p ON p.id = ir.raw_material_product_id
      LEFT JOIN users u ON u.id = ir.scale_operator_id
      ORDER BY ir.received_at DESC
    `);
  }

  public static async createInbound(
    data: {
      sellerName: string;
      rawMaterialProductId: string;
      billNumber: string;
      originLocation: string;
      invoiceWeightKg: number;
      scaleWeightKg: number;
      transportCost: number;
      driverName: string;
      driverPhone: string;
      driverIban?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      // Calculate shortage/wastage
      const shortageKg = Math.max(0, data.invoiceWeightKg - data.scaleWeightKg);
      const wastageKg = shortageKg > 0 ? shortageKg : 0;

      // Generate Remittance Number
      const countRes = await client.query('SELECT COUNT(*)::int as count FROM inbound_remittances');
      const remittanceNumber = `INB-${new Date().getFullYear()}-${String(
        countRes.rows[0].count + 1
      ).padStart(4, '0')}`;

      // Insert Inbound Remittance
      const inbRes = await client.query(
        `INSERT INTO inbound_remittances (
           remittance_number, seller_name, raw_material_product_id, bill_number,
           origin_location, invoice_weight_kg, scale_weight_kg, shortage_kg, wastage_kg,
           transport_cost, driver_name, driver_phone, driver_iban, scale_operator_id, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          remittanceNumber,
          data.sellerName,
          data.rawMaterialProductId,
          data.billNumber,
          data.originLocation,
          data.invoiceWeightKg,
          data.scaleWeightKg,
          shortageKg,
          wastageKg,
          data.transportCost || 0,
          data.driverName,
          data.driverPhone,
          data.driverIban || null,
          actor.id,
          data.notes || null,
        ]
      );
      const remittance = inbRes.rows[0];

      // Update Ledger: add actual scale weight to inventory
      const stockRes = await client.query(
        'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
        [data.rawMaterialProductId]
      );
      const prevBal = Number(stockRes.rows[0].balance);
      const newBal = prevBal + data.scaleWeightKg;

      await client.query(
        `INSERT INTO inventory_ledger (
           product_id, transaction_type, quantity_delta_kg, running_balance_kg,
           reference_type, reference_id, notes, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.rawMaterialProductId,
          InventoryTransactionType.INBOUND,
          data.scaleWeightKg,
          newBal,
          InventoryReferenceType.INBOUND_REMITTANCE,
          remittance.id,
          `ورود نهاده اولیه طبق بارنامه ${data.billNumber} و حواله ورود ${remittanceNumber}`,
          actor.id,
        ]
      );

      // Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'CREATE_INBOUND_REMITTANCE',
        entityType: 'InboundRemittance',
        entityId: remittance.id,
        details: { remittanceNumber, scaleWeightKg: data.scaleWeightKg, sellerName: data.sellerName },
      });

      return remittance;
    });
  }
}
