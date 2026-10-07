import {
  DeliveryStatus,
  OrderStatus,
  UserRole,
  InventoryTransactionType,
  InventoryReferenceType,
} from '@nirware/config';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  generateSecureOtp,
  hashToken,
  verifyOtpHash,
} from '@nirware/shared';
import { DeliveryStateMachine, AuthorizationPolicy } from '@nirware/domain';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class LogisticsService {
  // --- Drivers & Vehicles ---
  public static async listDrivers() {
    return await query(`
      SELECT d.*, u.username,
             (SELECT COUNT(*) FROM deliveries WHERE driver_id = d.id AND status NOT IN ('CONFIRMED', 'CANCELLED'))::int as "activeDeliveriesCount"
      FROM drivers d
      LEFT JOIN users u ON u.id = d.user_id
      ORDER BY d.full_name ASC
    `);
  }

  public static async listVehicles() {
    return await query(`
      SELECT v.*, d.full_name as "driverName"
      FROM vehicles v
      LEFT JOIN drivers d ON d.id = v.driver_id
      ORDER BY v.plate_number ASC
    `);
  }

  // --- Deliveries ---
  public static async listDeliveries(actor: AuthenticatedUser, status?: string) {
    let sql = `
      SELECT del.*,
             fo.order_number as "orderNumber",
             fo.requested_quantity_kg as "requestedQuantityKg",
             fo.approved_quantity_kg as "approvedQuantityKg",
             p.name as "productName",
             f.id as "farmerId",
             f.full_name as "farmerName",
             f.mobile as "farmerMobile",
             d.full_name as "driverName",
             d.mobile as "driverMobile",
             v.plate_number as "plateNumber",
             v.vehicle_type as "vehicleType"
      FROM deliveries del
      JOIN feed_orders fo ON fo.id = del.feed_order_id
      JOIN products p ON p.id = fo.product_id
      JOIN farmers f ON f.id = fo.farmer_id
      JOIN drivers d ON d.id = del.driver_id
      JOIN vehicles v ON v.id = del.vehicle_id
    `;
    const params: any[] = [];

    if (actor.role === UserRole.DRIVER) {
      sql += ' WHERE del.driver_id = $1';
      params.push(actor.driverId);
      if (status) {
        sql += ' AND del.status = $2';
        params.push(status);
      }
    } else if (actor.role === UserRole.FARMER) {
      sql += ' WHERE f.id = $1';
      params.push(actor.farmerId);
      if (status) {
        sql += ' AND del.status = $2';
        params.push(status);
      }
    } else if (status) {
      sql += ' WHERE del.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY del.created_at DESC';
    return await query(sql, params);
  }

  public static async getDeliveryById(id: string, actor: AuthenticatedUser) {
    const del = await queryOne(
      `SELECT del.*,
              fo.order_number as "orderNumber",
              fo.requested_quantity_kg as "requestedQuantityKg",
              fo.approved_quantity_kg as "approvedQuantityKg",
              fo.delivery_address as "deliveryAddress",
              p.name as "productName",
              f.id as "farmerId",
              f.full_name as "farmerName",
              f.mobile as "farmerMobile",
              d.full_name as "driverName",
              d.mobile as "driverMobile",
              v.plate_number as "plateNumber",
              v.vehicle_type as "vehicleType"
       FROM deliveries del
       JOIN feed_orders fo ON fo.id = del.feed_order_id
       JOIN products p ON p.id = fo.product_id
       JOIN farmers f ON f.id = fo.farmer_id
       JOIN drivers d ON d.id = del.driver_id
       JOIN vehicles v ON v.id = del.vehicle_id
       WHERE del.id = $1`,
      [id]
    );

    if (!del) throw new NotFoundError('بارنامه / ارسال', id);

    AuthorizationPolicy.assertCanAccessDelivery(actor, {
      driverId: del.driver_id,
      farmerId: del.farmerId,
    });

    return del;
  }

  /**
   * Assigns driver to an approved feed order, creating delivery record
   */
  public static async assignDriver(
    data: {
      feedOrderId: string;
      driverId: string;
      vehicleId: string;
      originScaleWeightKg: number;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      // Lock order
      const ordRes = await client.query(
        'SELECT * FROM feed_orders WHERE id = $1 FOR UPDATE',
        [data.feedOrderId]
      );
      const order = ordRes.rows[0];
      if (!order) throw new NotFoundError('سفارش', data.feedOrderId);

      // Generate Delivery Number
      const countRes = await client.query('SELECT COUNT(*)::int as count FROM deliveries');
      const deliveryNumber = `DEL-${new Date().getFullYear()}-${String(
        countRes.rows[0].count + 1
      ).padStart(4, '0')}`;

      // Insert Delivery in ASSIGNED state
      const delRes = await client.query(
        `INSERT INTO deliveries (
           delivery_number, feed_order_id, driver_id, vehicle_id,
           status, origin_scale_weight_kg, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          deliveryNumber,
          data.feedOrderId,
          data.driverId,
          data.vehicleId,
          DeliveryStatus.ASSIGNED,
          data.originScaleWeightKg,
          data.notes || null,
        ]
      );
      const delivery = delRes.rows[0];

      // Update Order Status to ASSIGNED_TO_DRIVER
      await client.query(
        'UPDATE feed_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [OrderStatus.ASSIGNED_TO_DRIVER, data.feedOrderId]
      );

      // Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'ASSIGN_DRIVER',
        entityType: 'Delivery',
        entityId: delivery.id,
        details: { deliveryNumber, driverId: data.driverId, vehicleId: data.vehicleId },
      });

      return delivery;
    });
  }

  /**
   * Transitions delivery status: PICKED_UP, IN_TRANSIT, DELIVERED
   */
  public static async updateDeliveryStatus(
    deliveryId: string,
    targetStatus: DeliveryStatus,
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      const delRes = await client.query('SELECT * FROM deliveries WHERE id = $1 FOR UPDATE', [
        deliveryId,
      ]);
      const delivery = delRes.rows[0];
      if (!delivery) throw new NotFoundError('بارنامه', deliveryId);

      // Validate delivery state machine
      const rule = DeliveryStateMachine.validateTransition(delivery.status, targetStatus, {
        userId: actor.id,
        role: actor.role,
        driverId: actor.driverId,
        deliveryDriverId: delivery.driver_id,
      });

      let orderTargetStatus: OrderStatus | null = null;
      if (targetStatus === DeliveryStatus.PICKED_UP) {
        orderTargetStatus = OrderStatus.PICKED_UP;

        // When picked up, record Outbound Remittance & deduct from finished goods ledger!
        const ordRes = await client.query('SELECT * FROM feed_orders WHERE id = $1', [
          delivery.feed_order_id,
        ]);
        const order = ordRes.rows[0];

        const remCountRes = await client.query('SELECT COUNT(*)::int as count FROM outbound_remittances');
        const remNumber = `OUT-${new Date().getFullYear()}-${String(
          remCountRes.rows[0].count + 1
        ).padStart(4, '0')}`;

        await client.query(
          `INSERT INTO outbound_remittances (
             remittance_number, delivery_id, feed_order_id, product_id,
             dispatched_weight_kg, scale_operator_id
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            remNumber,
            delivery.id,
            order.id,
            order.product_id,
            delivery.origin_scale_weight_kg,
            actor.id,
          ]
        );

        // Deduct from finished feed stock in ledger (OUTBOUND)
        const stockRes = await client.query(
          'SELECT COALESCE(SUM(quantity_delta_kg), 0) as balance FROM inventory_ledger WHERE product_id = $1',
          [order.product_id]
        );
        const prevBal = Number(stockRes.rows[0].balance);
        const newBal = prevBal - Number(delivery.origin_scale_weight_kg);

        await client.query(
          `INSERT INTO inventory_ledger (
             product_id, transaction_type, quantity_delta_kg, running_balance_kg,
             reference_type, reference_id, notes, created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            order.product_id,
            InventoryTransactionType.OUTBOUND,
            -Number(delivery.origin_scale_weight_kg),
            newBal,
            InventoryReferenceType.OUTBOUND_REMITTANCE,
            delivery.id,
            `خروج خوراک پلت به مقصد مرغداری طبق بارنامه ${delivery.delivery_number}`,
            actor.id,
          ]
        );
      } else if (targetStatus === DeliveryStatus.IN_TRANSIT) {
        orderTargetStatus = OrderStatus.IN_TRANSIT;
      } else if (targetStatus === DeliveryStatus.DELIVERED) {
        orderTargetStatus = OrderStatus.DELIVERED;
      }

      // Update Delivery
      const updatedDelRes = await client.query(
        'UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [targetStatus, deliveryId]
      );

      // Update Feed Order corresponding state
      if (orderTargetStatus) {
        await client.query('UPDATE feed_orders SET status = $1, updated_at = NOW() WHERE id = $2', [
          orderTargetStatus,
          delivery.feed_order_id,
        ]);
      }

      // Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: rule.action,
        entityType: 'Delivery',
        entityId: deliveryId,
        details: { from: delivery.status, to: targetStatus },
      });

      return updatedDelRes.rows[0];
    });
  }

  /**
   * Generates a cryptographically secure OTP for delivery verification.
   * Stored ONLY as hash in DB.
   */
  public static async generateDeliveryOtp(deliveryId: string, actor: AuthenticatedUser) {
    const rawOtp = generateSecureOtp(6);
    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `UPDATE deliveries
       SET otp_hash = $1,
           otp_expires_at = $2,
           otp_attempts = 0,
           updated_at = NOW()
       WHERE id = $3`,
      [otpHash, expiresAt, deliveryId]
    );

    await AuditService.log({
      userId: actor.id,
      action: 'GENERATE_DELIVERY_OTP',
      entityType: 'Delivery',
      entityId: deliveryId,
    });

    // In development / demo, we return rawOtp for testing. In production, dispatched via SMS.
    return { success: true, expiresAt: expiresAt.toISOString(), devOtpPreview: rawOtp };
  }

  /**
   * Verifies OTP and confirms delivery receipt with digital signature and photo
   */
  public static async confirmDeliveryReceipt(
    data: {
      deliveryId: string;
      otpCode?: string;
      signatureData: string;
      photoData?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    return await transaction(async (client) => {
      const delRes = await client.query('SELECT * FROM deliveries WHERE id = $1 FOR UPDATE', [
        data.deliveryId,
      ]);
      const delivery = delRes.rows[0];
      if (!delivery) throw new NotFoundError('بارنامه', data.deliveryId);

      if (delivery.status === DeliveryStatus.CONFIRMED) {
        throw new ValidationError('این بارنامه از قبل تایید و مختومه شده است');
      }

      // If OTP provided, verify security constraints
      if (data.otpCode) {
        if (!delivery.otp_hash || !delivery.otp_expires_at) {
          throw new ValidationError('کد تایید OTP برای این مرسوله صادر نشده است');
        }

        if (new Date(delivery.otp_expires_at) < new Date()) {
          throw new ValidationError('کد تایید OTP منقضی شده است. لطفاً کد جدید درخواست نمایید');
        }

        if (delivery.otp_attempts >= 3) {
          throw new ValidationError('تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد تایید باطل گردید');
        }

        const isMatch = verifyOtpHash(data.otpCode, delivery.otp_hash);
        if (!isMatch) {
          await client.query('UPDATE deliveries SET otp_attempts = otp_attempts + 1 WHERE id = $1', [
            data.deliveryId,
          ]);
          throw new ValidationError('کد تایید OTP وارد شده نادرست است');
        }
      }

      // Mark Delivery CONFIRMED
      const updatedDelRes = await client.query(
        `UPDATE deliveries
         SET status = $1,
             signature_data = $2,
             photo_url = COALESCE($3, photo_url),
             confirmed_at = NOW(),
             confirmed_by = $4,
             notes = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          DeliveryStatus.CONFIRMED,
          data.signatureData,
          data.photoData || null,
          actor.fullName,
          data.notes || null,
          data.deliveryId,
        ]
      );

      // Mark Order CONFIRMED
      await client.query(
        'UPDATE feed_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [OrderStatus.CONFIRMED, delivery.feed_order_id]
      );

      // Transactional Audit
      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'CONFIRM_DELIVERY_RECEIPT',
        entityType: 'Delivery',
        entityId: data.deliveryId,
        details: { confirmedBy: actor.fullName, withOtp: !!data.otpCode },
      });

      return updatedDelRes.rows[0];
    });
  }
}
