/**
 * Standard Application Errors for NIRWARE NEXT
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'خطای اعتبارسنجی داده‌ها', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'احراز هویت انجام نشده است یا نشست منقضی شده است') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'شما دسترسی لازم برای انجام این عملیات را ندارید') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(entity = 'مورد درخواستی', id?: string | number) {
    const msg = id ? `${entity} با شناسه ${id} یافت نشد` : `${entity} یافت نشد`;
    super(msg, 404, 'NOT_FOUND', { entity, id });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'تداخل در عملیات رخ داده است', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ConcurrencyError extends AppError {
  constructor(message = 'عملیات به دلیل تغییرات همزمان ناموفق بود، لطفاً مجدداً تلاش کنید') {
    super(message, 409, 'CONCURRENCY_CONFLICT');
  }
}

export class InventoryShortageError extends AppError {
  constructor(productId: string, productName: string, requested: number, available: number) {
    super(
      `موجودی محصول «${productName}» ناکافی است. مقدار درخواستی: ${requested} کیلوگرم، موجودی فعلی: ${available} کیلوگرم`,
      422,
      'INVENTORY_SHORTAGE',
      { productId, productName, requested, available }
    );
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(currentState: string, targetState: string, reason?: string) {
    const msg = `تغییر وضعیت از ${currentState} به ${targetState} مجاز نمی‌باشد${
      reason ? `: ${reason}` : ''
    }`;
    super(msg, 400, 'INVALID_STATE_TRANSITION', { currentState, targetState, reason });
  }
}
