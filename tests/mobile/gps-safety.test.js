import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LocationService } from '../../apps/mobile/dist/services/location.service.js';

describe('GPS Failure Safety - Zero Fake Coordinates in Production', () => {
  test('LocationService.getCurrentLocation() returns null without hardware GPS (Zero Fake Coordinates)', async () => {
    const coords = await LocationService.getCurrentLocation();
    // In headless / Node test runner, hardware GPS is unavailable
    // MUST return null, NEVER fake coordinates 36.8456 or 54.4392
    assert.equal(coords, null, 'Hardware GPS unavailable must return null, never fake coordinates');
  });

  test('LocationService.requestPermission() fails safely to false in headless environment', async () => {
    const hasPermission = await LocationService.requestPermission();
    // Headless environment must safely return false
    assert.equal(hasPermission, false, 'Permission request must return false when module unavailable');
  });
});
