import { Router } from 'express';
import { createSuccessResponse, ForbiddenError, AppError } from '@nirware/shared';
import { loginSchema, registerUserSchema } from '@nirware/validation';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@nirware/config';
import { queryOne } from '../db/connection.js';

export const authRouter = Router();

authRouter.post('/bootstrap', async (req, res, next) => {
  try {
    const existingAdmin = await queryOne(
      "SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND is_active = true"
    );
    if (existingAdmin) {
      throw new ForbiddenError('سامانه از قبل دارای مدیر فعال است. ایجاد مدیر اولیه تنها در دیتابیس بدون مدیر مجاز می‌باشد');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      const secretHeader = req.headers['x-bootstrap-secret'];
      const requiredSecret = process.env.BOOTSTRAP_SECRET;
      if (!requiredSecret || secretHeader !== requiredSecret) {
        throw new ForbiddenError('دسترسی غیرمجاز برای راه‌اندازی اولیه سامانه در محیط Production');
      }
    }

    const data = registerUserSchema.parse({
      ...req.body,
      role: req.body.role || UserRole.SUPER_ADMIN,
    });

    const user = await AuthService.register({
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone,
      role: data.role,
    });

    if (!user) {
      throw new AppError('خطا در ایجاد کاربر', 500);
    }

    res.status(201).json(
      createSuccessResponse(
        {
          message: 'مدیر اولیه سامانه با موفقیت ثبت شد',
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
          },
        },
        req.requestId
      )
    );
  } catch (err) {
    next(err);
  }
});

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
