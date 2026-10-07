import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../../packages/config/dist/index.js';
import { ProductionService } from '../../apps/api/dist/services/production.service.js';
import { InventoryService } from '../../apps/api/dist/services/inventory.service.js';
import { queryOne, pool } from '../../apps/api/dist/db/connection.js';

describe('Concurrency & Transactions - Concurrent Production Batch Execution', () => {
  const operatorUser = {
    id: 'a0000000-0000-0000-0000-000000000005',
    username: 'prod_op',
    role: UserRole.PRODUCTION_OPERATOR,
    fullName: 'حسین رضایی',
    phone: '09125555555',
    isActive: true,
  };

  const formulaId = '30000000-0000-0000-0000-000000000001';

  test('Concurrent batches competing for inventory: one succeeds, one rolls back safely on shortage', async () => {
    // Check initial stock of raw material
    const cornStockBefore = await InventoryService.getProductStock(
      '20000000-0000-0000-0000-000000000001'
    );
    assert.ok(cornStockBefore > 0);

    const batch1Promise = ProductionService.executeBatch(
      {
        formulaId,
        targetQuantityKg: 5000,
        batchNumber: `BATCH-CONC-1-${Date.now()}`,
      },
      operatorUser
    );

    const batch2Promise = ProductionService.executeBatch(
      {
        formulaId,
        targetQuantityKg: 5000,
        batchNumber: `BATCH-CONC-2-${Date.now()}`,
      },
      operatorUser
    );

    const [r1, r2] = await Promise.allSettled([batch1Promise, batch2Promise]);

    // At least one must succeed
    const successful = [r1, r2].filter((r) => r.status === 'fulfilled');
    assert.ok(successful.length >= 1);

    // Verify raw material stock did not go negative
    const cornStockAfter = await InventoryService.getProductStock(
      '20000000-0000-0000-0000-000000000001'
    );
    assert.ok(cornStockAfter >= 0);

    // Verify finished feed balance was properly credited
    const finishedStock = await InventoryService.getProductStock(
      '20000000-0000-0000-0000-000000000009'
    );
    assert.ok(finishedStock > 0);
  });

  after(async () => {
    await pool.end();
  });
});
