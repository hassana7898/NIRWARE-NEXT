import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from '../../apps/api/dist/services/report.service.js';
import { query, pool } from '../../apps/api/dist/db/connection.js';

describe('Reports & Analytics - Exact SQL-Based Date Range & Distribution Integrity', () => {
  const formulaId1 = '30000000-0000-0000-0000-000000000001'; // Grower formula
  const rawMaterialId = '20000000-0000-0000-0000-000000000001'; // Brazilian Corn

  before(async () => {
    // Clean any prior date-range test rows
    await query(`DELETE FROM production_batches WHERE batch_number LIKE 'DATE-RANGE-%'`);
    await query(`DELETE FROM inbound_remittances WHERE remittance_number LIKE 'DATE-RANGE-%'`);
    await query(`DELETE FROM flocks WHERE flock_code LIKE 'DATE-RANGE-%'`);

    // Insert Controlled Test Records for June 2026 (Inside Range)
    // 1. Production Batch: 5,000 kg on 2026-06-10
    await query(
      `INSERT INTO production_batches (
         batch_number, formula_id, target_quantity_kg, actual_produced_quantity_kg,
         status, created_at, completed_at
       ) VALUES ($1, $2, 5000, 5000, 'COMPLETED', '2026-06-10 10:00:00+00', '2026-06-10 12:00:00+00')`,
      ['DATE-RANGE-BATCH-JUN1', formulaId1]
    );

    // 2. Production Batch: 3,000 kg on 2026-06-20
    await query(
      `INSERT INTO production_batches (
         batch_number, formula_id, target_quantity_kg, actual_produced_quantity_kg,
         status, created_at, completed_at
       ) VALUES ($1, $2, 3000, 3000, 'COMPLETED', '2026-06-20 10:00:00+00', '2026-06-20 12:00:00+00')`,
      ['DATE-RANGE-BATCH-JUN2', formulaId1]
    );

    // 3. Inbound Remittance: invoice 10,000 kg, shortage 100 kg, wastage 50 kg on 2026-06-15
    // Wastage rate = (150 / 10,000) * 100 = 1.50%
    await query(
      `INSERT INTO inbound_remittances (
         remittance_number, seller_name, raw_material_product_id, bill_number,
         origin_location, invoice_weight_kg, scale_weight_kg, shortage_kg, wastage_kg,
         driver_name, driver_phone, status, received_at
       ) VALUES (
         $1, 'تأمین‌کننده غلات شمال', $2, 'BL-JUN-01',
         'بندر امیرآباد', 10000, 9850, 100, 50,
         'راننده خرداد', '09121110001', 'CONFIRMED', '2026-06-15 14:00:00+00'
       )`,
      ['DATE-RANGE-INB-JUN', rawMaterialId]
    );

    // 4. Flock: FCR = 1.62 on 2026-06-05
    const houseRes = await query(`SELECT id FROM poultry_houses LIMIT 1`);
    const houseId = houseRes[0].id;
    await query(
      `INSERT INTO flocks (
         poultry_house_id, flock_code, breed, chick_count, start_date, conversion_ratio, status
       ) VALUES ($1, $2, 'Cobb 500', 10000, '2026-06-05', 1.62, 'ACTIVE')`,
      [houseId, 'DATE-RANGE-FLOCK-JUN']
    );

    // Insert Controlled Test Records for July 2026 (Outside Range)
    // 5. Production Batch: 12,000 kg on 2026-07-15
    await query(
      `INSERT INTO production_batches (
         batch_number, formula_id, target_quantity_kg, actual_produced_quantity_kg,
         status, created_at, completed_at
       ) VALUES ($1, $2, 12000, 12000, 'COMPLETED', '2026-07-15 10:00:00+00', '2026-07-15 12:00:00+00')`,
      ['DATE-RANGE-BATCH-JUL', formulaId1]
    );

    // 6. Inbound Remittance: invoice 20,000 kg, shortage 600 kg, wastage 200 kg on 2026-07-20
    // Wastage rate = (800 / 20,000) * 100 = 4.00%
    await query(
      `INSERT INTO inbound_remittances (
         remittance_number, seller_name, raw_material_product_id, bill_number,
         origin_location, invoice_weight_kg, scale_weight_kg, shortage_kg, wastage_kg,
         driver_name, driver_phone, status, received_at
       ) VALUES (
         $1, 'تأمین‌کننده غلات جنوب', $2, 'BL-JUL-01',
         'بندر امام', 20000, 19200, 600, 200,
         'راننده تیر', '09121110002', 'CONFIRMED', '2026-07-20 14:00:00+00'
       )`,
      ['DATE-RANGE-INB-JUL', rawMaterialId]
    );

    // 7. Flock: FCR = 1.85 on 2026-07-10
    await query(
      `INSERT INTO flocks (
         poultry_house_id, flock_code, breed, chick_count, start_date, conversion_ratio, status
       ) VALUES ($1, $2, 'Ross 308', 15000, '2026-07-10', 1.85, 'ACTIVE')`,
      [houseId, 'DATE-RANGE-FLOCK-JUL']
    );
  });

  test('Case 1: Data INSIDE Range (June 2026 only)', async () => {
    const juneSummary = await ReportService.getFactorySummary('2026-06-01', '2026-06-30 23:59:59');

    // Production: only June batches (5,000 + 3,000 = 8,000 kg)
    assert.equal(juneSummary.monthlyProducedKg, 8000, 'June production must exactly equal 8,000 kg');

    // Wastage: only June remittance (150 / 10,000 * 100 = 1.5%)
    assert.equal(juneSummary.wastageRate, 1.5, 'June inbound wastage rate must be exactly 1.50%');

    // FCR: June flock FCR is 1.62
    assert.equal(juneSummary.averageFcr, 1.62, 'June average FCR must be exactly 1.62');

    // Product Distribution: 100% of June production is Grower
    assert.ok(juneSummary.productDistribution.length >= 1);
    const totalPercentage = juneSummary.productDistribution.reduce((acc, p) => acc + p.percentage, 0);
    assert.ok(
      Math.abs(totalPercentage - 100.0) < 0.5,
      `Sum of distribution percentages inside range must equal 100% (got ${totalPercentage}%)`
    );
  });

  test('Case 2: Data OUTSIDE Range (July records must NOT pollute June query)', async () => {
    const juneSummary = await ReportService.getFactorySummary('2026-06-01', '2026-06-30 23:59:59');
    // Ensure the 12,000 kg from July is NOT in June
    assert.notEqual(juneSummary.monthlyProducedKg, 20000);
    assert.equal(juneSummary.monthlyProducedKg, 8000);
  });

  test('Case 3: MIXED Data across multiple months (June + July combined)', async () => {
    const combinedSummary = await ReportService.getFactorySummary('2026-06-01', '2026-07-31 23:59:59');

    // Production: 8,000 (June) + 12,000 (July) = 20,000 kg
    assert.equal(combinedSummary.monthlyProducedKg, 20000, 'Combined production must equal 20,000 kg');

    // Wastage: (150 + 800) / (10,000 + 20,000) * 100 = 950 / 30,000 * 100 = 3.17%
    assert.equal(combinedSummary.wastageRate, 3.17, 'Combined wastage rate must be exactly 3.17%');

    // FCR: average of 1.62 and 1.85 = (1.62 + 1.85) / 2 = 1.735 -> rounded 1.74
    assert.equal(combinedSummary.averageFcr, 1.74, 'Combined average FCR must be exactly 1.74');
  });

  test('Case 4: EMPTY Range with zero records', async () => {
    const emptySummary = await ReportService.getFactorySummary('2018-01-01', '2018-01-31');
    assert.equal(emptySummary.monthlyProducedKg, 0);
    assert.equal(emptySummary.monthlyDeliveredServices, 0);
    assert.equal(emptySummary.averageFcr, 0);
    assert.equal(emptySummary.wastageRate, 0);
    assert.equal(emptySummary.productDistribution.length, 0);
  });

  after(async () => {
    // Clean up test rows
    await query(`DELETE FROM production_batches WHERE batch_number LIKE 'DATE-RANGE-%'`);
    await query(`DELETE FROM inbound_remittances WHERE remittance_number LIKE 'DATE-RANGE-%'`);
    await query(`DELETE FROM flocks WHERE flock_code LIKE 'DATE-RANGE-%'`);
    await pool.end();
  });
});
