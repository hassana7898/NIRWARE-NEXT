import { OrderStatus, UserRole } from '@nirware/config';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@nirware/shared';
import { OrderStateMachine, QuotaCalculator, AuthorizationPolicy } from '@nirware/domain';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class OrderService {
  public static async listOrders(actor: AuthenticatedUser, status?: string) {
    let sql = `
      SELECT o.*,
             f.full_name as "farmerName",
             fl.flock_code as "flockCode",
             p.name as "productName",
             d.id as "deliveryId",
             d.delivery_number as "deliveryNumber",
             d.status as "deliveryStatus"
      FROM feed_orders o
      JOIN farmers f ON f.id = o.farmer_id
      JOIN flocks fl ON fl.id = o.flock_id
      JOIN products p ON p.id = o.product_id
      LEFT JOIN deliveries d ON d.feed_order_id = o.id
    `;
    const params: any[] = [];

    if (actor.role === UserRole.FARMER) {
      sql += ' WHERE o.farmer_id = $1';
      params.push(actor.farmerId);
      if (status) {
        sql += ' AND o.status = $2';
        params.push(status);
      }
    } else if (status) {
      sql += ' WHERE o.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';
    return await query(sql, params);
  }

  public static async getOrderById(id: string, actor: AuthenticatedUser) {
    const order = await queryOne(
      `SELECT o.*,
              f.full_name as "farmerName",
              fl.flock_code as "flockCode",
              p.name as "productName",
              d.id as "deliveryId",
              d.delivery_number as "deliveryNumber",
              d.status as "deliveryStatus"
       FROM feed_orders o
       JOIN farmers f ON f.id = o.farmer_id
       JOIN flocks fl ON fl.id = o.flock_id
       JOIN products p ON p.id = o.product_id
       LEFT JOIN deliveries d ON d.feed_order_id = o.id
       WHERE o.id = $1`,
      [id]
    );

    if (!order) throw new NotFoundError('سفارش', id);

    AuthorizationPolicy.assertCanAccessOrder(actor, order.farmer_id);
    return order;
  }

  public static async createOrder(
    data: {
      farmerId: string;
      flockId: string;
      quotaId: string;
      productId: string;
      requestedQuantityKg: number;
      deliveryAddress: string;
      deliveryDateNeeded: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    // If actor is farmer, force farmerId to match
    if (actor.role === UserRole.FARMER) {
      if (!actor.farmerId || actor.farmerId !== data.farmerId) {
        throw new ForbiddenError('مرغدار فقط مجاز به ثبت سفارش برای مرغداری خود است');
      }
    }

    return await transaction(async (client) => {
      // 1. Check Quota within transaction
      const qRes = await client.query('SELECT * FROM feed_quotas WHERE id = $1 FOR UPDATE', [
        data.quotaId,
      ]);
      const quota = qRes.rows[0];
      if (!quota) throw new NotFoundError('سهمیه', data.quotaId);

      QuotaCalculator.validateOrderAgainstQuota(
        {
          id: quota.id,
          farmerId: quota.farmer_id,
          flockId: quota.flock_id,
          approvedQuantityKg: Number(quota.approved_quantity_kg),
          usedQuantityKg: Number(quota.used_quantity_kg),
          status: quota.status,
          periodStart: quota.period_start,
          periodEnd: quota.period_end,
        },
        data.requestedQuantityKg
      );

      // 2. Generate unique sequential Order Number
      const countRes = await client.query('SELECT COUNT(*)::int as count FROM feed_orders');
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(
        countRes.rows[0].count + 1
      ).padStart(4, '0')}`;

      // 3. Insert order in SUBMITTED state (or DRAFT if requested)
      const initialStatus = OrderStatus.SUBMITTED;

      const orderRes = await client.query(
        `INSERT INTO feed_orders (
           order_number, farmer_id, flock_id, quota_id, product_id,
           requested_quantity_kg, approved_quantity_kg, status,
           delivery_address, delivery_date_needed, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          orderNumber,
          data.farmerId,
          data.flockId,
          data.quotaId,
          data.productId,
          data.requestedQuantityKg,
          0,
          initialStatus,
          data.deliveryAddress,
          data.deliveryDateNeeded,
          data.notes || null,
        ]
      );
      const order = orderRes.rows[0];

      // 4. Audit entry
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'CREATE_ORDER',
        entityType: 'FeedOrder',
        entityId: order.id,
        details: { orderNumber, requestedQuantityKg: data.requestedQuantityKg },
      });

      return order;
    });
  }

  public static async transitionOrder(
    orderId: string,
    params: {
      action: string;
      targetState: OrderStatus;
      approvedQuantityKg?: number;
      rejectionReason?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      // Lock order row for update
      const res = await client.query('SELECT * FROM feed_orders WHERE id = $1 FOR UPDATE', [
        orderId,
      ]);
      const order = res.rows[0];
      if (!order) throw new NotFoundError('سفارش', orderId);

      // Verify delivery link if any
      const delRes = await client.query('SELECT * FROM deliveries WHERE feed_order_id = $1', [
        orderId,
      ]);
      const delivery = delRes.rows[0];

      // Run Central State Machine validation
      const rule = OrderStateMachine.validateTransition(order.status, params.targetState, {
        userId: actor.id,
        role: actor.role,
        farmerId: actor.farmerId,
        driverId: actor.driverId,
        orderFarmerId: order.farmer_id,
        deliveryDriverId: delivery ? delivery.driver_id : undefined,
      });

      let approvedKg = order.approved_quantity_kg;

      // Business logic on APPROVE:
      if (params.targetState === OrderStatus.APPROVED) {
        approvedKg = params.approvedQuantityKg || order.requested_quantity_kg;

        // Deduct from Feed Quota
        const qRes = await client.query(
          'SELECT * FROM feed_quotas WHERE id = $1 FOR UPDATE',
          [order.quota_id]
        );
        const quota = qRes.rows[0];
        if (quota) {
          const newUsedKg = Number(quota.used_quantity_kg) + approvedKg;
          const newStatus = QuotaCalculator.computeStatusAfterUsage(
            Number(quota.approved_quantity_kg),
            newUsedKg
          );
          await client.query(
            'UPDATE feed_quotas SET used_quantity_kg = $1, status = $2 WHERE id = $3',
            [newUsedKg, newStatus, quota.id]
          );
        }
      }

      // Update Order State
      const updatedRes = await client.query(
        `UPDATE feed_orders
         SET status = $1,
             approved_quantity_kg = $2,
             rejection_reason = COALESCE($3, rejection_reason),
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          params.targetState,
          approvedKg,
          params.rejectionReason || null,
          params.notes || null,
          orderId,
        ]
      );
      const updatedOrder = updatedRes.rows[0];

      // Transactional Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: rule.action,
        entityType: 'FeedOrder',
        entityId: orderId,
        details: {
          from: order.status,
          to: params.targetState,
          approvedQuantityKg: approvedKg,
          rejectionReason: params.rejectionReason,
        },
      });

      return updatedOrder;
    });
  }
}
