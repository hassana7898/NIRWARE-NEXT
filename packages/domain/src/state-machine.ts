/**
 * Central State Machine for Orders and Deliveries.
 * Single source of truth for valid state transitions, role authorizations,
 * and business validations across backend, web, and mobile.
 */

import { OrderStatus, DeliveryStatus, UserRole } from '@nirware/config';
import { InvalidStateTransitionError, ForbiddenError } from '@nirware/shared';

export interface TransitionContext {
  userId: string;
  role: UserRole;
  farmerId?: string | null;
  driverId?: string | null;
  orderFarmerId?: string;
  deliveryDriverId?: string;
  reason?: string;
}

export interface TransitionRule<TState> {
  from: TState;
  to: TState;
  action: string;
  allowedRoles: UserRole[];
  requiresOwnership?: 'farmer' | 'driver';
  validate?: (context: TransitionContext) => void;
}

export const ORDER_TRANSITION_RULES: TransitionRule<OrderStatus>[] = [
  // DRAFT -> SUBMITTED
  {
    from: OrderStatus.DRAFT,
    to: OrderStatus.SUBMITTED,
    action: 'SUBMIT_ORDER',
    allowedRoles: [UserRole.FARMER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'farmer',
  },
  // DRAFT -> CANCELLED
  {
    from: OrderStatus.DRAFT,
    to: OrderStatus.CANCELLED,
    action: 'CANCEL_ORDER',
    allowedRoles: [UserRole.FARMER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'farmer',
  },
  // SUBMITTED -> PENDING_APPROVAL
  {
    from: OrderStatus.SUBMITTED,
    to: OrderStatus.PENDING_APPROVAL,
    action: 'PROCESS_FOR_APPROVAL',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // SUBMITTED -> CANCELLED
  {
    from: OrderStatus.SUBMITTED,
    to: OrderStatus.CANCELLED,
    action: 'CANCEL_ORDER',
    allowedRoles: [UserRole.FARMER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'farmer',
  },
  // PENDING_APPROVAL -> APPROVED
  {
    from: OrderStatus.PENDING_APPROVAL,
    to: OrderStatus.APPROVED,
    action: 'APPROVE_ORDER',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // PENDING_APPROVAL -> REJECTED
  {
    from: OrderStatus.PENDING_APPROVAL,
    to: OrderStatus.REJECTED,
    action: 'REJECT_ORDER',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // APPROVED -> PRODUCTION_PENDING
  {
    from: OrderStatus.APPROVED,
    to: OrderStatus.PRODUCTION_PENDING,
    action: 'QUEUE_PRODUCTION',
    allowedRoles: [
      UserRole.PRODUCTION_OPERATOR,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ],
  },
  // APPROVED -> READY (Directly if finished stock available)
  {
    from: OrderStatus.APPROVED,
    to: OrderStatus.READY,
    action: 'FULFILL_FROM_STOCK',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // PRODUCTION_PENDING -> READY
  {
    from: OrderStatus.PRODUCTION_PENDING,
    to: OrderStatus.READY,
    action: 'COMPLETE_PRODUCTION',
    allowedRoles: [
      UserRole.PRODUCTION_OPERATOR,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ],
  },
  // READY -> ASSIGNED_TO_DRIVER
  {
    from: OrderStatus.READY,
    to: OrderStatus.ASSIGNED_TO_DRIVER,
    action: 'ASSIGN_DRIVER',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // ASSIGNED_TO_DRIVER -> PICKED_UP
  {
    from: OrderStatus.ASSIGNED_TO_DRIVER,
    to: OrderStatus.PICKED_UP,
    action: 'PICKUP_ORDER',
    allowedRoles: [
      UserRole.DRIVER,
      UserRole.SCALE_OPERATOR,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ],
    requiresOwnership: 'driver',
  },
  // PICKED_UP -> IN_TRANSIT
  {
    from: OrderStatus.PICKED_UP,
    to: OrderStatus.IN_TRANSIT,
    action: 'START_TRANSIT',
    allowedRoles: [UserRole.DRIVER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'driver',
  },
  // IN_TRANSIT -> DELIVERED
  {
    from: OrderStatus.IN_TRANSIT,
    to: OrderStatus.DELIVERED,
    action: 'ARRIVE_DELIVERY',
    allowedRoles: [UserRole.DRIVER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'driver',
  },
  // DELIVERED -> CONFIRMED
  {
    from: OrderStatus.DELIVERED,
    to: OrderStatus.CONFIRMED,
    action: 'CONFIRM_DELIVERY',
    allowedRoles: [UserRole.FARMER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'farmer',
  },
  // Pre-dispatch cancellation by Manager/Admin
  {
    from: OrderStatus.APPROVED,
    to: OrderStatus.CANCELLED,
    action: 'CANCEL_ORDER',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
];

export const DELIVERY_TRANSITION_RULES: TransitionRule<DeliveryStatus>[] = [
  {
    from: DeliveryStatus.ASSIGNED,
    to: DeliveryStatus.PICKED_UP,
    action: 'DRIVER_PICKUP',
    allowedRoles: [
      UserRole.DRIVER,
      UserRole.SCALE_OPERATOR,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ],
    requiresOwnership: 'driver',
  },
  {
    from: DeliveryStatus.PICKED_UP,
    to: DeliveryStatus.IN_TRANSIT,
    action: 'DRIVER_START_TRANSIT',
    allowedRoles: [UserRole.DRIVER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'driver',
  },
  {
    from: DeliveryStatus.IN_TRANSIT,
    to: DeliveryStatus.DELIVERED,
    action: 'DRIVER_ARRIVE',
    allowedRoles: [UserRole.DRIVER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    requiresOwnership: 'driver',
  },
  {
    from: DeliveryStatus.DELIVERED,
    to: DeliveryStatus.CONFIRMED,
    action: 'CONFIRM_DELIVERY_RECEIPT',
    allowedRoles: [UserRole.FARMER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DeliveryStatus.ASSIGNED,
    to: DeliveryStatus.CANCELLED,
    action: 'CANCEL_DELIVERY',
    allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
];

export class OrderStateMachine {
  /**
   * Validates if transition from currentState to targetState is permitted
   * and if the context actor is authorized to perform it.
   */
  public static validateTransition(
    currentState: OrderStatus,
    targetState: OrderStatus,
    context: TransitionContext
  ): TransitionRule<OrderStatus> {
    const rule = ORDER_TRANSITION_RULES.find(
      (r) => r.from === currentState && r.to === targetState
    );

    if (!rule) {
      throw new InvalidStateTransitionError(
        currentState,
        targetState,
        `مسیر انتقال مجاز برای وضعیت فعلی وجود ندارد`
      );
    }

    // Role check
    if (!rule.allowedRoles.includes(context.role)) {
      throw new ForbiddenError(
        `نقش ${context.role} مجاز به تغییر وضعیت از ${currentState} به ${targetState} نیست`
      );
    }

    // Object Ownership verification
    if (context.role === UserRole.FARMER && rule.requiresOwnership === 'farmer') {
      if (context.farmerId && context.orderFarmerId && context.farmerId !== context.orderFarmerId) {
        throw new ForbiddenError('مرغدار فقط مجاز به ویرایش و تایید سفارش‌های متعلق به خود است');
      }
    }

    if (context.role === UserRole.DRIVER && rule.requiresOwnership === 'driver') {
      if (
        context.driverId &&
        context.deliveryDriverId &&
        context.driverId !== context.deliveryDriverId
      ) {
        throw new ForbiddenError('راننده فقط مجاز به عملیات روی ماموریت‌های محول شده به خود است');
      }
    }

    if (rule.validate) {
      rule.validate(context);
    }

    return rule;
  }

  /**
   * Returns list of valid next states from the given state for a user
   */
  public static getNextAllowedStates(
    currentState: OrderStatus,
    context: { role: UserRole; isOwner?: boolean }
  ): OrderStatus[] {
    return ORDER_TRANSITION_RULES.filter((rule) => {
      if (rule.from !== currentState) return false;
      if (!rule.allowedRoles.includes(context.role)) return false;
      return true;
    }).map((r) => r.to);
  }
}

export class DeliveryStateMachine {
  public static validateTransition(
    currentState: DeliveryStatus,
    targetState: DeliveryStatus,
    context: TransitionContext
  ): TransitionRule<DeliveryStatus> {
    const rule = DELIVERY_TRANSITION_RULES.find(
      (r) => r.from === currentState && r.to === targetState
    );

    if (!rule) {
      throw new InvalidStateTransitionError(
        currentState,
        targetState,
        `مسیر انتقال مجاز برای این وضعیت تحویل وجود ندارد`
      );
    }

    if (!rule.allowedRoles.includes(context.role)) {
      throw new ForbiddenError(
        `نقش ${context.role} مجاز به این تغییر وضعیت تحویل نیست`
      );
    }

    if (context.role === UserRole.DRIVER && rule.requiresOwnership === 'driver') {
      if (
        context.driverId &&
        context.deliveryDriverId &&
        context.driverId !== context.deliveryDriverId
      ) {
        throw new ForbiddenError('راننده فقط مجاز به به‌روزرسانی محموله اختصاص یافته به خود است');
      }
    }

    return rule;
  }
}
