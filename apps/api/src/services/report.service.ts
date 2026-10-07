import { query, queryOne } from '../db/connection.js';

export class ReportService {
  public static async getDashboardKpis() {
    const counts = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM farmers WHERE status = 'ACTIVE')::int as "activeFarmersCount",
        (SELECT COUNT(*) FROM flocks WHERE status = 'ACTIVE')::int as "activeFlocksCount",
        (SELECT COUNT(*) FROM feed_orders WHERE status IN ('SUBMITTED', 'PENDING_APPROVAL'))::int as "pendingOrdersCount",
        (SELECT COUNT(*) FROM production_batches WHERE status IN ('PLANNED', 'IN_PROGRESS'))::int as "inProductionBatchesCount",
        (SELECT COUNT(*) FROM deliveries WHERE status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'))::int as "activeDeliveriesCount",
        (SELECT COUNT(*) FROM drivers WHERE status = 'AVAILABLE')::int as "availableDriversCount"
    `);

    // Stock totals
    const stockStats = await queryOne(`
      SELECT
        COALESCE(SUM(CASE WHEN p.product_type = 'FINISHED_FEED' THEN l.quantity_delta_kg ELSE 0 END), 0)::numeric as "totalFinishedFeedStockKg",
        COALESCE(SUM(CASE WHEN p.product_type = 'RAW_MATERIAL' THEN l.quantity_delta_kg ELSE 0 END), 0)::numeric as "totalRawMaterialsStockKg"
      FROM products p
      LEFT JOIN inventory_ledger l ON l.product_id = p.id
    `);

    // Low stock count
    const lowStock = await queryOne(`
      SELECT COUNT(*)::int as count
      FROM (
        SELECT p.id, p.min_stock_level_kg, COALESCE(SUM(l.quantity_delta_kg), 0) as balance
        FROM products p
        LEFT JOIN inventory_ledger l ON l.product_id = p.id
        GROUP BY p.id, p.min_stock_level_kg
        HAVING COALESCE(SUM(l.quantity_delta_kg), 0) <= p.min_stock_level_kg
      ) sub
    `);

    // Recent orders
    const recentOrders = await query(`
      SELECT fo.*, f.full_name as "farmerName", p.name as "productName"
      FROM feed_orders fo
      JOIN farmers f ON f.id = fo.farmer_id
      JOIN products p ON p.id = fo.product_id
      ORDER BY fo.created_at DESC
      LIMIT 5
    `);

    // Recent batches
    const recentBatches = await query(`
      SELECT pb.*, f.code as "formulaCode", p.name as "productName"
      FROM production_batches pb
      JOIN formulas f ON f.id = pb.formula_id
      JOIN products p ON p.id = f.product_id
      ORDER BY pb.created_at DESC
      LIMIT 5
    `);

    // Recent ledger entries
    const recentLedgerEntries = await query(`
      SELECT l.*, p.name as "productName"
      FROM inventory_ledger l
      JOIN products p ON p.id = l.product_id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    return {
      activeFarmersCount: counts?.activeFarmersCount || 0,
      activeFlocksCount: counts?.activeFlocksCount || 0,
      pendingOrdersCount: counts?.pendingOrdersCount || 0,
      inProductionBatchesCount: counts?.inProductionBatchesCount || 0,
      activeDeliveriesCount: counts?.activeDeliveriesCount || 0,
      availableDriversCount: counts?.availableDriversCount || 0,
      totalFinishedFeedStockKg: Number(stockStats?.totalFinishedFeedStockKg || 0),
      totalRawMaterialsStockKg: Number(stockStats?.totalRawMaterialsStockKg || 0),
      lowStockItemsCount: lowStock?.count || 0,
      recentOrders,
      recentBatches,
      recentLedgerEntries,
    };
  }

  public static async getFlockPerformanceReport() {
    return await query(`
      SELECT fl.id, fl.flock_code as "flockCode", fl.breed, fl.chick_count as "chickCount",
             fl.mortality_count as "mortalityCount",
             ROUND(((fl.mortality_count::numeric / NULLIF(fl.chick_count, 0)) * 100), 2) as "mortalityPercentage",
             fl.feed_consumed_kg as "feedConsumedKg",
             fl.final_weight_grams as "avgFinalWeightGrams",
             CASE
               WHEN fl.final_weight_grams > 0 AND (fl.chick_count - fl.mortality_count) > 0 THEN
                 ROUND((fl.feed_consumed_kg / (((fl.chick_count - fl.mortality_count) * fl.final_weight_grams) / 1000.0))::numeric, 3)
               ELSE 0
             END as "calculatedFcr",
             fl.start_date as "startDate",
             fl.status,
             f.full_name as "farmerName",
             fm.name as "farmName"
      FROM flocks fl
      JOIN poultry_houses h ON h.id = fl.poultry_house_id
      JOIN farms fm ON fm.id = h.farm_id
      JOIN farmers f ON f.id = fm.farmer_id
      ORDER BY fl.start_date DESC
    `);
  }

