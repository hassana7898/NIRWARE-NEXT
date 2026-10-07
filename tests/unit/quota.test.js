import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QuotaStatus } from '../../packages/config/dist/index.js';
import { QuotaCalculator } from '../../packages/domain/dist/index.js';
import { ValidationError } from '../../packages/shared/dist/index.js';

describe('Domain - Feed Quota Calculator', () => {
  const activeQuota = {
    id: 'q-1',
    farmerId: 'f-1',
    flockId: 'fl-1',
    approvedQuantityKg: 50000,
    usedQuantityKg: 10000,
    status: QuotaStatus.ACTIVE,
    periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Ends in 30 days
  };

  test('Calculates remaining quota correctly', () => {
    const remaining = QuotaCalculator.calculateRemaining(activeQuota);
    assert.equal(remaining, 40000);
  });

  test('Allows order within available quota', () => {
    assert.doesNotThrow(() => {
      QuotaCalculator.validateOrderAgainstQuota(activeQuota, 25000);
    });
  });

  test('Rejects order exceeding available quota', () => {
    assert.throws(
      () => {
        QuotaCalculator.validateOrderAgainstQuota(activeQuota, 45000); // Exceeds 40,000 remaining!
      },
      (err) => err instanceof ValidationError
    );
  });

  test('Updates status to EXHAUSTED when quota is fully used', () => {
    const status = QuotaCalculator.computeStatusAfterUsage(50000, 50000);
    assert.equal(status, QuotaStatus.EXHAUSTED);
  });
});
