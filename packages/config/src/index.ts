/**
 * NIRWARE NEXT - Core System Configuration & Enumerations
 */

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SCALE_OPERATOR: 'SCALE_OPERATOR',
  PRODUCTION_OPERATOR: 'PRODUCTION_OPERATOR',
  FARMER: 'FARMER',
  DRIVER: 'DRIVER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ALL_ROLES = Object.values(UserRole);

export const OrderStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PRODUCTION_PENDING: 'PRODUCTION_PENDING',
  READY: 'READY',
  ASSIGNED_TO_DRIVER: 'ASSIGNED_TO_DRIVER',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DeliveryStatus = {
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const InventoryTransactionType = {
  OPENING: 'OPENING',
  INBOUND: 'INBOUND',
  PRODUCTION_IN: 'PRODUCTION_IN',
  OUTBOUND: 'OUTBOUND',
  CONSUMPTION_OUT: 'CONSUMPTION_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  REVERSAL: 'REVERSAL',
} as const;

export type InventoryTransactionType =
  (typeof InventoryTransactionType)[keyof typeof InventoryTransactionType];

export const InventoryReferenceType = {
  INBOUND_REMITTANCE: 'INBOUND_REMITTANCE',
  PRODUCTION_BATCH: 'PRODUCTION_BATCH',
  FEED_ORDER: 'FEED_ORDER',
  OUTBOUND_REMITTANCE: 'OUTBOUND_REMITTANCE',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  REVERSAL: 'REVERSAL',
} as const;

export type InventoryReferenceType =
  (typeof InventoryReferenceType)[keyof typeof InventoryReferenceType];

export const ProductType = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  FINISHED_FEED: 'FINISHED_FEED',
  PREMIX: 'PREMIX',
  MEDICINE: 'MEDICINE',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const ProductUnit = {
  KG: 'KG',
  TON: 'TON',
  BAG_50KG: 'BAG_50KG',
} as const;

export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

export const FlockStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;

export type FlockStatus = (typeof FlockStatus)[keyof typeof FlockStatus];

export const PoultryHouseType = {
  STANDARD: 'STANDARD',
  TUNNEL: 'TUNNEL',
  CAGE: 'CAGE',
  FREE_RANGE: 'FREE_RANGE',
} as const;

export type PoultryHouseType = (typeof PoultryHouseType)[keyof typeof PoultryHouseType];

export const QuotaStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXHAUSTED: 'EXHAUSTED',
} as const;

export type QuotaStatus = (typeof QuotaStatus)[keyof typeof QuotaStatus];

export const ProductionBatchStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ProductionBatchStatus =
  (typeof ProductionBatchStatus)[keyof typeof ProductionBatchStatus];

export const InboundRemittanceStatus = {
  PENDING_SCALE: 'PENDING_SCALE',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const;

export type InboundRemittanceStatus =
  (typeof InboundRemittanceStatus)[keyof typeof InboundRemittanceStatus];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  TRANSITION: 'TRANSITION',
  DISPATCH: 'DISPATCH',
  CONFIRM_OTP: 'CONFIRM_OTP',
  EXPORT_EXCEL: 'EXPORT_EXCEL',
  IMPORT_EXCEL: 'IMPORT_EXCEL',
  AI_TOOL_CALL: 'AI_TOOL_CALL',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const SYSTEM_CONSTANTS = {
  BASE_FORMULA_BATCH_SIZE_KG: 1000,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 3,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PORT: 4000,
  API_PREFIX: '/api/v1',
} as const;
