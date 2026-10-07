/**
 * Bill of Materials (BOM) & Production Formula Calculations
 */

import { SYSTEM_CONSTANTS } from '@nirware/config';
import { ValidationError, InventoryShortageError } from '@nirware/shared';

export interface FormulaItemDef {
  rawMaterialProductId: string;
  rawMaterialProductName?: string;
  quantityKg: number; // Quantity per base batch (typically 1000 kg)
  percentage: number;
}

export interface FormulaDef {
  id: string;
  code: string;
  productId: string;
  batchSizeKg: number; // Usually 1000 kg
  isActive: boolean;
  items: FormulaItemDef[];
}

export interface MaterialRequirement {
  rawMaterialProductId: string;
  rawMaterialProductName: string;
  requiredQuantityKg: number;
  availableStockKg: number;
}

export class BomCalculator {
  /**
   * Validates formula item totals sum to 100% or base batch size
   */
  public static validateFormulaComposition(
    items: FormulaItemDef[],
    batchSizeKg: number = SYSTEM_CONSTANTS.BASE_FORMULA_BATCH_SIZE_KG
  ): void {
    if (!items || items.length === 0) {
      throw new ValidationError('فرمولاسیون تولید باید حداقل شامل یک ماده اولیه باشد');
    }

    const totalKg = items.reduce((sum, item) => sum + item.quantityKg, 0);
    const diff = Math.abs(totalKg - batchSizeKg);

    // Tolerance of 0.1% (e.g. 1 kg in 1000 kg)
    if (diff > batchSizeKg * 0.001) {
      throw new ValidationError(
        `مجموع وزن اقلام فرمولاسیون (${totalKg} کیلوگرم) با وزن مبنای تولید (${batchSizeKg} کیلوگرم) مطابقت ندارد`
      );
    }
  }

  /**
   * Calculates required raw material quantities for a given target production quantity
   */
  public static calculateRequiredMaterials(
    formula: FormulaDef,
    targetProductionKg: number
  ): { rawMaterialProductId: string; quantityKg: number }[] {
    if (targetProductionKg <= 0) {
      throw new ValidationError('تناژ تولید باید عددی مثبت و بزرگتر از صفر باشد');
    }

    const ratio = targetProductionKg / formula.batchSizeKg;

    return formula.items.map((item) => ({
      rawMaterialProductId: item.rawMaterialProductId,
      quantityKg: Math.round(item.quantityKg * ratio * 100) / 100,
    }));
  }

  /**
   * Checks inventory stocks against required materials.
   * Throws InventoryShortageError if any ingredient is insufficient.
   */
  public static checkInventoryAvailability(
    requirements: MaterialRequirement[]
  ): void {
    for (const req of requirements) {
      if (req.availableStockKg < req.requiredQuantityKg) {
        throw new InventoryShortageError(
          req.rawMaterialProductId,
          req.rawMaterialProductName,
          req.requiredQuantityKg,
          req.availableStockKg
        );
      }
    }
  }
}