  public static async getFactorySummary(fromDate?: string, toDate?: string) {
    const params: any[] = [];
    let dateFilterProd = '';
    let dateFilterDel = '';
    let dateFilterInbound = '';
    let dateFilterFlock = '';

    if (fromDate && toDate) {
      params.push(fromDate, toDate);
      dateFilterProd = ' AND pb.created_at >= $1 AND pb.created_at <= $2';
      dateFilterDel = ' AND created_at >= $1 AND created_at <= $2';
      dateFilterInbound = ' AND received_at >= $1 AND received_at <= $2';
      dateFilterFlock = ' AND start_date >= $1 AND start_date <= $2';
    } else if (fromDate) {
      params.push(fromDate);
      dateFilterProd = ' AND pb.created_at >= $1';
      dateFilterDel = ' AND created_at >= $1';
      dateFilterInbound = ' AND received_at >= $1';
      dateFilterFlock = ' AND start_date >= $1';
    }

    const prodRes = await queryOne(
      `SELECT COALESCE(SUM(pb.actual_produced_quantity_kg), 0)::numeric as "monthlyProducedKg"
       FROM production_batches pb
       WHERE pb.status = 'COMPLETED' ${dateFilterProd}`,
      params
    );

    const delRes = await queryOne(
      `SELECT COUNT(*)::int as "monthlyDeliveredServices"
       FROM deliveries
       WHERE status = 'CONFIRMED' ${dateFilterDel}`,
      params
    );

    const fcrRes = await queryOne(
      `SELECT COALESCE(ROUND(AVG(NULLIF(conversion_ratio, 0))::numeric, 2), 0) as "avgFcr"
       FROM flocks
       WHERE conversion_ratio > 0 ${dateFilterFlock}`,
      params
    );

    // Inbound shortage & wastage rate calculation: (SUM(shortage_kg + wastage_kg) / SUM(invoice_weight_kg)) * 100
    const wastageRes = await queryOne(
      `SELECT
         COALESCE(ROUND((SUM(shortage_kg + wastage_kg) * 100.0 / NULLIF(SUM(invoice_weight_kg), 0))::numeric, 2), 0) as "inboundWastageRate"
       FROM inbound_remittances
       WHERE status = 'CONFIRMED' ${dateFilterInbound}`,
      params
    );

    // Dynamic Product Distribution by Feed Formula using Window Function for exact range denominator
    const distributionRes = await query(
      `SELECT
         p.name as "productName",
         COALESCE(SUM(pb.actual_produced_quantity_kg), 0)::numeric as "producedKg",
         COALESCE(
           ROUND(
             (SUM(pb.actual_produced_quantity_kg) * 100.0 / NULLIF(SUM(SUM(pb.actual_produced_quantity_kg)) OVER(), 0))::numeric,
             1
           ),
           0
         ) as "percentage"
       FROM production_batches pb
       JOIN formulas f ON f.id = pb.formula_id
       JOIN products p ON p.id = f.product_id
       WHERE pb.status = 'COMPLETED' ${dateFilterProd}
       GROUP BY p.name
       ORDER BY "producedKg" DESC`,
      params
    );

    const fcrItems = await this.getFlockPerformanceReport();

    return {
      monthlyProducedKg: Number(prodRes?.monthlyProducedKg || 0),
      monthlyDeliveredServices: Number(delRes?.monthlyDeliveredServices || 0),
      averageFcr: Number(fcrRes?.avgFcr || 0),
      wastageRate: Number(wastageRes?.inboundWastageRate || 0),
      inboundWastageRate: Number(wastageRes?.inboundWastageRate || 0),
      productDistribution: distributionRes.map((d: any) => ({
        productName: d.productName,
        producedKg: Number(d.producedKg || 0),
        percentage: Number(d.percentage || 0),
      })),
      flockEfficiencies: fcrItems.slice(0, 5),
    };
  }
}
