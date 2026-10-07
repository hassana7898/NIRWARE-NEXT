/**
 * Data Transfer Objects (DTO) and API Endpoint Contracts
 */

import {
  UserRole,
  OrderStatus,
  DeliveryStatus,
  ProductType,
  ProductUnit,
  FlockStatus,
  PoultryHouseType,
  QuotaStatus,
  ProductionBatchStatus,
  InventoryTransactionType,
  InventoryReferenceType,
} from '@nirware/config';
import { ApiResponse, PaginationMeta } from '@nirware/shared';
import * as V from '@nirware/validation';

export * from '@nirware/validation';

// User & Auth DTOs
export interface UserDto {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthSessionDto {
  user: UserDto;
  token: string;
  farmerId?: string | null;
  driverId?: string | null;
  expiresAt: string;
}

// Farmer DTOs
export interface FarmerDto {
  id: string;
  userId?: string | null;
  fullName: string;
  businessName: string;
  nationalId: string;
  mobile: string;
  address: string;
  contactPerson?: string | null;
  status: string;
  createdAt: string;
  farmsCount?: number;
}

export interface FarmDto {
  id: string;
  farmerId: string;
  farmerName?: string;
  name: string;
  licenseNumber: string;
  location: string;
  totalCapacity: number;
  address: string;
  createdAt: string;
  housesCount?: number;
}

export interface PoultryHouseDto {
  id: string;
  farmId: string;
  code: string;
  capacity: number;
  houseType: PoultryHouseType;
  createdAt: string;
}

export interface FlockDto {
  id: string;
  poultryHouseId: string;
  houseCode?: string;
  farmName?: string;
  flockCode: string;
  breed: string;
  chickCount: number;
  initialWeightGrams: number;
  finalWeightGrams: number;
  mortalityCount: number;
  feedConsumedKg: number;
  exceptionalFeedKg: number;
  conversionRatio: number;
  startDate: string;
  endDate?: string | null;
  status: FlockStatus;
  notes?: string | null;
  createdAt: string;
}

export interface DailyFlockRecordDto {
  id: string;
  flockId: string;
  recordDate: string;
  birdCount: number;
  mortalityCount: number;
  feedConsumptionKg: number;
  avgWeightGrams: number;
  notes?: string | null;
  createdAt: string;
}

export interface FeedQuotaDto {
  id: string;
  farmerId: string;
  farmerName?: string;
  flockId: string;
  flockCode?: string;
  approvedQuantityKg: number;
  usedQuantityKg: number;
  remainingQuantityKg: number;
  periodStart: string;
  periodEnd: string;
  status: QuotaStatus;
  createdAt: string;
}

// Product & BOM DTOs
export interface ProductCategoryDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  code: string;
  unit: ProductUnit;
  productType: ProductType;
  minStockLevelKg: number;
  currentStockKg: number;
  createdAt: string;
}

export interface FormulaItemDto {
  id: string;
  formulaId: string;
  rawMaterialProductId: string;
  rawMaterialProductName?: string;
  quantityKg: number;
  percentage: number;
  tolerancePercentage: number;
}

export interface FormulaDto {
  id: string;
  productId: string;
  productName?: string;
  code: string;
  version: string;
  batchSizeKg: number;
  isActive: boolean;
  notes?: string | null;
  items: FormulaItemDto[];
  createdAt: string;
}

// Order & Production DTOs
export interface FeedOrderDto {
  id: string;
  orderNumber: string;
  farmerId: string;
  farmerName?: string;
  flockId: string;
  flockCode?: string;
  quotaId: string;
  productId: string;
  productName?: string;
  requestedQuantityKg: number;
  approvedQuantityKg: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryDateNeeded: string;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  deliveryId?: string | null;
}

export interface ProductionBatchDto {
  id: string;
  batchNumber: string;
  formulaId: string;
  formulaCode?: string;
  productName?: string;
  feedOrderId?: string | null;
  orderNumber?: string | null;
  targetQuantityKg: number;
  actualProducedQuantityKg: number;
  status: ProductionBatchStatus;
  operatorId?: string | null;
  operatorName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

// Inventory Ledger DTOs
export interface InventoryLedgerDto {
  id: string;
  productId: string;
  productName?: string;
  transactionType: InventoryTransactionType;
  quantityDeltaKg: number;
  runningBalanceKg: number;
  referenceType: InventoryReferenceType;
  referenceId: string;
  notes?: string | null;
  createdAt: string;
}

// Logistics DTOs
export interface DriverDto {
  id: string;
  userId?: string | null;
  fullName: string;
  nationalId: string;
  licenseNumber: string;
  mobile: string;
  status: string;
  createdAt: string;
}

export interface VehicleDto {
  id: string;
  driverId?: string | null;
  driverName?: string | null;
  plateNumber: string;
  vehicleType: string;
  maxCapacityKg: number;
  status: string;
  createdAt: string;
}

export interface DeliveryDto {
  id: string;
  deliveryNumber: string;
  feedOrderId: string;
  orderNumber?: string;
  driverId: string;
  driverName?: string;
  driverMobile?: string;
  vehicleId: string;
  plateNumber?: string;
  farmerId?: string;
  farmerName?: string;
  status: DeliveryStatus;
  originScaleWeightKg: number;
  destinationScaleWeightKg?: number | null;
  signatureData?: string | null;
  photoUrl?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InboundRemittanceDto {
  id: string;
  remittanceNumber: string;
  sellerName: string;
  rawMaterialProductId: string;
  rawMaterialProductName?: string;
  billNumber: string;
  originLocation: string;
  invoiceWeightKg: number;
  scaleWeightKg: number;
  shortageKg: number;
  wastageKg: number;
  transportCost: number;
  driverName: string;
  driverPhone: string;
  driverIban?: string | null;
  scaleOperatorId?: string | null;
  scaleOperatorName?: string | null;
  receivedAt: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface OutboundRemittanceDto {
  id: string;
  remittanceNumber: string;
  deliveryId: string;
  deliveryNumber?: string;
  feedOrderId: string;
  orderNumber?: string;
  productId: string;
  productName?: string;
  dispatchedWeightKg: number;
  scaleOperatorId?: string | null;
  dispatchedAt: string;
  notes?: string | null;
  createdAt: string;
}

// Audit Log DTO
export interface AuditLogDto {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
  ipAddress?: string | null;
  requestId?: string | null;
  createdAt: string;
}

// Dashboard KPI Metrics DTO
export interface DashboardKpiDto {
  activeFarmersCount: number;
  activeFlocksCount: number;
  pendingOrdersCount: number;
  inProductionBatchesCount: number;
  activeDeliveriesCount: number;
  totalFinishedFeedStockKg: number;
  totalRawMaterialsStockKg: number;
  lowStockItemsCount: number;
  recentOrders: FeedOrderDto[];
  recentBatches: ProductionBatchDto[];
  recentLedgerEntries: InventoryLedgerDto[];
}
