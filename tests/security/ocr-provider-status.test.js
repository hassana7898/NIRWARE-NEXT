import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AiService } from '../../apps/api/dist/services/ai.service.js';
import { createApp } from '../../apps/api/dist/app.js';
import { pool } from '../../apps/api/dist/db/connection.js';

describe('Suite 22: OCR Provider Status & Zero Misrepresentation Audit', () => {
  let server;
  let baseUrl = '';
  let managerToken = '';

  before(async () => {
    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'password123' }),
    });
    const data = await res.json();
    managerToken = data.data.token;
  });

  test('AiService.getOcrProviderStatus() strictly reports explicit provider status', () => {
    const status = AiService.getOcrProviderStatus();
    assert.ok(
      ['OCR_PROVIDER_NOT_CONFIGURED', 'OCR_PROVIDER_CONFIGURED_BUT_UPSTREAM_UNAVAILABLE', 'OCR_PROVIDER_CONFIGURED_AND_WORKING'].includes(
        status.status
      ),
      `Status must be one of the 3 explicit statuses, received: ${status.status}`
    );
    assert.equal(status.humanInTheLoopRequired, true, 'OCR must strictly enforce Human-In-The-Loop review');
  });

  test('HTTP GET /api/v1/ai/ocr-status returns valid provider status structure', async () => {
    const res = await fetch(`${baseUrl}/ai/ocr-status`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.data.status);
    assert.equal(data.data.humanInTheLoopRequired, true);
  });

  test('Process bill OCR without OCR_PROVIDER_KEY fails closed with 503 OCR_PROVIDER_UNCONFIGURED and does NOT return fake data', async () => {
    const prevKey = process.env.OCR_PROVIDER_KEY;
    delete process.env.OCR_PROVIDER_KEY;

    try {
      await assert.rejects(
        async () => {
          await AiService.processBillOcr({
            originalname: 'waybill-test.jpg',
            buffer: Buffer.from('dummy image content'),
          });
        },
        (err) => {
          assert.equal(err.statusCode, 503);
          assert.equal(err.code, 'OCR_PROVIDER_UNCONFIGURED');
          assert.ok(!JSON.stringify(err).includes('BL-98421'), 'Must not return fake bill BL-98421');
          return true;
        }
      );
    } finally {
      if (prevKey) process.env.OCR_PROVIDER_KEY = prevKey;
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });
});
