import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { createInboundRemittanceSchema } from '@nirware/validation';
import { UserRole } from '@nirware/config';
import { InboundService } from '../services/inbound.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const inboundRouter = Router();

inboundRouter.use(authMiddleware);

inboundRouter.get('/', async (req, res, next) => {
  try {
    const list = await InboundService.listInbound();
    res.json(createSuccessResponse(list, req.requestId));
  } catch (err) {
    next(err);
  }
});

inboundRouter.post(
  '/',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SCALE_OPERATOR
  ),
  async (req, res, next) => {
    try {
      const data = createInboundRemittanceSchema.parse(req.body);
      const remittance = await InboundService.createInbound(data, req.user!);
      res.status(201).json(createSuccessResponse(remittance, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);
