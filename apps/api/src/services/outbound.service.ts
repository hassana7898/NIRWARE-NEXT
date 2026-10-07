import { query } from '../db/connection.js';

export class OutboundService {
  public static async listOutbound() {
    return await query(`
      SELECT obr.*,
             d.delivery_number as "deliveryNumber",
             fo.order_number as "orderNumber",
             p.name as "productName",
             f.full_name as "farmerName",
             drv.full_name as "driverName",
             v.plate_number as "plateNumber",
             u.full_name as "scaleOperatorName"
      FROM outbound_remittances obr
      JOIN deliveries d ON d.id = obr.delivery_id
      JOIN feed_orders fo ON fo.id = obr.feed_order_id
      JOIN products p ON p.id = obr.product_id
      JOIN farmers f ON f.id = fo.farmer_id
      JOIN drivers drv ON drv.id = d.driver_id
      JOIN vehicles v ON v.id = d.vehicle_id
      LEFT JOIN users u ON u.id = obr.scale_operator_id
      ORDER BY obr.dispatched_at DESC
    `);
  }
}
