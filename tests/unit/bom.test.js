import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BomCalculator } from '../../packages/domain/dist/index.js';
import { ValidationError, InventoryShortageError } from '../../packages/shared/dist/index.js';

describe('Domain - Bill of Materials (BOM) & Formula Calculator', () => {
  const validFormula = {
    id: 'form-1',
    code: 'F-GROWER',
    productId: 'p-finished',
    batchSizeKg: 1000,
    isActive: true,
    items: [
      { rawMaterialProductId: 'rm-corn', quantityKg: 600, percentage: 60 },
      { rawMaterialProductId: 'rm-soy', quantityKg: 350, percentage: 35 },
      { rawMaterialProductId: 'rm-oil', quantityKg: 50, percentage: 5 },
    ],
  };

  test('Validates formula items sum to 1000 kg', () => {
    assert.doesNotThrow(() => {
      BomCalculator.validateFormulaComposition(validFormula.items, 1000);
    });
  });

  test('Rejects formula where sum does not match batch size', () => {
    const invalidItems = [
      { rawMaterialProductId: 'rm-corn', quantityKg: 500, percentage: 50 },
      { rawMaterialProductId: 'rm-soy', quantityKg: 300, percentage: 30 },
      // total = 800 kg instead of 1000 kg
    ];
    assert.throws(
      () => {
        BomCalculator.validateFormulaComposition(invalidItems, 1000);
      },
      (err) => err instanceof ValidationError
    );
  });

  test('Calculates required materials proportionally for 5000 kg production', () => {
    const reqs = BomCalculator.calculateRequiredMaterials(validFormula, 5000);
    assert.equal(reqs.length, 3);
    assert.equal(reqs.find((r) => r.rawMaterialProductId === 'rm-corn')?.quantityKg, 3000); // 600 * 5
    assert.equal(reqs.find((r) => r.rawMaterialProductId === 'rm-soy')?.quantityKg, 1750); // 350 * 5
    assert.equal(reqs.find((r) => r.rawMaterialProductId === 'rm-oil')?.quantityKg, 250); // 50 * 5
  });

  test('Throws InventoryShortageError if any ingredient is short', () => {
    assert.throws(
      () => {
        BomCalculator.checkInventoryAvailability([
          {
            rawMaterialProductId: 'rm-corn',
            rawMaterialProductName: 'ذرت',
            requiredQuantityKg: 3000,
            availableStockKg: 2000, // Shortage!
          },
        ]);
      },
      (err) => err instanceof InventoryShortageError
    );
  });
});
