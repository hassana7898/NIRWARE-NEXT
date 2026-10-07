import { UserRole, OrderStatus, DeliveryStatus } from '@nirware/config';

export interface MobileUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  farmerId?: string | null;
  driverId?: string | null;
}

export interface MobileOrder {
  id: string;
  orderNumber: string;
  productName: string;
  requestedQuantityKg: number;
  approvedQuantityKg?: number;
  status: OrderStatus;
  deliveryDateNeeded: string;
  deliveryAddress: string;
  createdAt: string;
}

export interface MobileDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  farmerName: string;
  farmerPhone: string;
  destinationAddress: string;
  productName: string;
  weightKg: number;
  status: DeliveryStatus;
  driverName?: string;
  driverPhone?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}
