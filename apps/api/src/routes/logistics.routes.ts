import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import {
  assignDriverToDeliverySchema,
  confirmDeliveryReceiptSchema,
} from '@nirware/validation';
import { DeliveryStatus, UserRole } from '@nirware/config';
import { LogisticsService } from '../services/logistics.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const logisticsRouter = Router();

logisticsRouter.use(authMiddleware);

logisticsRouter.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await LogisticsService.listDrivers();
    res.json(createSuccessResponse(drivers, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.get('/vehicles', async (req, res, next) => {
  try {
    const vehicles = await LogisticsService.listVehicles();
    res.json(createSuccessResponse(vehicles, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.get('/deliveries', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const deliveries = await LogisticsService.listDeliveries(req.user!, status);
    res.json(createSuccessResponse(deliveries, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.get('/deliveries/:id', async (req, res, next) => {
  try {
    const delivery = await LogisticsService.getDeliveryById(req.params.id, req.user!);
    res.json(createSuccessResponse(delivery, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.post(
  '/assign',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const data = assignDriverToDeliverySchema.parse(req.body);
      const delivery = await LogisticsService.assignDriver(data, req.user!);
      res.status(201).json(createSuccessResponse(delivery, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);

logisticsRouter.post('/deliveries/:id/status', async (req, res, next) => {
  try {
    const targetStatus = req.body.status as DeliveryStatus;
    const delivery = await LogisticsService.updateDeliveryStatus(
      req.params.id,
      targetStatus,
      req.user!
    );
    res.json(createSuccessResponse(delivery, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.post('/deliveries/:id/otp', async (req, res, next) => {
  try {
    const result = await LogisticsService.generateDeliveryOtp(req.params.id, req.user!);
    res.json(createSuccessResponse(result, req.requestId));
  } catch (err) {
    next(err);
  }
});

logisticsRouter.post('/deliveries/:id/confirm', async (req, res, next) => {
  try {
    const data = confirmDeliveryReceiptSchema.parse({
      deliveryId: req.params.id,
      signatureData: req.body.signatureData,
      photoData: req.body.photoData,
      otpCode: req.body.otpCode,
      notes: req.body.notes,
    });
    const result = await LogisticsService.confirmDeliveryReceipt(data, req.user!);
    res.json(createSuccessResponse(result, req.requestId));
  } catch (err) {
    next(err);
  }
});
