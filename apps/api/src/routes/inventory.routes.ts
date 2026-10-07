import { Router } from 'express';
import { createSuccessResponse, ValidationError } from '@nirware/shared';
import { UserRole } from '@nirware/config';
import { InventoryService } from '../services/inventory.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const inventoryRouter = Router();

inventoryRouter.use(authMiddleware);

inventoryRouter.get('/ledger', async (req, res, next) => {
  try {
    const productId = req.query.productId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const ledger = await InventoryService.listLedger(productId, limit);
    res.json(createSuccessResponse(ledger, req.requestId));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/summary', async (req, res, next) => {
  try {
    const summary = await InventoryService.getStockSummary();
    res.json(createSuccessResponse(summary, req.requestId));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post(
  '/ledger/:id/reverse',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const reason = req.body.reason;
      if (!reason) throw new ValidationError('دلیل برگشت تراکنش الزامی است');
      const reversal = await InventoryService.reverseLedgerEntry(req.params.id, reason, req.user!);
      res.json(createSuccessResponse(reversal, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);
