import { NotFoundError, ValidationError } from '@nirware/shared';
import { BomCalculator } from '@nirware/domain';
import { query, queryOne, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class ProductService {
  // --- Categories ---
  public static async listCategories() {
    return await query('SELECT * FROM product_categories ORDER BY name ASC');
  }

  public static async createCategory(data: { name: string; code: string; description?: string }) {
    return await queryOne(
      `INSERT INTO product_categories (name, code, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.code, data.description || null]
    );
  }

  // --- Products ---
  public static async listProducts(productType?: string) {
    let sql = `
      SELECT p.*, c.name as "categoryName",
             COALESCE((SELECT SUM(quantity_delta_kg) FROM inventory_ledger WHERE product_id = p.id), 0) as "currentStockKg"
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
    `;
    const params: any[] = [];
    if (productType) {
      sql += ' WHERE p.product_type = $1';
      params.push(productType);
    }
    sql += ' ORDER BY p.name ASC';
    return await query(sql, params);
  }

  public static async getProductById(id: string) {
    const product = await queryOne(
      `SELECT p.*, c.name as "categoryName",
              COALESCE((SELECT SUM(quantity_delta_kg) FROM inventory_ledger WHERE product_id = p.id), 0) as "currentStockKg"
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id]
    );
    if (!product) throw new NotFoundError('محصول', id);
    return product;
  }

  public static async createProduct(
    data: {
      categoryId: string;
      name: string;
      code: string;
      unit: string;
      productType: string;
      minStockLevelKg: number;
    },
    actor: AuthenticatedUser
  ) {
    const product = await queryOne(
      `INSERT INTO products (category_id, name, code, unit, product_type, min_stock_level_kg)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.categoryId, data.name, data.code, data.unit, data.productType, data.minStockLevelKg]
    );

    await AuditService.log({
      userId: actor.id,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      details: data,
    });

    return product;
  }

  // --- Formulas (BOM) ---
  public static async listFormulas() {
    const formulas = await query(
      `SELECT f.*, p.name as "productName"
       FROM formulas f
       JOIN products p ON p.id = f.product_id
       ORDER BY f.created_at DESC`
    );

    // Attach items
    for (const f of formulas) {
      f.items = await query(
        `SELECT fi.*, p.name as "rawMaterialProductName"
         FROM formula_items fi
         JOIN products p ON p.id = fi.raw_material_product_id
         WHERE fi.formula_id = $1`,
        [f.id]
      );
    }

    return formulas;
  }

  public static async getFormulaById(id: string) {
    const formula = await queryOne(
      `SELECT f.*, p.name as "productName"
       FROM formulas f
       JOIN products p ON p.id = f.product_id
       WHERE f.id = $1`,
      [id]
    );
    if (!formula) throw new NotFoundError('فرمولاسیون', id);

    formula.items = await query(
      `SELECT fi.*, p.name as "rawMaterialProductName"
       FROM formula_items fi
       JOIN products p ON p.id = fi.raw_material_product_id
       WHERE fi.formula_id = $1`,
      [id]
    );

    return formula;
  }

  public static async createFormula(
    data: {
      productId: string;
      code: string;
      version?: string;
      batchSizeKg?: number;
      notes?: string;
      items: {
        rawMaterialProductId: string;
        quantityKg: number;
        percentage: number;
        tolerancePercentage?: number;
      }[];
    },
    actor: AuthenticatedUser
  ) {
    // Validate BOM composition totals 1000 kg or batch size
    BomCalculator.validateFormulaComposition(data.items, data.batchSizeKg || 1000);

    return await transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO formulas (product_id, code, version, batch_size_kg, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.productId,
          data.code,
          data.version || '1.0',
          data.batchSizeKg || 1000,
          data.notes || null,
        ]
      );
      const formula = res.rows[0];

      for (const item of data.items) {
        await client.query(
          `INSERT INTO formula_items (formula_id, raw_material_product_id, quantity_kg, percentage, tolerance_percentage)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            formula.id,
            item.rawMaterialProductId,
            item.quantityKg,
            item.percentage,
            item.tolerancePercentage || 0.5,
          ]
        );
      }

      await AuditService.logTransactional(client, {
        userId: actor.id,
        action: 'CREATE',
        entityType: 'Formula',
        entityId: formula.id,
        details: { code: data.code, itemsCount: data.items.length },
      });

      return formula;
    });
  }
}
