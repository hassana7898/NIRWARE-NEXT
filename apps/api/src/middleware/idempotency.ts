import { Request, Response, NextFunction } from 'express';
import { queryOne, query } from '../db/connection.js';

export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string;
    if (!key || req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    try {
      const existing = await queryOne<{
        response_status: number;
        response_body: any;
      }>(
        `SELECT response_status, response_body
         FROM idempotency_keys
         WHERE key = $1 AND expires_at > NOW()`,
        [key]
      );

      if (existing) {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existing.response_status).json(existing.response_body);
        return;
      }

      // Intercept res.json to store the response
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // Only save successful or validated responses (don't save 500 crashes)
        if (res.statusCode >= 200 && res.statusCode < 500) {
          const userId = req.user ? req.user.id : null;
          query(
            `INSERT INTO idempotency_keys (key, user_id, endpoint, response_status, response_body, expires_at)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
             ON CONFLICT (key) DO NOTHING`,
            [key, userId, req.originalUrl, res.statusCode, JSON.stringify(body)]
          ).catch((err) => {
            console.error('[Idempotency Error]', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
