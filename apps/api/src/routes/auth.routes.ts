import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import { loginSchema, registerUserSchema } from '@nirware/validation';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@nirware/config';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login({
      username: data.username,
      password: data.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });
    res.json(createSuccessResponse(result, req.requestId));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', authMiddleware, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), async (req, res, next) => {
  try {
    const data = registerUserSchema.parse(req.body);
    const user = await AuthService.register(data, req.user?.id);
    res.status(201).json(createSuccessResponse(user, req.requestId));
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, (req, res) => {
  res.json(createSuccessResponse(req.user, req.requestId));
});

authRouter.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await AuthService.logout(token);
    }
    res.json(createSuccessResponse({ message: 'خروج با موفقیت انجام شد' }, req.requestId));
  } catch (err) {
    next(err);
  }
});
