/**
 * Object-Level Authorization & RBAC Rules
 * Enforces strict boundary between farmers, drivers, and factory staff.
 */

import { UserRole } from '@nirware/config';
import { ForbiddenError } from '@nirware/shared';

export interface AuthUser {
  id: string;
  role: UserRole;
  farmerId?: string | null;
  driverId?: string | null;
}

export class AuthorizationPolicy {
  /**
   * Super Admins and Admins have unrestricted factory access
   */
  public static isAdminOrManager(user: AuthUser): boolean {
    return ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] as UserRole[]).includes(user.role);
  }

  /**
   * Validates access to a Farmer record and its children (Farms, Houses, Flocks)
   */
  public static canAccessFarmer(user: AuthUser, targetFarmerId: string): boolean {
    if (this.isAdminOrManager(user)) return true;
    if (user.role === UserRole.SCALE_OPERATOR || user.role === UserRole.PRODUCTION_OPERATOR) {
      return true; // Operators can view farmer names for logistics/orders
    }
    if (user.role === UserRole.FARMER) {
      return user.farmerId === targetFarmerId;
    }
    return false;
  }

  /**
   * Asserts access to a Farmer record or throws ForbiddenError
   */
  public static assertCanAccessFarmer(user: AuthUser, targetFarmerId: string): void {
    if (!this.canAccessFarmer(user, targetFarmerId)) {
      throw new ForbiddenError('شما دسترسی مشاهده یا ویرایش اطلاعات این مرغدار را ندارید');
    }
  }

  /**
   * Validates access to an Order
   */
  public static canAccessOrder(user: AuthUser, orderFarmerId: string): boolean {
    if (this.isAdminOrManager(user)) return true;
    if (user.role === UserRole.PRODUCTION_OPERATOR || user.role === UserRole.SCALE_OPERATOR) {
      return true;
    }
    if (user.role === UserRole.FARMER) {
      return user.farmerId === orderFarmerId;
    }
    return false;
  }

  public static assertCanAccessOrder(user: AuthUser, orderFarmerId: string): void {
    if (!this.canAccessOrder(user, orderFarmerId)) {
      throw new ForbiddenError('شما دسترسی لازم برای این سفارش را ندارید');
    }
  }

  /**
   * Validates access to Delivery / Waybill
   */
  public static canAccessDelivery(
    user: AuthUser,
    delivery: { driverId?: string | null; farmerId?: string | null }
  ): boolean {
    if (this.isAdminOrManager(user) || user.role === UserRole.SCALE_OPERATOR) return true;
    if (user.role === UserRole.DRIVER) {
      return !!user.driverId && user.driverId === delivery.driverId;
    }
    if (user.role === UserRole.FARMER) {
      return !!user.farmerId && user.farmerId === delivery.farmerId;
    }
    return false;
  }

  public static assertCanAccessDelivery(
    user: AuthUser,
    delivery: { driverId?: string | null; farmerId?: string | null }
  ): void {
    if (!this.canAccessDelivery(user, delivery)) {
      throw new ForbiddenError('شما مجاز به دسترسی به این محموله یا بارنامه نیستید');
    }
  }
}
