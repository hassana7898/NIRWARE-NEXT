import * as XLSX from 'xlsx';
import { query, transaction } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { normalizePersianText, ValidationError } from '@nirware/shared';

export class ExcelService {
  /**
   * Exports an entity collection to Excel buffer
   */
  public static async exportEntity(entityName: 'products' | 'orders' | 'inventory' | 'flocks') {
    let rows: any[] = [];
    let sheetName = 'Sheet1';

    if (entityName === 'products') {
      sheetName = 'محصولات';
      rows = await query(`
        SELECT p.code as "کد محصول", p.name as "نام محصول", p.unit as "واحد",
               p.product_type as "نوع محصول", p.min_stock_level_kg as "حداقل موجودی (کیلوگرم)",
               COALESCE(SUM(l.quantity_delta_kg), 0) as "موجودی فعلی (کیلوگرم)"
        FROM products p
        LEFT JOIN inventory_ledger l ON l.product_id = p.id
        GROUP BY p.id, p.code, p.name, p.unit, p.product_type, p.min_stock_level_kg
        ORDER BY p.name ASC
      `);
    } else if (entityName === 'orders') {
      sheetName = 'سفارش‌ها';
      rows = await query(`
        SELECT fo.order_number as "شماره سفارش", f.full_name as "نام مرغدار",
               fl.flock_code as "کد گله", p.name as "محصول",
               fo.requested_quantity_kg as "مقدار درخواستی (کیلوگرم)",
               fo.approved_quantity_kg as "مقدار مصوب (کیلوگرم)",
               fo.status as "وضعیت", fo.delivery_date_needed as "تاریخ تحویل مورد نیاز"
        FROM feed_orders fo
        JOIN farmers f ON f.id = fo.farmer_id
        JOIN flocks fl ON fl.id = fo.flock_id
        JOIN products p ON p.id = fo.product_id
        ORDER BY fo.created_at DESC
      `);
    } else if (entityName === 'inventory') {
      sheetName = 'دفتر کل انبار';
      rows = await query(`
        SELECT l.created_at as "تاریخ و ساعت", p.name as "نام محصول",
               l.transaction_type as "نوع تراکنش", l.quantity_delta_kg as "تغییر موجودی (کیلوگرم)",
               l.running_balance_kg as "موجودی پس از تراکنش", l.notes as "توضیحات"
        FROM inventory_ledger l
        JOIN products p ON p.id = l.product_id
        ORDER BY l.created_at DESC
        LIMIT 500
      `);
    } else if (entityName === 'flocks') {
      sheetName = 'اطلاعات گله‌ها';
      rows = await query(`
        SELECT fl.flock_code as "کد گله", fl.breed as "نژاد", fl.chick_count as "تعداد جوجه",
               fl.feed_consumed_kg as "دان مصرفی (کیلوگرم)", fl.mortality_count as "تلفات",
               fl.final_weight_grams as "میانگین وزن نهایی (گرم)", fl.start_date as "تاریخ شروع"
        FROM flocks fl
        ORDER BY fl.start_date DESC
      `);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Parses and validates uploaded Excel for preview before committing
   */
  public static previewProductImport(fileBuffer: Buffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawRows || rawRows.length === 0) {
      throw new ValidationError('فایل اکسل خالی است یا فرمت ستون‌ها شناسایی نشد');
    }

    const previewList = rawRows.map((r, index) => {
      const code = String(r['کد محصول'] || r['code'] || '').trim();
      const name = normalizePersianText(String(r['نام محصول'] || r['name'] || '').trim());
      const type = String(r['نوع محصول'] || r['type'] || 'RAW_MATERIAL').trim();
      const unit = String(r['واحد'] || r['unit'] || 'KG').trim();

      const errors: string[] = [];
      if (!code) errors.push('کد محصول الزامی است');
      if (!name) errors.push('نام محصول الزامی است');

      return {
        rowNumber: index + 2,
        code,
        name,
        type,
        unit,
        isValid: errors.length === 0,
        errors,
      };
    });

    return {
      totalRows: previewList.length,
      validRowsCount: previewList.filter((r) => r.isValid).length,
      invalidRowsCount: previewList.filter((r) => !r.isValid).length,
      rows: previewList,
    };
  }
}
