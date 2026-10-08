import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/app.js';
import { pool, queryOne } from '../../apps/api/dist/db/connection.js';
import { bootstrapAdmin } from '../../database/scripts/bootstrap-admin.js';

describe('Mobile Authentication Lifecycle & Bootstrap - Real Wire Protocol', () => {
  let server;
  let baseUrl = '';

  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve(null);
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  // 1. Manager Login
  let managerToken = '';
  let managerUserId = '';

  test('1. Manager Login: Returns valid token, session created in DB, role is MANAGER', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'manager',
        password: 'password123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token, 'Token must be present in response');
    assert.equal(body.data.user.username, 'manager');
    assert.equal(body.data.user.role, 'MANAGER');
    assert.equal(body.data.user.isActive, true);

    managerToken = body.data.token;
    managerUserId = body.data.user.id;

    // Verify PostgreSQL session table
    const session = await queryOne(
      'SELECT id, user_id, is_revoked, expires_at FROM sessions WHERE user_id = $1 AND is_revoked = false',
      [managerUserId]
    );
    assert.ok(session, 'Active session row must exist in PostgreSQL');
    assert.ok(new Date(session.expires_at) > new Date(), 'Session expires_at must be in the future');
  });

  // 2. Failed Login with Wrong Password
  test('2. Failed Login: Rejects incorrect password with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'manager',
        password: 'INCORRECT_PASSWORD_999',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error.message, /نادرست/);
  });

  // 3. Failed Login with Non-Existent User
  test('3. Failed Login: Rejects non-existent username with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ghost_user_does_not_exist',
        password: 'password123',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 4. Session Persistence & Token Verification
  test('4. Session Persistence: Validates session via GET /auth/me', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, managerUserId);
    assert.equal(body.data.username, 'manager');
    assert.equal(body.data.role, 'MANAGER');
  });

  // 5. Logout & Revocation
  test('5. Logout: Revokes session in DB and invalidates future requests', async () => {
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(logoutRes.status, 200);

    // Verify session revoked in DB
    const session = await queryOne(
      'SELECT is_revoked FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [managerUserId]
    );
    assert.equal(session?.is_revoked, true, 'Session is_revoked must be true after logout');

    // Attempting /auth/me with revoked token must now fail with 401
    const verifyRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(verifyRes.status, 401, 'Request with revoked token must be rejected with 401');
  });

  // 6. Farmer Login
  test('6. Farmer Login: Returns role FARMER and valid associated farmerId', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'farmer1',
        password: 'password123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, 'FARMER');
    assert.ok(body.data.farmerId, 'farmerId must be present in response');
    assert.equal(body.data.user.farmerId, body.data.farmerId, 'farmerId must also be attached to user');

    // Farmer authenticated request
    const ordersRes = await fetch(`${baseUrl}/orders`, {
      headers: { Authorization: `Bearer ${body.data.token}` },
    });
    assert.equal(ordersRes.status, 200);
  });

  // 7. Driver Login
  test('7. Driver Login: Returns role DRIVER and valid associated driverId', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'driver1',
        password: 'password123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, 'DRIVER');
    assert.ok(body.data.driverId, 'driverId must be present in response');
    assert.equal(body.data.user.driverId, body.data.driverId, 'driverId must also be attached to user');
  });

  // 8. Admin Bootstrap CLI Verification
  test('8. Admin Bootstrap CLI: Safely creates initial admin, enforces idempotency, enables login', async () => {
    const testUsername = 'bootstrap_test_manager';
    const testPassword = 'BootstrapSecureP@ss123';

    // Run bootstrapAdmin
    const result = await bootstrapAdmin({
      username: testUsername,
      password: testPassword,
      name: 'مدیر آزمون بوت‌استرپ',
      phone: '09129998877',
      role: 'MANAGER',
      force: true,
      json: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.user.username, testUsername);

    // Test real HTTP login with newly bootstrapped credentials
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });

    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.success, true);
    assert.equal(loginBody.data.user.username, testUsername);

    // Test idempotency: without force, it protects existing admin from overwrite
    const idempotentResult = await bootstrapAdmin({
      username: testUsername,
      password: 'DifferentPassword123',
      force: false,
      json: true,
    });

    assert.equal(idempotentResult.success, false);
    assert.equal(idempotentResult.reason, 'USER_ALREADY_EXISTS');

    // Original password must still work
    const checkRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
      }),
    });
    assert.equal(checkRes.status, 200);
  });

  // 9. Guarded API Bootstrap Endpoint
  // 9. Guarded API Bootstrap Endpoint
  test('9. Guarded API Bootstrap: Rejects bootstrap when active admins exist (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'intruder_admin',
        password: 'Password123456!',
        fullName: 'نفوذی غیرمجاز',
        phone: '09121112233',
        role: 'SUPER_ADMIN',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error.message, /سامانه از قبل دارای مدیر فعال است/);
  });

  // 10. Health Check Connectivity
  test('10. Health Check: GET /health returns 200 OK for live mobile connectivity checks', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'UP');
  });

  // 11. Controlled Network Unreachable Error
  test('11. Controlled Network Error: ApiClient transforms unreachable host into NETWORK_UNREACHABLE AppError', async () => {
    const { ApiClient } = await import('../../packages/api-client/dist/index.js');
    const unreachableClient = new ApiClient({
      baseUrl: 'http://127.0.0.1:59999/api/v1', // Unbound port
    });

    await assert.rejects(
      async () => {
        await unreachableClient.post('/auth/login', { username: 'test', password: '123' });
      },
      (err) => {
        assert.equal(err.code, 'NETWORK_UNREACHABLE');
        assert.match(err.message, /عدم برقراری ارتباط با سرور سامانه/);
        assert.ok(err.details?.targetUrl.includes('59999'));
        return true;
      }
    );
  });

  // 12. ManagerDashboard Real API Data Loading
  test('12. ManagerDashboard Data: Authenticated Manager loads real orders and KPI metrics', async () => {
    // 1. Login as manager
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;

    // 2. Load orders
    const ordersRes = await fetch(`${baseUrl}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(ordersRes.status, 200);
    const ordersData = await ordersRes.json();
    assert.equal(ordersData.success, true);
    assert.ok(Array.isArray(ordersData.data));

    // 3. Load reports KPIs (as consumed by ManagerDashboardScreen)
    const kpisRes = await fetch(`${baseUrl}/reports/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(kpisRes.status, 200);
    const kpisData = await kpisRes.json();
    assert.equal(kpisData.success, true);
    assert.ok(kpisData.data.pendingOrdersCount !== undefined);
    assert.ok(kpisData.data.activeDeliveriesCount !== undefined);
  });
});
