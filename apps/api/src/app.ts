import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { requestIdMiddleware } from './middleware/request-id.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { farmersRouter } from './routes/farmers.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { productionRouter } from './routes/production.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { logisticsRouter } from './routes/logistics.routes.js';
import { inboundRouter } from './routes/inbound.routes.js';
import { outboundRouter } from './routes/outbound.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { excelRouter } from './routes/excel.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { healthRouter, auditRouter } from './routes/health.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { NotFoundError } from '@nirware/shared';

dotenv.config();

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. Strict Explicit CORS
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps / curl / server-to-server (origin undefined)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error('درخواست به دلیل محدودیت CORS مسدود گردید'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    })
  );

  // 3. Rate Limiter
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'تعداد درخواست‌ها بیش از حد مجاز است', code: 'RATE_LIMIT_EXCEEDED' } },
  });
  app.use(limiter);

  // 4. Request Parsers & Context
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);
  app.use(idempotencyMiddleware());

  // 5. REST API v1 Routes
  const prefix = process.env.API_PREFIX || '/api/v1';

  app.use(`${prefix}/health`, healthRouter);
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/farmers`, farmersRouter);
  app.use(`${prefix}/products`, productsRouter);
  app.use(`${prefix}/orders`, ordersRouter);
  app.use(`${prefix}/production`, productionRouter);
  app.use(`${prefix}/inventory`, inventoryRouter);
  app.use(`${prefix}/logistics`, logisticsRouter);
  app.use(`${prefix}/inbound`, inboundRouter);
  app.use(`${prefix}/outbound`, outboundRouter);
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/excel`, excelRouter);
  app.use(`${prefix}/ai`, aiRouter);
  app.use(`${prefix}/audit`, auditRouter);
  app.use(`${prefix}/settings`, settingsRouter);

  // 6. 404 Catch-All
  app.use((req, res, next) => {
    next(new NotFoundError('مسیر API درخواستی', req.originalUrl));
  });

  // 7. Global Error Handler
  app.use(errorHandler);

  return app;
}
