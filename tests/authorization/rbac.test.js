import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../../packages/config/dist/index.js';
import { AuthorizationPolicy } from '../../packages/domain/dist/index.js';
import { ForbiddenError } from '../../packages/shared/dist/index.js';

describe('RBAC - Role-Based Access Control Matrix Enforcement', () => {
  const superAdmin = { id: 'u-1', role: UserRole.SUPER_ADMIN, fullName: 'Super' };
  const admin = { id: 'u-2', role: UserRole.ADMIN, fullName: 'Admin' };
  const manager = { id: 'u-3', role: UserRole.MANAGER, fullName: 'Manager' };
  const productionOp = { id: 'u-4', role: UserRole.PRODUCTION_OPERATOR, fullName: 'Prod Op' };
  const scaleOp = { id: 'u-5', role: UserRole.SCALE_OPERATOR, fullName: 'Scale Op' };
  const farmer = { id: 'u-6', role: UserRole.FARMER, fullName: 'Farmer', farmerId: 'f-1' };
  const driver = { id: 'u-7', role: UserRole.DRIVER, fullName: 'Driver', driverId: 'd-1' };

  test('Super Admin, Admin, and Manager can manage company settings', () => {
    assert.doesNotThrow(() => {
      AuthorizationPolicy.assertCanManageSettings(superAdmin);
      AuthorizationPolicy.assertCanManageSettings(admin);
      AuthorizationPolicy.assertCanManageSettings(manager);
    });
  });

  test('Production Operator and Scale Operator CANNOT manage company settings', () => {
    assert.throws(
      () => AuthorizationPolicy.assertCanManageSettings(productionOp),
      (err) => err instanceof ForbiddenError
    );
    assert.throws(
      () => AuthorizationPolicy.assertCanManageSettings(scaleOp),
      (err) => err instanceof ForbiddenError
    );
  });

  test('Farmer and Driver CANNOT manage company settings', () => {
    assert.throws(
      () => AuthorizationPolicy.assertCanManageSettings(farmer),
      (err) => err instanceof ForbiddenError
    );
    assert.throws(
      () => AuthorizationPolicy.assertCanManageSettings(driver),
      (err) => err instanceof ForbiddenError
    );
  });

  test('Production Operator can record production batches', () => {
    assert.doesNotThrow(() => {
      AuthorizationPolicy.assertCanExecuteProduction(productionOp);
    });
  });

  test('Driver cannot execute production batches', () => {
    assert.throws(
      () => AuthorizationPolicy.assertCanExecuteProduction(driver),
      (err) => err instanceof ForbiddenError
    );
  });
});
