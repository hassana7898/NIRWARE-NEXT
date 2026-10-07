import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, hashToken } from '@nirware/shared';
import { UserRole } from '@nirware/config';
import { queryOne } from '../db/connection.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  phone: string;
  isActive: boolean;
  farmerId?: string | null;
  driverId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('توکن احراز هویت ارائه نشده است');
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = hashToken(token);

    // Look up active session
    const session = await queryOne<{
      id: string;
      user_id: string;
      expires_at: Date;
      is_revoked: boolean;
      username: string;
      role: UserRole;
      full_name: string;
      phone: string;
      is_active: boolean;
    }>(
      `SELECT s.id, s.user_id, s.expires_at, s.is_revoked,
              u.username, u.role, u.full_name, u.phone, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );

    if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
      throw new UnauthorizedError('نشست کاربری نامعتبر است یا منقضی شده است');
    }

    if (!session.is_active) {
      throw new ForbiddenError('حساب کاربری شما غیرفعال شده است');
    }

    let farmerId: string | null = null;
    let driverId: string | null = null;

    if (session.role === UserRole.FARMER) {
      const farmer = await queryOne<{ id: string }>(
        'SELECT id FROM farmers WHERE user_id = $1',
        [session.user_id]
      );
      farmerId = farmer ? farmer.id : null;
    } else if (session.role === UserRole.DRIVER) {
      const driver = await queryOne<{ id: string }>(
        'SELECT id FROM drivers WHERE user_id = $1',
        [session.user_id]
      );
      driverId = driver ? driver.id : null;
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      role: session.role,
      fullName: session.full_name,
      phone: session.phone,
      isActive: session.is_active,
      farmerId,
      driverId,
    };

    next();
  } catch (error) {
    next(error);
  }
}
