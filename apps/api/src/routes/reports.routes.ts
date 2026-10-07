import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { ReportService } from '../services/report.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(authMiddleware);

reportsRouter.get('/kpis', async (req, res, next) => {
  try {
    const kpis = await ReportService.getDashboardKpis();
    res.json(createSuccessResponse(kpis, req.requestId));
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/flocks-fcr', async (req, res, next) => {
  try {
    const fcrReport = await ReportService.getFlockPerformanceReport();
    res.json(createSuccessResponse(fcrReport, req.requestId));
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/summary', async (req, res, next) => {
  try {
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const summary = await ReportService.getFactorySummary(fromDate, toDate);
    res.json(createSuccessResponse(summary, req.requestId));
  } catch (err) {
    next(err);
  }
});
