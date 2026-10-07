import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../../apps/mobile/dist/services/storage.service.js';

describe('Mobile Secure Storage - Hardware-Backed Isolation & Fail Closed', () => {
  test('StorageService.setItem fails closed when hardware-backed secure store is unavailable', async () => {
    // In headless test environment without expo-secure-store hardware module,
    // storage service MUST reject rather than falling back to plain unencrypted memory.
    await assert.rejects(
      async () => {
        await StorageService.setItem('auth_token', 'test_secret_token');
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /SECURE_STORAGE_UNAVAILABLE/);
        return true;
      },
      'Must reject with SECURE_STORAGE_UNAVAILABLE when secure store is missing'
    );
  });

  test('StorageService.getItem returns null when secure store is not available', async () => {
    const item = await StorageService.getItem('non_existent_key');
    assert.equal(item, null);
  });
});
