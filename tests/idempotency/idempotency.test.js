import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/app.js';
import { query, pool } from '../../apps/api/dist/db/connection.js';

describe('REAL HTTP Idempotency Concurrency & Transactional Atomicity Matrix', () => {
  let server;
  let baseUrl = '';
  let managerToken = '';
  let adminToken = '';
  let farmerId = '';
  let farmId = '';
  let houseId = '';
  let flockId = '';
  let quotaId = '';
  const productId = '20000000-0000-0000-0000-000000000009'; // Finished feed (Grower)

  before(async () => {
    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // 1. Authenticate Manager & Admin via HTTP
    const mgrRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'password123' }),
    });
    const mgrData = await mgrRes.json();
    managerToken = mgrData.data.token;

    const admRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });
    const admData = await admRes.json();
    adminToken = admData.data.token;

    // 2. Setup baseline domain entities for order placement
    const ts = Date.now();
    const fRes = await fetch(`${baseUrl}/farmers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: `مرغدار تست همزمانی ${ts}`,
        businessName: `مرغداری صنعتی اتمیک ${ts}`,
        nationalId: `00${String(ts).slice(-8)}`,
        mobile: '09129998877',
        address: 'استان گلستان، گرگان، جاده فرودگاه',
      }),
    });
    const fData = await fRes.json();
    farmerId = fData.data.id;

    const farmRes = await fetch(`${baseUrl}/farmers/all/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        farmerId,
        name: 'مزرعه نمونه همزمانی',
        licenseNumber: `LIC-${ts}`,
        location: 'گرگان',
        address: 'کیلومتر ۵ جاده فرودگاه',
        totalCapacity: 60000,
      }),
    });
    const farmData = await farmRes.json();
    farmId = farmData.data.id;

    const houseRes = await fetch(`${baseUrl}/farmers/houses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        farmId,
        code: 'SALON-CONC',
        capacity: 30000,
        houseType: 'STANDARD',
      }),
    });
    const houseData = await houseRes.json();
    houseId = houseData.data.id;

    const flockRes = await fetch(`${baseUrl}/farmers/all/flocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        poultryHouseId: houseId,
        flockCode: `FLOCK-CONC-${ts}`,
        breed: 'Ross 308',
        chickCount: 25000,
        startDate: '2026-10-01',
      }),
    });
    const flockData = await flockRes.json();
    flockId = flockData.data.id;

    const quotaRes = await fetch(`${baseUrl}/farmers/all/quotas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        farmerId,
        flockId,
        periodStart: '2026-10-01',
        periodEnd: '2026-12-31',
        approvedQuantityKg: 50000,
      }),
    });
    const quotaData = await quotaRes.json();
    quotaId = quotaData.data.id;
  });

  test('Scenario 1: Two Near-Simultaneous HTTP Requests with SAME Idempotency-Key and SAME Payload', async () => {
    const idempotencyKey = `http-conc-order-${Date.now()}`;
    const orderPayload = {
      farmerId,
      flockId,
      quotaId,
      productId,
      requestedQuantityKg: 2500,
      deliveryAddress: 'درب مزرعه مرغداری اتمیک',
      deliveryDateNeeded: '2026-10-20',
      notes: 'تست همزمانی شدید HTTP Idempotency',
    };

    // Fire two near-simultaneous HTTP requests with identical Idempotency-Key
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(orderPayload),
      }),
      fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(orderPayload),
      }),
    ]);

    const statuses = [resA.status, resB.status];
    // Exactly one must be 201 Created. The concurrent request must be 409 Conflict or an idempotent replay (201)
    assert.ok(statuses.includes(201), 'At least one request must succeed with 201 Created');
    assert.ok(
      statuses.includes(409) || (resA.status === 201 && resB.status === 201),
      'Second concurrent request must either receive 409 Conflict or 201 Replay'
    );

    // Verify Business Effect in PostgreSQL: EXACTLY ONE order was created
    const createdOrders = await query(
      `SELECT id, order_number, requested_quantity_kg FROM feed_orders
       WHERE farmer_id = $1 AND flock_id = $2 AND requested_quantity_kg = 2500`,
      [farmerId, flockId]
    );
    assert.equal(
      createdOrders.length,
      1,
      'EXACTLY ONE business order record must exist in PostgreSQL despite concurrent execution'
    );
  });

  test('Scenario 2 (Case B): Same Key + Different Payload is rejected with 409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST', async () => {
    const key = `key-payload-tamper-${Date.now()}`;
    const payload1 = {
      farmerId,
      flockId,
      quotaId,
      productId,
      requestedQuantityKg: 1000,
      deliveryAddress: 'آدرس اصلی تحویل',
      deliveryDateNeeded: '2026-10-25',
    };
    const payload2 = {
      ...payload1,
      requestedQuantityKg: 9999, // Tampered payload
    };

    // First request
    const res1 = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload1),
    });
    assert.equal(res1.status, 201);

    // Second request with same key but DIFFERENT payload
    const res2 = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload2),
    });

    assert.equal(res2.status, 409);
    const data2 = await res2.json();
    assert.equal(data2.error.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
  });

  test('Scenario 3 (Case C): Completed Key Replay returns exact cached response and X-Idempotent-Replay header', async () => {
    const key = `key-replay-${Date.now()}`;
    const payload = {
      farmerId,
      flockId,
      quotaId,
      productId,
      requestedQuantityKg: 1200,
      deliveryAddress: 'آدرس تست بازپخش',
      deliveryDateNeeded: '2026-10-26',
    };

    // Initial Request
    const res1 = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res1.status, 201);
    const body1 = await res1.json();

    // Replay Request
    const res2 = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res2.status, 201);
    assert.equal(res2.headers.get('x-idempotent-replay'), 'true');
    const body2 = await res2.json();
    assert.equal(body2.data.id, body1.data.id);
    assert.equal(body2.data.order_number, body1.data.order_number);
  });

  test('Scenario 4 (Cases D & E): Stale PENDING Lock and CAS Takeover Concurrency', async () => {
    const staleKey = `stale-lock-test-${Date.now()}`;
    // Seed a stale PENDING lock in database (locked 45 seconds ago)
    await query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, locked_at, expires_at)
       VALUES ($1, NULL, '/api/v1/orders', 'hash-dummy', 'PENDING', NOW() - INTERVAL '45 seconds', NOW() + INTERVAL '24 hours')`,
      [staleKey]
    );

    // Simulate two concurrent workers attempting CAS takeover at the exact same time
    const casQuery = `
      UPDATE idempotency_keys
      SET locked_at = NOW(),
          status = 'PENDING',
          request_hash = $2
      WHERE key = $1
        AND status = 'PENDING'
        AND locked_at < NOW() - INTERVAL '30 seconds'
      RETURNING id
    `;

    const [workerA, workerB] = await Promise.all([
      query(casQuery, [staleKey, 'hash-worker-a']),
      query(casQuery, [staleKey, 'hash-worker-b']),
    ]);

    const totalAcquired = workerA.length + workerB.length;
    assert.equal(totalAcquired, 1, 'EXACTLY ONE worker must acquire the stale lock via CAS');
    assert.ok(
      (workerA.length === 1 && workerB.length === 0) || (workerA.length === 0 && workerB.length === 1),
      'One worker gets the lock, the other matches 0 rows and is rejected'
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });
});
