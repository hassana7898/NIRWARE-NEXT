import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { createProductionBatchSchema } from '@nirware/validation';
import { UserRole } from '@nirware/config';
import { ProductionService } from '../services/production.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const productionRouter = Router();

productionRouter.use(authMiddleware);

productionRouter.get('/', async (req, res, next) => {
  try {
    const batches = await ProductionService.listBatches();
    res.json(createSuccessResponse(batches, req.requestId));
  } catch (err) {
    next(err);
  }
});

productionRouter.get('/:id', async (req, res, next) => {
  try {
    const batch = await ProductionService.getBatchById(req.params.id);
    res.json(createSuccessResponse(batch, req.requestId));
  } catch (err) {
    next(err);
  }
});

productionRouter.post(
  '/batches',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PRODUCTION_OPERATOR
  ),
  async (req, res, next) => {
    try {
      const data = createProductionBatchSchema.parse(req.body);
      const batch = await ProductionService.executeBatch(data, req.user!);
      res.status(201).json(createSuccessResponse(batch, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);
