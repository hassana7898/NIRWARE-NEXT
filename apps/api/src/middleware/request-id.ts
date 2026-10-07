import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req-${randomUUID()}`;
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
