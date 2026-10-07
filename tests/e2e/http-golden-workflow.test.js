import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/app.js';
import { pool } from '../../apps/api/dist/db/connection.js';

describe('HTTP Golden E2E - Full Lifecycle via Real HTTP Wire Protocols', () => {
  let server;
  let baseUrl = '';
  let adminToken = '';
  let managerToken = '';
  let farmerId = '';
  let farmId = '';
  let poultryHouseId = '';
  let flockId = '';
  let quotaId = '';
  let orderId = '';
  let deliveryId = '';

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

  test('Step 1: HTTP Authentication for Admin & Manager', async () => {
    // Admin login
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });
    assert.equal(adminRes.status, 200);
    const adminData = await adminRes.json();
    assert.ok(adminData.data.token);
    adminToken = adminData.data.token;

    // Manager login
    const mgrRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'password123' }),
    });
    assert.equal(mgrRes.status, 200);
    const mgrData = await mgrRes.json();
    assert.ok(mgrData.data.token);
    managerToken = mgrData.data.token;
  });

  test('Step 2: HTTP Create Farmer, Farm, House, Flock & Quota', async () => {
    const ts = Date.now();
    // Create Farmer
    const farmerRes = await fetch(`${baseUrl}/farmers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: `مرغدار آزمایشی ${ts}`,
        businessName: 'مجتمع پرورش مرغداری البرز',
        nationalId: `00${String(ts).slice(-8)}`,
        mobile: '09121112233',
        address: 'استان گلستان، آق‌قلا، مزرعه شماره ۱',
      }),
    });
    assert.equal(farmerRes.status, 201);
    const farmerData = await farmerRes.json();
    farmerId = farmerData.data.id;
    assert.ok(farmerId);

    // Create Farm
    const farmRes = await fetch(`${baseUrl}/farmers/all/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        farmerId,
        name: 'مزرعه نمونه گلستان',
        licenseNumber: 'LIC-GLS-9988',
        location: 'گرگان، بخش مرکزی',
        address: 'استان گلستان، گرگان، جاده آق‌قلا، مزرعه شماره ۱',
        totalCapacity: 50000,
      }),
    });
    assert.equal(farmRes.status, 201);
    const farmData = await farmRes.json();
    farmId = farmData.data.id;

    // Create Poultry House
    const houseRes = await fetch(`${baseUrl}/farmers/houses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        farmId,
        code: 'SALON-01',
        capacity: 25000,
        houseType: 'STANDARD',
      }),
    });
    assert.equal(houseRes.status, 201);
    const houseData = await houseRes.json();
    poultryHouseId = houseData.data.id;

    // Create Flock
    const flockRes = await fetch(`${baseUrl}/farmers/all/flocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        poultryHouseId,
        flockCode: `FLOCK-HTTP-${ts}`,
        breed: 'Ross 308',
        chickCount: 20000,
        startDate: '2026-10-01',
      }),
    });
    assert.equal(flockRes.status, 201);
    const flockData = await flockRes.json();
    flockId = flockData.data.id;

    // Issue Feed Quota
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
    assert.equal(quotaRes.status, 201);
    const quotaData = await quotaRes.json();
    quotaId = quotaData.data.id;
  });

  test('Step 3: HTTP Place Feed Order with Idempotency-Key', async () => {
    const idempotencyKey = `http-order-${Date.now()}`;
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        farmerId,
        flockId,
        quotaId,
        productId: '20000000-0000-0000-0000-000000000009', // Finished feed
        requestedQuantityKg: 5000,
        deliveryAddress: 'درب مزرعه مرغداری گلستان',
        deliveryDateNeeded: '2026-10-15',
      }),
    });
    assert.equal(orderRes.status, 201);
    const orderData = await orderRes.json();
    orderId = orderData.data.id;
    assert.ok(orderId);
  });

  test('Step 4: HTTP Order Lifecycle Approval', async () => {
    // 1. SUBMITTED -> PENDING_APPROVAL
    const pendingRes = await fetch(`${baseUrl}/orders/${orderId}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        action: 'PROCESS_FOR_APPROVAL',
        targetState: 'PENDING_APPROVAL',
      }),
    });
    assert.equal(pendingRes.status, 200);
    const pendingData = await pendingRes.json();
    assert.equal(pendingData.data.status, 'PENDING_APPROVAL');

    // 2. PENDING_APPROVAL -> APPROVED
    const approveRes = await fetch(`${baseUrl}/orders/${orderId}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE_ORDER',
        targetState: 'APPROVED',
      }),
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.data.status, 'APPROVED');
  });

  test('Step 5: HTTP Reports Summary with Dynamic Metrics', async () => {
    const reportRes = await fetch(`${baseUrl}/reports/summary`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });
    assert.equal(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.equal(typeof reportData.data.monthlyProducedKg, 'number');
    assert.equal(typeof reportData.data.wastageRate, 'number');
    assert.ok(Array.isArray(reportData.data.productDistribution));
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });
});
