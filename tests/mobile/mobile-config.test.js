import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('Mobile Expo Android Configuration Verification', () => {
  const appJsonPath = path.join(rootDir, 'apps/mobile/app.json');
  const easJsonPath = path.join(rootDir, 'apps/mobile/eas.json');

  test('app.json defines valid Android package com.nirware.next and required permissions', () => {
    assert.ok(fs.existsSync(appJsonPath), 'app.json must exist');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    assert.equal(appJson.expo.name, 'NIRWARE NEXT');
    assert.equal(appJson.expo.android.package, 'com.nirware.next');
    assert.ok(Array.isArray(appJson.expo.android.permissions));
    assert.ok(appJson.expo.android.permissions.includes('ACCESS_FINE_LOCATION'));
    assert.ok(appJson.expo.android.permissions.includes('ACCESS_COARSE_LOCATION'));
    assert.ok(appJson.expo.android.permissions.includes('CAMERA'));
  });

  test('eas.json defines Android preview APK and production AAB build profiles', () => {
    assert.ok(fs.existsSync(easJsonPath), 'eas.json must exist');
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    assert.ok(easJson.build.preview, 'preview build profile must exist');
    assert.equal(easJson.build.preview.android.buildType, 'apk');
    assert.ok(easJson.build.production, 'production build profile must exist');
    assert.equal(easJson.build.production.android.buildType, 'app-bundle');
  });

  test('All required mobile icon and splash assets exist on disk', () => {
    const assetsDir = path.join(rootDir, 'apps/mobile/assets');
    assert.ok(fs.existsSync(path.join(assetsDir, 'icon.png')), 'icon.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'splash.png')), 'splash.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'adaptive-icon.png')), 'adaptive-icon.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'favicon.png')), 'favicon.png must exist');
  });
});
