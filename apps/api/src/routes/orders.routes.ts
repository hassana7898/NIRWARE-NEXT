import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { createFeedOrderSchema, transitionOrderSchema } from '@nirware/validation';
import { OrderService } from '../services/order.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const ordersRouter = Router();

ordersRouter.use(authMiddleware);

ordersRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const orders = await OrderService.listOrders(req.user!, status);
    res.json(createSuccessResponse(orders, req.requestId));
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await OrderService.getOrderById(req.params.id, req.user!);
    res.json(createSuccessResponse(order, req.requestId));
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/', async (req, res, next) => {
  try {
    const data = createFeedOrderSchema.parse(req.body);
    const order = await OrderService.createOrder(data, req.user!);
    res.status(201).json(createSuccessResponse(order, req.requestId));
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/:id/transition', async (req, res, next) => {
  try {
    const data = transitionOrderSchema.parse(req.body);
    const order = await OrderService.transitionOrder(
      req.params.id,
      {
        action: data.action,
        targetState: data.targetState,
        approvedQuantityKg: data.approvedQuantityKg,
        rejectionReason: data.rejectionReason,
        notes: data.notes,
      },
      req.user!
    );
    res.json(createSuccessResponse(order, req.requestId));
  } catch (err) {
    next(err);
  }
});
