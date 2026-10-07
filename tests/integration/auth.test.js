import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../apps/api/dist/services/auth.service.js';
import { queryOne, pool } from '../../apps/api/dist/db/connection.js';
import { UnauthorizedError } from '../../packages/shared/dist/index.js';

describe('Integration - Authentication & Session Management', () => {
  let sessionToken = '';
  let userId = '';

  test('Logs in user with valid credentials and creates active session in PostgreSQL', async () => {
    const res = await AuthService.login({
      username: 'admin',
      password: 'password123',
    });

    assert.ok(res.token);
    assert.equal(res.user.username, 'admin');
    assert.equal(res.user.role, 'ADMIN');

    sessionToken = res.token;
    userId = res.user.id;

    // Verify session row exists in real database
    const session = await queryOne('SELECT * FROM sessions WHERE user_id = $1 AND is_revoked = false', [
      userId,
    ]);
    assert.ok(session);
    assert.ok(new Date(session.expires_at) > new Date());
  });

  test('Farmer login returns associated farmerId', async () => {
    const res = await AuthService.login({
      username: 'farmer1',
      password: 'password123',
    });

    assert.equal(res.user.role, 'FARMER');
    assert.ok(res.farmerId);
  });

  test('Rejects login with invalid credentials', async () => {
    await assert.rejects(
      async () => {
        await AuthService.login({
          username: 'admin',
          password: 'WRONG_PASSWORD_XYZ',
        });
      },
      (err) => err instanceof UnauthorizedError
    );
  });

  test('Logout revokes session in database', async () => {
    await AuthService.logout(sessionToken);

    const session = await queryOne('SELECT is_revoked FROM sessions WHERE user_id = $1', [
      userId,
    ]);
    assert.equal(session?.is_revoked, true);
  });

  after(async () => {
    await pool.end();
  });
});
