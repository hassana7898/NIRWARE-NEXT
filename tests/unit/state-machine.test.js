import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStatus, DeliveryStatus, UserRole } from '../../packages/config/dist/index.js';
import { OrderStateMachine, DeliveryStateMachine } from '../../packages/domain/dist/index.js';
import { InvalidStateTransitionError, ForbiddenError } from '../../packages/shared/dist/index.js';

describe('Domain - Order & Delivery State Machine', () => {
  test('Farmer can submit DRAFT order owned by them', () => {
    const rule = OrderStateMachine.validateTransition(
      OrderStatus.DRAFT,
      OrderStatus.SUBMITTED,
      {
        userId: 'u1',
        role: UserRole.FARMER,
        farmerId: 'farmer-100',
        orderFarmerId: 'farmer-100',
      }
    );
    assert.equal(rule.action, 'SUBMIT_ORDER');
    assert.equal(rule.to, OrderStatus.SUBMITTED);
  });

  test('Farmer CANNOT submit order belonging to another farmer (IDOR prevention)', () => {
    assert.throws(
      () => {
        OrderStateMachine.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.SUBMITTED,
          {
            userId: 'u1',
            role: UserRole.FARMER,
            farmerId: 'farmer-100',
            orderFarmerId: 'farmer-200', // Different farmer!
          }
        );
      },
      (err) => err instanceof ForbiddenError
    );
  });

  test('Driver cannot approve orders', () => {
    assert.throws(
      () => {
        OrderStateMachine.validateTransition(
          OrderStatus.PENDING_APPROVAL,
          OrderStatus.APPROVED,
          {
            userId: 'u2',
            role: UserRole.DRIVER,
          }
        );
      },
      (err) => err instanceof ForbiddenError
    );
  });

  test('Manager can approve PENDING_APPROVAL order', () => {
    const rule = OrderStateMachine.validateTransition(
      OrderStatus.PENDING_APPROVAL,
      OrderStatus.APPROVED,
      {
        userId: 'u3',
        role: UserRole.MANAGER,
      }
    );
    assert.equal(rule.action, 'APPROVE_ORDER');
  });

  test('Rejects invalid arbitrary transition (e.g. DRAFT to DELIVERED)', () => {
    assert.throws(
      () => {
        OrderStateMachine.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.DELIVERED,
          {
            userId: 'u3',
            role: UserRole.MANAGER,
          }
        );
      },
      (err) => err instanceof InvalidStateTransitionError
    );
  });

  test('Delivery state machine transitions correctly', () => {
    const pickup = DeliveryStateMachine.validateTransition(
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.PICKED_UP,
      {
        userId: 'drv-1',
        role: UserRole.DRIVER,
        driverId: 'drv-1',
        deliveryDriverId: 'drv-1',
      }
    );
    assert.equal(pickup.action, 'DRIVER_PICKUP');

    const transit = DeliveryStateMachine.validateTransition(
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      {
        userId: 'drv-1',
        role: UserRole.DRIVER,
        driverId: 'drv-1',
        deliveryDriverId: 'drv-1',
      }
    );
    assert.equal(transit.action, 'DRIVER_START_TRANSIT');
  });
});
