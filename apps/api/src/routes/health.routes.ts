import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { queryOne, query } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@nirware/config';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json(
    createSuccessResponse(
      {
        status: 'UP',
        service: 'NIRWARE-NEXT-API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      req.requestId
    )
  );
});

healthRouter.get('/ready', async (req, res, next) => {
  try {
    const dbTest = await queryOne('SELECT 1 as connected');
    const isDbConnected = dbTest && dbTest.connected === 1;

    res.json(
      createSuccessResponse(
        {
          status: isDbConnected ? 'READY' : 'DEGRADED',
          database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
          timestamp: new Date().toISOString(),
        },
        req.requestId
      )
    );
  } catch (err) {
    next(err);
  }
});

export const auditRouter = Router();
auditRouter.use(authMiddleware);
auditRouter.use(requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER));

auditRouter.get('/', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await query(
      `SELECT al.*, u.username, u.full_name as "userName"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(createSuccessResponse(logs, req.requestId));
  } catch (err) {
    next(err);
  }
});
