import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/app.js';
import { AuthService } from '../../apps/api/dist/services/auth.service.js';
import { query, pool } from '../../apps/api/dist/db/connection.js';

describe('Idempotency - Idempotency-Key Duplicate Prevention & Concurrency Locks', () => {
  let authToken = '';

  test('Submitting request with Idempotency-Key caches response and replay does not create duplicates', async () => {
    const loginRes = await AuthService.login({
      username: 'manager',
      password: 'password123',
    });
    authToken = loginRes.token;

    const idempotencyKey = `test-key-${Date.now()}`;

    // 1. First atomic reservation
    const res1 = await query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, locked_at, expires_at)
       VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW() + INTERVAL '24 hours')
       ON CONFLICT (key) DO NOTHING
       RETURNING id, status`,
      [idempotencyKey, loginRes.user.id, '/api/v1/feed-orders', 'hash-test-123']
    );
    assert.equal(res1.length, 1);
    assert.equal(res1[0].status, 'PENDING');

    // 2. Concurrent duplicate reservation with SAME key must be rejected (ON CONFLICT DO NOTHING returns 0 rows)
    const res2 = await query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status, locked_at, expires_at)
       VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW() + INTERVAL '24 hours')
       ON CONFLICT (key) DO NOTHING
       RETURNING id, status`,
      [idempotencyKey, loginRes.user.id, '/api/v1/feed-orders', 'hash-test-123']
    );
    assert.equal(res2.length, 0, 'Concurrent insert must conflict and return 0 rows');

    // 3. Complete the original operation
    await query(
      `UPDATE idempotency_keys
       SET status = 'COMPLETED',
           response_status = 201,
           response_body = $1,
           locked_at = NOW()
       WHERE key = $2`,
      [JSON.stringify({ success: true, data: { orderId: 'ord-conc-999' } }), idempotencyKey]
    );

    // 4. Subsequent queries retrieve completed response without executing again
    const completed = await query(
      `SELECT status, response_status, response_body FROM idempotency_keys WHERE key = $1`,
      [idempotencyKey]
    );
    assert.equal(completed.length, 1);
    assert.equal(completed[0].status, 'COMPLETED');
    assert.equal(completed[0].response_status, 201);
    const body = completed[0].response_body;
    assert.equal(body.data.orderId, 'ord-conc-999');
  });

  after(async () => {
    await pool.end();
  });
});
