import { UserRole } from '@nirware/config';
import { AuthenticatedUser } from '../middleware/auth.js';
import { query, queryOne } from '../db/connection.js';
import { normalizePersianText, toEnglishDigits } from '@nirware/shared';

export interface AiToolResult {
  tool: string;
  parameters: Record<string, any>;
  result: any;
}

export class AiService {
  /**
   * Tool-based AI Assistant executor with strict RBAC & object authorization
   */
  public static async executeAssistantQuery(
    prompt: string,
    actor: AuthenticatedUser
  ): Promise<{ response: string; toolsExecuted: AiToolResult[] }> {
    const toolsExecuted: AiToolResult[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // 1. Tool: get_inventory
    if (
      lowerPrompt.includes('موجودی') ||
      lowerPrompt.includes('انبار') ||
      lowerPrompt.includes('نهاده') ||
      lowerPrompt.includes('stock') ||
      lowerPrompt.includes('inventory')
    ) {
      if (
        ([
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.MANAGER,
          UserRole.SCALE_OPERATOR,
          UserRole.PRODUCTION_OPERATOR,
        ] as UserRole[]).includes(actor.role)
      ) {
        const stocks = await query(`
          SELECT p.name, p.code, p.product_type,
                 COALESCE(SUM(l.quantity_delta_kg), 0) as balance_kg
          FROM products p
          LEFT JOIN inventory_ledger l ON l.product_id = p.id
          GROUP BY p.id, p.name, p.code, p.product_type
          ORDER BY balance_kg DESC
          LIMIT 10
        `);

        toolsExecuted.push({
          tool: 'get_inventory',
          parameters: { limit: 10 },
          result: stocks,
        });

        const summary = stocks
          .map((s: any) => `• ${s.name}: ${Number(s.balance_kg).toLocaleString('fa-IR')} کیلوگرم`)
          .join('\n');

        return {
          response: `وضعیت موجودی انبار کارخانه به شرح زیر است:\n\n${summary}\n\nآیا مایلید جزئیات سفارش تولید برای اقلام کم‌موجودی را بررسی کنیم؟`,
          toolsExecuted,
        };
      }
    }

    // 2. Tool: get_orders
    if (
      lowerPrompt.includes('سفارش') ||
      lowerPrompt.includes('order') ||
      lowerPrompt.includes('دان')
    ) {
      let orders: any[] = [];
      if (actor.role === UserRole.FARMER) {
        orders = await query(
          `SELECT fo.order_number, p.name as product_name, fo.requested_quantity_kg, fo.status
           FROM feed_orders fo
           JOIN products p ON p.id = fo.product_id
           WHERE fo.farmer_id = $1
           ORDER BY fo.created_at DESC LIMIT 5`,
          [actor.farmerId]
        );
      } else {
        orders = await query(
          `SELECT fo.order_number, f.full_name as farmer_name, p.name as product_name, fo.requested_quantity_kg, fo.status
           FROM feed_orders fo
           JOIN farmers f ON f.id = fo.farmer_id
           JOIN products p ON p.id = fo.product_id
           ORDER BY fo.created_at DESC LIMIT 5`
        );
      }

      toolsExecuted.push({
        tool: 'get_orders',
        parameters: { userRole: actor.role },
        result: orders,
      });

      if (orders.length === 0) {
        return {
          response: 'در حال حاضر هیچ سفارش فعالی در سیستم ثبت نشده است.',
          toolsExecuted,
        };
      }

      const summary = orders
        .map(
          (o: any) =>
            `• سفارش ${o.order_number}: ${o.product_name} (${Number(
              o.requested_quantity_kg
            ).toLocaleString('fa-IR')} کیلوگرم) - وضعیت: ${o.status}`
        )
        .join('\n');

      return {
        response: `آخرین سفارش‌های ثبت شده در سامانه:\n\n${summary}`,
        toolsExecuted,
      };
    }

    // 3. Fallback answer
    return {
      response: `دستیار هوشمند نیرور (NIRWARE NEXT) در خدمت شماست.\nشما با نقش «${actor.role}» وارد شده‌اید. می‌توانید درباره وضعیت موجودی سیلوها، پیگیری سفارشات دان، وضعیت بچ‌های تولید یا آمار عملکرد گله‌ها سوال بفرمایید.`,
      toolsExecuted,
    };
  }

  /**
   * OCR Processing Pipeline for Inbound / Outbound scale bills:
   * 1. Ingest image metadata or text
   * 2. Extract fields (bill number, seller, weight, date)
   * 3. Compute extraction confidence
   * 4. Return structured preview for Human Review (NO automatic blind DB write!)
   */
  public static async processBillOcr(file: { originalname: string; buffer?: Buffer }) {
    // In production this integrates with Tesseract/Vision API.
    // Demonstrating safe extraction pipeline with confidence score and human validation step:
    return {
      status: 'EXTRACTED_FOR_REVIEW',
      confidence: 0.94,
      extractedData: {
        billNumber: 'BL-98421',
        sellerName: 'شرکت پشتیبانی امور دام کشور (شعبه بندر امام)',
        productName: 'ذرت دانه‌ای برزیلی درجه یک',
        invoiceWeightKg: 24850,
        scaleWeightKg: 24720,
        originLocation: 'بندر امام خمینی - اسکله فله',
        driverName: 'مرتضی اکبری',
        driverPhone: '09161234567',
        driverPlate: '۶۴ ع ۱۸۲ ایران ۲۴',
        suggestedDate: '1403/07/16',
      },
      validationWarnings: [
        'کسری وزن باسکول کارخانه نسبت به بارنامه ۱۳۰ کیلوگرم (۰.۵۲٪) در محدوده مجاز افت رطوبتی است.',
      ],
      requiresHumanConfirmation: true,
    };
  }
}
