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
    const canonicalEndpoint = (req.baseUrl + req.path).replace(/\/+$/, '') || '/';
    const requestHash = hashToken(
      `${req.method}:${canonicalEndpoint}:${JSON.stringify(req.body || {})}`
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
        [key, userId, canonicalEndpoint, requestHash]
      );

      // Helper to attach response-interceptor for finalizing idempotency
      const attachFinalizer = () => {
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
      };

      // 2. If reservation succeeded, current request holds the exclusive lock
      if (reservation) {
        attachFinalizer();
        return next();
      }

      // 3. Conflict occurred: Key already exists. Check status and hash
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

      // 4. Enforce Payload Integrity: Same Key with DIFFERENT payload is strictly forbidden
      if (existing.request_hash && existing.request_hash !== requestHash) {
        res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST',
            message: 'کلید یکتای ارائه‌شده قبلاً با درخواست و پارامترهای متفاوتی استفاده شده است.',
          },
        });
        return;
      }

      // 5. If COMPLETED, return cached response with replay header
      if (existing.status === 'COMPLETED') {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existing.response_status).json(existing.response_body);
        return;
      }

      // 6. If PENDING, check lock age for active vs stale
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

        // Stale lock takeover via Compare-And-Swap (CAS)
        const takeover = await queryOne<{ id: string }>(
          `UPDATE idempotency_keys
           SET locked_at = NOW(),
               status = 'PENDING',
               request_hash = $2
           WHERE key = $1
             AND status = 'PENDING'
             AND locked_at < NOW() - INTERVAL '30 seconds'
           RETURNING id`,
          [key, requestHash]
        );

        if (!takeover) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONCURRENT_IDEMPOTENT_OPERATION',
              message: 'عملیات دیگری با این کلید یکتا هم‌اکنون در حال پردازش است. لطفاً منتظر بمانید.',
            },
          });
          return;
        }

        attachFinalizer();
        return next();
      }

      // 7. If previous attempt FAILED, allow fresh retry via CAS takeover
      if (existing.status === 'FAILED') {
        const retryTakeover = await queryOne<{ id: string }>(
          `UPDATE idempotency_keys
           SET status = 'PENDING',
               locked_at = NOW(),
               request_hash = $2
           WHERE key = $1
             AND status = 'FAILED'
           RETURNING id`,
          [key, requestHash]
        );

        if (!retryTakeover) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONCURRENT_IDEMPOTENT_OPERATION',
              message: 'عملیات دیگری هم‌اکنون این کلید را مجدداً رزرو کرده است.',
            },
          });
          return;
        }

        attachFinalizer();
        return next();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
