import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../../packages/config/dist/index.js';
import { AuthorizationPolicy } from '../../packages/domain/dist/index.js';
import { ForbiddenError } from '../../packages/shared/dist/index.js';
import { FarmerService } from '../../apps/api/dist/services/farmer.service.js';
import { LogisticsService } from '../../apps/api/dist/services/logistics.service.js';
import { pool } from '../../apps/api/dist/db/connection.js';

describe('Authorization & Security - IDOR and RBAC Enforcement', () => {
  const farmer1User = {
    id: 'a0000000-0000-0000-0000-000000000006',
    username: 'farmer1',
    role: UserRole.FARMER,
    fullName: 'حاج مرتضی کشاورز',
    phone: '09126666666',
    isActive: true,
    farmerId: 'b0000000-0000-0000-0000-000000000001',
  };

  const farmer2Id = 'b0000000-0000-0000-0000-000000000002';

  const driver1User = {
    id: 'a0000000-0000-0000-0000-000000000008',
    username: 'driver1',
    role: UserRole.DRIVER,
    fullName: 'علی حسینی',
    phone: '09128888888',
    isActive: true,
    driverId: '60000000-0000-0000-0000-000000000001',
  };

  test('Farmer A cannot access Farmer B record (IDOR assertion throws ForbiddenError)', () => {
    assert.throws(
      () => {
        AuthorizationPolicy.assertCanAccessFarmer(farmer1User, farmer2Id);
      },
      (err) => err instanceof ForbiddenError
    );
  });

  test('Farmer A calling getFarmerById with Farmer B id is rejected with 403', async () => {
    await assert.rejects(
      async () => {
        await FarmerService.getFarmerById(farmer2Id, farmer1User);
      },
      (err) => err instanceof ForbiddenError
    );
  });

  test('Farmer A listing farmers only receives their own farmer record', async () => {
    const list = await FarmerService.listFarmers(farmer1User);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, farmer1User.farmerId);
  });

  test('Driver A cannot access Delivery assigned to Driver B', () => {
    const deliveryForDriver2 = {
      driverId: '60000000-0000-0000-0000-000000000002', // Driver 2!
      farmerId: 'b0000000-0000-0000-0000-000000000001',
    };

    assert.throws(
      () => {
        AuthorizationPolicy.assertCanAccessDelivery(driver1User, deliveryForDriver2);
      },
      (err) => err instanceof ForbiddenError
    );
  });

  after(async () => {
    await pool.end();
  });
});
