import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@nirware/config';
import { ForbiddenError, UnauthorizedError } from '@nirware/shared';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next(); // Super admin bypasses role checks
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `نقش ${req.user.role} دسترسی مجاز به این منبع را ندارد. نقش‌های مجاز: ${allowedRoles.join(
            ', '
          )}`
        )
      );
    }

    next();
  };
}
