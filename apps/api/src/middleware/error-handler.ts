import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, createErrorResponse } from '@nirware/shared';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const reqId = req.requestId || 'req-unknown';

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json(
      createErrorResponse('خطای اعتبارسنجی ورودی‌ها', 'VALIDATION_ERROR', reqId, details)
    );
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorResponse(err.message, err.code, reqId, err.details)
    );
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json(
    createErrorResponse('خطای داخلی سرور رخ داده است', 'INTERNAL_SERVER_ERROR', reqId)
  );
}
