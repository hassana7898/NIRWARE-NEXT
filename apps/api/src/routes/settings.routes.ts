import { Router } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@nirware/config';

export const settingsRouter = Router();

// GET /api/v1/settings (Public or authenticated)
settingsRouter.get('/', async (req, res, next) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/settings (Manager/Admin only)
settingsRouter.put(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const updated = await SettingsService.updateSettings(req.body, req.user!);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);
