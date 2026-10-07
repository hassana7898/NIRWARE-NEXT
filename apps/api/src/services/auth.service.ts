import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { UserRole } from '@nirware/config';
import {
  UnauthorizedError,
  ValidationError,
  hashToken,
} from '@nirware/shared';
import { queryOne, query } from '../db/connection.js';
import { AuditService } from './audit.service.js';

export class AuthService {
  public static async login(params: {
    username: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }) {
    const user = await queryOne<{
      id: string;
      username: string;
      password_hash: string;
      full_name: string;
      phone: string;
      role: UserRole;
      is_active: boolean;
    }>(
      `SELECT id, username, password_hash, full_name, phone, role, is_active
       FROM users
       WHERE username = $1`,
      [params.username]
    );

    if (!user) {
      throw new UnauthorizedError('نام کاربری یا کلمه عبور نادرست است');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('حساب کاربری غیرفعال می‌باشد');
    }

    // Strict cryptographic password verification (no bypass in any environment)
    const isValid = await bcrypt.compare(params.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('نام کاربری یا کلمه عبور نادرست است');
    }

    // Generate secure session token
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, tokenHash, params.userAgent || null, params.ipAddress || null, expiresAt]
    );

    let farmerId: string | null = null;
    let driverId: string | null = null;

    if (user.role === UserRole.FARMER) {
      const f = await queryOne<{ id: string }>('SELECT id FROM farmers WHERE user_id = $1', [user.id]);
      farmerId = f ? f.id : null;
    } else if (user.role === UserRole.DRIVER) {
      const d = await queryOne<{ id: string }>('SELECT id FROM drivers WHERE user_id = $1', [user.id]);
      driverId = d ? d.id : null;
    }

    await AuditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress: params.ipAddress,
      requestId: params.requestId,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
      },
      token,
      farmerId,
      driverId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  public static async register(
    data: {
      username: string;
      password: string;
      fullName: string;
      phone: string;
      role: UserRole;
    },
    creatorId?: string
  ) {
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [data.username]);
    if (existing) {
      throw new ValidationError('این نام کاربری از قبل در سامانه ثبت شده است');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await queryOne<{
      id: string;
      username: string;
      full_name: string;
      phone: string;
      role: UserRole;
      is_active: boolean;
      created_at: Date;
    }>(
      `INSERT INTO users (username, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, phone, role, is_active, created_at`,
      [data.username, passwordHash, data.fullName, data.phone, data.role]
    );

    if (creatorId && user) {
      await AuditService.log({
        userId: creatorId,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        details: { username: user.username, role: user.role },
      });
    }

    return user;
  }

  public static async logout(token: string) {
    const tokenHash = hashToken(token);
    await query('UPDATE sessions SET is_revoked = true WHERE token_hash = $1', [tokenHash]);
  }
}
