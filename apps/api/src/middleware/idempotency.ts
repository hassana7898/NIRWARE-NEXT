import { Request, Response, NextFunction } from 'express';
import { hashToken } from '@nirware/shared';
import { queryOne, query } from '../db/connection.js';

export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string;
    if (!key || req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    const userId = req.user ? req.user.id : null;
    const requestHash = hashToken(
      `${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}`
    );

    try {
      // 1. Atomic Reservation in PostgreSQL
      const reservation = await queryOne<{
        id: string;
        status: string;
      }>(
        `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, locked_at, expires_at)
         VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO NOTHING
         RETURNING id, status`,
        [key, userId, req.originalUrl, requestHash]
      );

      // 2. If reservation succeeded, current request holds the exclusive lock
      if (reservation) {
        let isFinalized = false;
        const originalJson = res.json.bind(res);

        res.json = (body: any): Response => {
          if (!isFinalized) {
            isFinalized = true;
            if (res.statusCode >= 200 && res.statusCode < 500) {
              query(
                `UPDATE idempotency_keys
                 SET status = 'COMPLETED',
                     response_status = $1,
                     response_body = $2,
                     locked_at = NOW()
                 WHERE key = $3`,
                [res.statusCode, JSON.stringify(body), key]
              ).catch((err) => {
                console.error('[Idempotency Finalization Error]', err);
              });
            } else {
              // Failed response (5xx)
              query(
                `UPDATE idempotency_keys SET status = 'FAILED' WHERE key = $1`,
                [key]
              ).catch(() => {});
            }
          }
          return originalJson(body);
        };

        return next();
      }

      // 3. Conflict occurred: Key already exists. Check status
      const existing = await queryOne<{
        status: string;
        request_hash: string;
        response_status: number;
        response_body: any;
        locked_at: string;
      }>(
        `SELECT status, request_hash, response_status, response_body, locked_at
         FROM idempotency_keys
         WHERE key = $1`,
        [key]
      );

      if (!existing) {
        return next();
      }

      if (existing.status === 'COMPLETED') {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existing.response_status).json(existing.response_body);
        return;
      }

      if (existing.status === 'PENDING') {
        const lockAgeMs = Date.now() - new Date(existing.locked_at).getTime();
        // If lock is active within 30 seconds, block duplicate concurrent execution
        if (lockAgeMs < 30000) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONCURRENT_IDEMPOTENT_OPERATION',
              message: 'عملیات دیگری با این کلید یکتا هم‌اکنون در حال پردازش است. لطفاً منتظر بمانید.',
            },
          });
          return;
        }

        // Stale lock takeover if worker died mid-flight
        await query(
          `UPDATE idempotency_keys SET locked_at = NOW() WHERE key = $1`,
          [key]
        );
        return next();
      }

      // If previous attempt FAILED, allow fresh retry
      if (existing.status === 'FAILED') {
        await query(
          `UPDATE idempotency_keys SET status = 'PENDING', locked_at = NOW() WHERE key = $1`,
          [key]
        );
        return next();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
