import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsService } from '../../apps/api/dist/services/settings.service.js';
import { query, pool } from '../../apps/api/dist/db/connection.js';

describe('Settings Integrity - Real Database Configuration & No Fake Fallbacks', () => {
  test('SettingsService returns real company configuration from database', async () => {
    const settings = await SettingsService.getSettings();
    assert.ok(settings, 'Settings must be returned');
    assert.equal(settings.id, 'default');
    assert.ok(settings.companyName.length > 0);
    assert.ok(settings.registrationNumber.length > 0);
    assert.ok(settings.nationalId.length > 0);
    assert.ok(settings.signatoryManagerName.length > 0);
    assert.ok(settings.signatoryScaleName.length > 0);
  });

  test('SettingsService fails with 503 CONFIGURATION_REQUIRED if company_settings table has no record', async () => {
    // Temporarily rename default settings ID to simulate unconfigured environment
    await query(`UPDATE company_settings SET id = 'temp_hidden' WHERE id = 'default'`);

    try {
      await assert.rejects(
        async () => {
          await SettingsService.getSettings();
        },
        (err) => {
          assert.equal(err.code, 'CONFIGURATION_REQUIRED');
          assert.equal(err.statusCode, 503);
          return true;
        },
        'Must throw 503 CONFIGURATION_REQUIRED when settings are unconfigured'
      );
    } finally {
      // Restore default settings
      await query(`UPDATE company_settings SET id = 'default' WHERE id = 'temp_hidden'`);
    }
  });

  after(async () => {
    await pool.end();
  });
});
