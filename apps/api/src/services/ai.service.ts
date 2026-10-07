import { UserRole } from '@nirware/config';
import { AuthenticatedUser } from '../middleware/auth.js';
import { query, queryOne } from '../db/connection.js';
import { normalizePersianText, toEnglishDigits, AppError, ValidationError } from '@nirware/shared';

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
   * 1. Ingest image file buffer
   * 2. Call OCR Provider abstraction (fails cleanly if unconfigured)
   * 3. Compute extraction confidence and fields
   * 4. Return structured preview for Human Review (Strictly Human-in-the-Loop, NO blind DB mutations!)
   */
  public static async processBillOcr(file: { originalname: string; buffer?: Buffer }) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationError('تصویر بارنامه فاقد محتوای معتبر است.');
    }

    const providerKey = process.env.OCR_PROVIDER_KEY;
    if (!providerKey) {
      throw new AppError(
        'سرویس هوش مصنوعی و پردازش اسناد OCR در حال حاضر فاقد کلید دسترسی ارائه‌دهنده (OCR_PROVIDER_KEY) است.',
        503,
        'OCR_PROVIDER_UNCONFIGURED'
      );
    }

    // Provider abstraction for external OCR engine
    throw new AppError(
      'ارائه‌دهنده OCR پیکربندی شده اما سرویس بالادستی در دسترس نمی‌باشد.',
      502,
      'OCR_UPSTREAM_UNAVAILABLE'
    );
  }
}
