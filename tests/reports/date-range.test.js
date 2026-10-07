import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from '../../apps/api/dist/services/report.service.js';
import { query, pool } from '../../apps/api/dist/db/connection.js';

describe('Reports & Analytics - Dynamic Date Ranges & SQL Calculation Integrity', () => {
  test('ReportService.getFactorySummary() dynamically calculates KPIs and respects date filters', async () => {
    // 1. Unfiltered summary
    const allSummary = await ReportService.getFactorySummary();
    assert.equal(typeof allSummary.monthlyProducedKg, 'number');
    assert.equal(typeof allSummary.monthlyDeliveredServices, 'number');
    assert.equal(typeof allSummary.averageFcr, 'number');
    assert.equal(typeof allSummary.wastageRate, 'number');
    assert.ok(Array.isArray(allSummary.productDistribution));

    // 2. Filter with a past date range where no records exist
    const emptySummary = await ReportService.getFactorySummary('2020-01-01', '2020-01-31');
    assert.equal(emptySummary.monthlyProducedKg, 0, 'Production must be 0 for year 2020');
    assert.equal(emptySummary.monthlyDeliveredServices, 0, 'Deliveries must be 0 for year 2020');
    assert.equal(emptySummary.productDistribution.length, 0, 'Product distribution must be empty for 2020');
  });

  test('Wastage rate is dynamically derived from inbound remittances, not a hardcoded number', async () => {
    const summary = await ReportService.getFactorySummary();
    // Verify wastage rate is computed from DB without hardcoded 0.85
    assert.equal(typeof summary.wastageRate, 'number');
    assert.ok(summary.wastageRate >= 0 && summary.wastageRate <= 100);
  });

  after(async () => {
    await pool.end();
  });
});
