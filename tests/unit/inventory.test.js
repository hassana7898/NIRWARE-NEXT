import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryTransactionType } from '../../packages/config/dist/index.js';
import { InventoryLedgerDomain } from '../../packages/domain/dist/index.js';
import { ValidationError } from '../../packages/shared/dist/index.js';

describe('Domain - Inventory Ledger Logic', () => {
  test('Credits balance on INBOUND and PRODUCTION_IN', () => {
    const inbound = InventoryLedgerDomain.calculateNextBalance(
      10000,
      InventoryTransactionType.INBOUND,
      5000
    );
    assert.equal(inbound.deltaKg, 5000);
    assert.equal(inbound.newBalanceKg, 15000);

    const prod = InventoryLedgerDomain.calculateNextBalance(
      15000,
      InventoryTransactionType.PRODUCTION_IN,
      2000
    );
    assert.equal(prod.newBalanceKg, 17000);
  });

  test('Debits balance on OUTBOUND and CONSUMPTION_OUT', () => {
    const out = InventoryLedgerDomain.calculateNextBalance(
      17000,
      InventoryTransactionType.OUTBOUND,
      4000
    );
    assert.equal(out.deltaKg, -4000);
    assert.equal(out.newBalanceKg, 13000);
  });

  test('Rejects transaction that would result in negative inventory', () => {
    assert.throws(
      () => {
        InventoryLedgerDomain.calculateNextBalance(
          2000,
          InventoryTransactionType.CONSUMPTION_OUT,
          5000 // Cannot consume 5000 from 2000!
        );
      },
      (err) => err instanceof ValidationError
    );
  });

  test('Creates compensating reversal entry correctly', () => {
    const entry = {
      id: 'led-1',
      productId: 'p-1',
      transactionType: InventoryTransactionType.INBOUND,
      quantityDeltaKg: 5000,
      runningBalanceKg: 15000,
      referenceType: 'INBOUND',
      referenceId: 'inb-1',
      createdAt: new Date(),
    };

    const reversal = InventoryLedgerDomain.createReversalEntry(entry, 15000, 'اشتباه در وزن باسکول');
    assert.equal(reversal.reversalDeltaKg, -5000);
    assert.equal(reversal.newBalanceKg, 10000);
  });
});
