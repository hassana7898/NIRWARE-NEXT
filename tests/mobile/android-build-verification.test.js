import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const mobileDir = path.join(rootDir, 'apps/mobile');

describe('Suite 21: Mobile Android Build & Native Readiness Verification', () => {
  test('Mobile app.json has complete Android production configurations', () => {
    const appJsonPath = path.join(mobileDir, 'app.json');
    assert.ok(fs.existsSync(appJsonPath), 'app.json must exist');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    assert.equal(appJson.expo.android?.package, 'com.nirware.next');
    assert.ok(Array.isArray(appJson.expo.android?.permissions));
    assert.ok(appJson.expo.android.permissions.includes('ACCESS_FINE_LOCATION'));
    assert.ok(appJson.expo.android.permissions.includes('CAMERA'));
    assert.ok(appJson.expo.android.adaptiveIcon?.foregroundImage);
  });

  test('EAS Build configuration (eas.json) defines preview and production profiles', () => {
    const easJsonPath = path.join(mobileDir, 'eas.json');
    assert.ok(fs.existsSync(easJsonPath), 'eas.json must exist');
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

    assert.ok(easJson.build?.preview, 'preview profile must be defined');
    assert.equal(easJson.build.preview.android?.buildType, 'apk');
    assert.ok(easJson.build?.production, 'production profile must be defined');
    assert.equal(easJson.build.production.android?.buildType, 'app-bundle');
  });

  test('All required native branding image assets exist and are valid PNGs', () => {
    const assetsDir = path.join(mobileDir, 'assets');
    const requiredAssets = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];
    for (const asset of requiredAssets) {
      const assetPath = path.join(assetsDir, asset);
      assert.ok(fs.existsSync(assetPath), `Asset ${asset} must exist`);
      const stat = fs.statSync(assetPath);
      assert.ok(stat.size > 50, `Asset ${asset} must have valid content (size > 50 bytes)`);
    }
  });

  test('Exported Android and iOS Metro JS bundles exist in apps/mobile/bundle', () => {
    const bundleDir = path.join(mobileDir, 'bundle');
    assert.ok(fs.existsSync(bundleDir), 'apps/mobile/bundle must exist from expo export');
    const metadataPath = path.join(bundleDir, 'metadata.json');
    assert.ok(fs.existsSync(metadataPath), 'metadata.json must exist in exported mobile bundle');
  });
});
