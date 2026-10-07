import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import {
  createFarmerSchema,
  createFarmSchema,
  createPoultryHouseSchema,
  createFlockSchema,
  createDailyFlockRecordSchema,
  createFeedQuotaSchema,
} from '@nirware/validation';
import { UserRole } from '@nirware/config';
import { FarmerService } from '../services/farmer.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const farmersRouter = Router();

farmersRouter.use(authMiddleware);

// Farmers
farmersRouter.get('/', async (req, res, next) => {
  try {
    const list = await FarmerService.listFarmers(req.user!);
    res.json(createSuccessResponse(list, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.get('/:id', async (req, res, next) => {
  try {
    const farmer = await FarmerService.getFarmerById(req.params.id, req.user!);
    res.json(createSuccessResponse(farmer, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const data = createFarmerSchema.parse(req.body);
      const farmer = await FarmerService.createFarmer(data, req.user!);
      res.status(201).json(createSuccessResponse(farmer, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);

// Farms
farmersRouter.get('/all/farms', async (req, res, next) => {
  try {
    const farmerId = req.query.farmerId as string | undefined;
    const farms = await FarmerService.listFarms(req.user!, farmerId);
    res.json(createSuccessResponse(farms, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post(
  '/all/farms',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER),
  async (req, res, next) => {
    try {
      const data = createFarmSchema.parse(req.body);
      const farm = await FarmerService.createFarm(data, req.user!);
      res.status(201).json(createSuccessResponse(farm, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);

// Houses
farmersRouter.get('/houses/:farmId', async (req, res, next) => {
  try {
    const houses = await FarmerService.listHouses(req.user!, req.params.farmId);
    res.json(createSuccessResponse(houses, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post('/houses', async (req, res, next) => {
  try {
    const data = createPoultryHouseSchema.parse(req.body);
    const house = await FarmerService.createHouse(data, req.user!);
    res.status(201).json(createSuccessResponse(house, req.requestId));
  } catch (err) {
    next(err);
  }
});

// Flocks
farmersRouter.get('/all/flocks', async (req, res, next) => {
  try {
    const houseId = req.query.houseId as string | undefined;
    const flocks = await FarmerService.listFlocks(req.user!, houseId);
    res.json(createSuccessResponse(flocks, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post('/all/flocks', async (req, res, next) => {
  try {
    const data = createFlockSchema.parse(req.body);
    const flock = await FarmerService.createFlock(data, req.user!);
    res.status(201).json(createSuccessResponse(flock, req.requestId));
  } catch (err) {
    next(err);
  }
});

// Daily Records
farmersRouter.get('/daily-records/:flockId', async (req, res, next) => {
  try {
    const records = await FarmerService.listDailyRecords(req.params.flockId);
    res.json(createSuccessResponse(records, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post('/daily-records', async (req, res, next) => {
  try {
    const data = createDailyFlockRecordSchema.parse(req.body);
    const record = await FarmerService.createDailyRecord(data, req.user!);
    res.status(201).json(createSuccessResponse(record, req.requestId));
  } catch (err) {
    next(err);
  }
});

// Feed Quotas
farmersRouter.get('/all/quotas', async (req, res, next) => {
  try {
    const quotas = await FarmerService.listQuotas(req.user!);
    res.json(createSuccessResponse(quotas, req.requestId));
  } catch (err) {
    next(err);
  }
});

farmersRouter.post(
  '/all/quotas',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const data = createFeedQuotaSchema.parse(req.body);
      const quota = await FarmerService.createQuota(data, req.user!);
      res.status(201).json(createSuccessResponse(quota, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);
