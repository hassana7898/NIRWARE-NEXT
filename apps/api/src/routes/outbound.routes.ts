import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { OutboundService } from '../services/outbound.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const outboundRouter = Router();

outboundRouter.use(authMiddleware);

outboundRouter.get('/', async (req, res, next) => {
  try {
    const list = await OutboundService.listOutbound();
    res.json(createSuccessResponse(list, req.requestId));
  } catch (err) {
    next(err);
  }
});
