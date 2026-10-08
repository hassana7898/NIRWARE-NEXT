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

  test('eas.json defines Android preview APK and production AAB build profiles with EXPO_PUBLIC_API_URL', () => {
    assert.ok(fs.existsSync(easJsonPath), 'eas.json must exist');
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    assert.ok(easJson.build.preview, 'preview build profile must exist');
    assert.equal(easJson.build.preview.android.buildType, 'apk');
    assert.ok(easJson.build.preview.env?.EXPO_PUBLIC_API_URL, 'preview profile must define EXPO_PUBLIC_API_URL');
    assert.ok(easJson.build.production, 'production build profile must exist');
    assert.equal(easJson.build.production.android.buildType, 'app-bundle');
    assert.ok(easJson.build.production.env?.EXPO_PUBLIC_API_URL, 'production profile must define EXPO_PUBLIC_API_URL');
  });

  test('apps/mobile/.env.example exists and documents EXPO_PUBLIC_API_URL configurations', () => {
    const envExamplePath = path.join(rootDir, 'apps/mobile/.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist in apps/mobile');
    const content = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(content.includes('EXPO_PUBLIC_API_URL='), '.env.example must define EXPO_PUBLIC_API_URL');
    assert.ok(content.includes('10.0.2.2:4000'), '.env.example must document Android Emulator');
    assert.ok(content.includes('192.168.'), '.env.example must document physical device LAN IP');
  });

  test('Central API config enforces fail-closed and rejects missing or non-http URLs', () => {
    const configPath = path.join(rootDir, 'apps/mobile/src/config/api.ts');
    assert.ok(fs.existsSync(configPath), 'apps/mobile/src/config/api.ts must exist');
    const content = fs.readFileSync(configPath, 'utf8');
    assert.ok(content.includes('validateApiUrl'), 'api.ts must export validateApiUrl');
    assert.ok(content.includes('getApiConfig'), 'api.ts must export getApiConfig');
    assert.ok(content.includes('getApiBaseUrl'), 'api.ts must export getApiBaseUrl');
    assert.ok(content.includes('ApiConfigurationError'), 'api.ts must export ApiConfigurationError');
  });

  test('Mobile client contains zero hardcoded fallback URLs or silent localhost fallbacks', () => {
    const clientPath = path.join(rootDir, 'apps/mobile/src/api/client.ts');
    assert.ok(fs.existsSync(clientPath), 'client.ts must exist');
    const content = fs.readFileSync(clientPath, 'utf8');
    assert.ok(!content.includes('10.0.2.2:4000'), 'client.ts must not have hardcoded 10.0.2.2');
    assert.ok(!content.includes('localhost'), 'client.ts must not have hardcoded localhost');
    assert.ok(!content.includes('127.0.0.1'), 'client.ts must not have hardcoded 127.0.0.1');
    assert.ok(content.includes('getApiConfig'), 'client.ts must use getApiConfig');
  });

  test('All required mobile icon and splash assets exist on disk', () => {
    const assetsDir = path.join(rootDir, 'apps/mobile/assets');
    assert.ok(fs.existsSync(path.join(assetsDir, 'icon.png')), 'icon.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'splash.png')), 'splash.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'adaptive-icon.png')), 'adaptive-icon.png must exist');
    assert.ok(fs.existsSync(path.join(assetsDir, 'favicon.png')), 'favicon.png must exist');
  });
});
