import { z } from 'zod';
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
} from '@nirware/config';
import { normalizePersianText, toEnglishDigits } from '@nirware/shared';

// Helper for Persian string sanitization
export const persianString = (min = 1, max = 255) =>
  z
    .string()
    .min(min, `حداقل ${min} کاراکتر الزامی است`)
    .max(max, `حداکثر ${max} کاراکتر مجاز است`)
    .transform(normalizePersianText);

// Helper for Persian digits to standard number
export const numericInput = z
  .union([z.number(), z.string()])
  .transform((val) => {
    if (typeof val === 'number') return val;
    const eng = toEnglishDigits(val);
    const parsed = Number(eng);
    return isNaN(parsed) ? 0 : parsed;
  });

// --- Auth Schemas ---
export const loginSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
  password: z.string().min(6, 'کلمه عبور باید حداقل ۶ کاراکتر باشد'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerUserSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
  password: z.string().min(6, 'کلمه عبور باید حداقل ۶ کاراکتر باشد'),
  fullName: persianString(2, 100),
  phone: z.string().min(10, 'شماره تماس نامعتبر است'),
  role: z.enum([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SCALE_OPERATOR,
    UserRole.PRODUCTION_OPERATOR,
    UserRole.FARMER,
    UserRole.DRIVER,
  ]),
});
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// --- Farmer Schemas ---
export const createFarmerSchema = z.object({
  userId: z.string().uuid().optional(),
  fullName: persianString(2, 100),
  businessName: persianString(2, 150),
  nationalId: z.string().min(10, 'کد ملی نامعتبر است').max(11),
  mobile: z.string().min(10, 'شماره موبایل نامعتبر است'),
  address: persianString(3, 500),
  contactPerson: persianString(2, 100).optional(),
});
export type CreateFarmerInput = z.infer<typeof createFarmerSchema>;

export const updateFarmerSchema = createFarmerSchema.partial();

// --- Farm Schemas ---
export const createFarmSchema = z.object({
  farmerId: z.string().uuid('شناسه مرغدار نامعتبر است'),
  name: persianString(2, 150),
  licenseNumber: z.string().min(3, 'شماره پروانه بهره‌برداری الزامی است'),
  location: persianString(2, 200),
  totalCapacity: numericInput.pipe(z.number().positive('ظرفیت کل باید مثبت باشد')),
  address: persianString(3, 500),
});
export type CreateFarmInput = z.infer<typeof createFarmSchema>;

export const updateFarmSchema = createFarmSchema.partial();

// --- Poultry House Schemas ---
export const createPoultryHouseSchema = z.object({
  farmId: z.string().uuid('شناسه مرغداری نامعتبر است'),
  code: z.string().min(1, 'کد یا نام سالن الزامی است'),
  capacity: numericInput.pipe(z.number().positive('ظرفیت سالن باید مثبت باشد')),
  houseType: z.enum([
    PoultryHouseType.STANDARD,
    PoultryHouseType.TUNNEL,
    PoultryHouseType.CAGE,
    PoultryHouseType.FREE_RANGE,
  ]),
});
export type CreatePoultryHouseInput = z.infer<typeof createPoultryHouseSchema>;

// --- Flock Schemas ---
export const createFlockSchema = z.object({
  poultryHouseId: z.string().uuid('شناسه سالن نامعتبر است'),
  flockCode: z.string().min(2, 'کد دوره/گله الزامی است'),
  breed: persianString(2, 80),
  chickCount: numericInput.pipe(z.number().int().positive('تعداد جوجه‌ریزی باید مثبت باشد')),
  initialWeightGrams: numericInput.pipe(z.number().nonnegative()).default(42),
  startDate: z.string().min(8, 'تاریخ شروع دوره الزامی است'),
  endDate: z.string().optional(),
  status: z.enum([FlockStatus.ACTIVE, FlockStatus.CLOSED]).default(FlockStatus.ACTIVE),
  notes: z.string().optional(),
});
export type CreateFlockInput = z.infer<typeof createFlockSchema>;

export const updateFlockSchema = z.object({
  finalWeightGrams: numericInput.pipe(z.number().nonnegative()).optional(),
  mortalityCount: numericInput.pipe(z.number().int().nonnegative()).optional(),
  feedConsumedKg: numericInput.pipe(z.number().nonnegative()).optional(),
  exceptionalFeedKg: numericInput.pipe(z.number().nonnegative()).optional(),
  conversionRatio: numericInput.pipe(z.number().nonnegative()).optional(),
  endDate: z.string().optional(),
  status: z.enum([FlockStatus.ACTIVE, FlockStatus.CLOSED]).optional(),
  notes: z.string().optional(),
});
export type UpdateFlockInput = z.infer<typeof updateFlockSchema>;

// --- Daily Record Schemas ---
export const createDailyFlockRecordSchema = z.object({
  flockId: z.string().uuid('شناسه گله الزامی است'),
  recordDate: z.string().min(8, 'تاریخ ثبت روزانه الزامی است'),
  birdCount: numericInput.pipe(z.number().int().nonnegative('تعداد پرنده نامعتبر است')),
  mortalityCount: numericInput.pipe(z.number().int().nonnegative()).default(0),
  feedConsumptionKg: numericInput.pipe(z.number().nonnegative('میزان دان مصرفی نامعتبر است')),
  avgWeightGrams: numericInput.pipe(z.number().nonnegative()).default(0),
  notes: z.string().optional(),
});
export type CreateDailyFlockRecordInput = z.infer<typeof createDailyFlockRecordSchema>;

// --- Feed Quota Schemas ---
export const createFeedQuotaSchema = z.object({
  farmerId: z.string().uuid('شناسه مرغدار الزامی است'),
  flockId: z.string().uuid('شناسه گله الزامی است'),
  periodStart: z.string().min(8, 'تاریخ شروع سهمیه الزامی است'),
  periodEnd: z.string().min(8, 'تاریخ پایان سهمیه الزامی است'),
  approvedQuantityKg: numericInput.pipe(z.number().positive('مقدار سهمیه مصوب باید مثبت باشد')),
  status: z.enum([QuotaStatus.ACTIVE, QuotaStatus.SUSPENDED, QuotaStatus.EXHAUSTED]).default(QuotaStatus.ACTIVE),
  notes: z.string().optional(),
});
export type CreateFeedQuotaInput = z.infer<typeof createFeedQuotaSchema>;

// --- Product & Category Schemas ---
export const createCategorySchema = z.object({
  name: persianString(2, 100),
  code: z.string().min(2, 'کد دسته الزامی است'),
  description: z.string().optional(),
});

export const createProductSchema = z.object({
  categoryId: z.string().uuid('شناسه دسته‌بندی الزامی است'),
  name: persianString(2, 120),
  code: z.string().min(2, 'کد محصول الزامی است'),
  unit: z.enum([ProductUnit.KG, ProductUnit.TON, ProductUnit.BAG_50KG]).default(ProductUnit.KG),
  productType: z.enum([
    ProductType.RAW_MATERIAL,
    ProductType.FINISHED_FEED,
    ProductType.PREMIX,
    ProductType.MEDICINE,
  ]),
  minStockLevelKg: numericInput.pipe(z.number().nonnegative()).default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// --- Formula (BOM) Schemas ---
export const formulaItemInputSchema = z.object({
  rawMaterialProductId: z.string().uuid('شناسه ماده اولیه نامعتبر است'),
  quantityKg: numericInput.pipe(z.number().positive('وزن ماده اولیه باید مثبت باشد')),
  percentage: numericInput.pipe(z.number().positive()),
  tolerancePercentage: numericInput.pipe(z.number().nonnegative()).default(0.5),
});

export const createFormulaSchema = z.object({
  productId: z.string().uuid('شناسه محصول نهایی خوراک الزامی است'),
  code: z.string().min(2, 'کد فرمولاسیون الزامی است'),
  version: z.string().default('1.0'),
  batchSizeKg: numericInput.pipe(z.number().positive()).default(1000),
  notes: z.string().optional(),
  items: z.array(formulaItemInputSchema).min(1, 'حداقل یک قلم ماده اولیه در فرمول الزامی است'),
});
export type CreateFormulaInput = z.infer<typeof createFormulaSchema>;

// --- Feed Order Schemas ---
export const createFeedOrderSchema = z.object({
  farmerId: z.string().uuid('شناسه مرغدار الزامی است'),
  flockId: z.string().uuid('شناسه گله الزامی است'),
  quotaId: z.string().uuid('شناسه سهمیه الزامی است'),
  productId: z.string().uuid('شناسه محصول خوراک الزامی است'),
  requestedQuantityKg: numericInput.pipe(z.number().positive('مقدار خوراک درخواستی باید مثبت باشد')),
  deliveryAddress: persianString(5, 500),
  deliveryDateNeeded: z.string().min(8, 'تاریخ تحویل الزامی است'),
  notes: z.string().optional(),
});
export type CreateFeedOrderInput = z.infer<typeof createFeedOrderSchema>;

export const transitionOrderSchema = z.object({
  action: z.string().min(1, 'عملیات الزامی است'),
  targetState: z.enum([
    OrderStatus.DRAFT,
    OrderStatus.SUBMITTED,
    OrderStatus.PENDING_APPROVAL,
    OrderStatus.APPROVED,
    OrderStatus.PRODUCTION_PENDING,
    OrderStatus.READY,
    OrderStatus.ASSIGNED_TO_DRIVER,
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.DELIVERED,
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ]),
  approvedQuantityKg: numericInput.pipe(z.number().positive()).optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;

// --- Production Batch Schemas ---
export const createProductionBatchSchema = z.object({
  formulaId: z.string().uuid('شناسه فرمولاسیون الزامی است'),
  feedOrderId: z.string().uuid().optional(),
  targetQuantityKg: numericInput.pipe(z.number().positive('میزان تولید هدف باید مثبت باشد')),
  batchNumber: z.string().min(2, 'شماره بچ الزامی است'),
  notes: z.string().optional(),
});
export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>;

export const completeProductionBatchSchema = z.object({
  actualProducedQuantityKg: numericInput.pipe(z.number().positive('میزان تولید شده واقعی باید مثبت باشد')),
  notes: z.string().optional(),
});
export type CompleteProductionBatchInput = z.infer<typeof completeProductionBatchSchema>;

// --- Inbound Remittance Schemas ---
export const createInboundRemittanceSchema = z.object({
  sellerName: persianString(2, 150),
  rawMaterialProductId: z.string().uuid('شناسه ماده اولیه الزامی است'),
  billNumber: z.string().min(1, 'شماره بارنامه الزامی است'),
  originLocation: persianString(2, 150),
  invoiceWeightKg: numericInput.pipe(z.number().positive('وزن طبق فاکتور باید مثبت باشد')),
  scaleWeightKg: numericInput.pipe(z.number().positive('وزن باسکول کارخانه باید مثبت باشد')),
  transportCost: numericInput.pipe(z.number().nonnegative()).default(0),
  driverName: persianString(2, 100),
  driverPhone: z.string().min(10, 'شماره تماس راننده الزامی است'),
  driverIban: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateInboundRemittanceInput = z.infer<typeof createInboundRemittanceSchema>;

// --- Logistics & Driver Schemas ---
export const createDriverSchema = z.object({
  userId: z.string().uuid().optional(),
  fullName: persianString(2, 100),
  nationalId: z.string().min(10).max(11),
  licenseNumber: z.string().min(5, 'شماره گواهینامه الزامی است'),
  mobile: z.string().min(10, 'شماره موبایل نامعتبر است'),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const createVehicleSchema = z.object({
  driverId: z.string().uuid().optional(),
  plateNumber: z.string().min(5, 'شماره پلاک خودرو الزامی است'),
  vehicleType: persianString(2, 50),
  maxCapacityKg: numericInput.pipe(z.number().positive('ظرفیت حمل باید مثبت باشد')),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const assignDriverToDeliverySchema = z.object({
  feedOrderId: z.string().uuid('شناسه سفارش الزامی است'),
  driverId: z.string().uuid('شناسه راننده الزامی است'),
  vehicleId: z.string().uuid('شناسه خودرو الزامی است'),
  originScaleWeightKg: numericInput.pipe(z.number().positive('وزن باسکول مبدا الزامی است')),
  notes: z.string().optional(),
});
export type AssignDriverToDeliveryInput = z.infer<typeof assignDriverToDeliverySchema>;

export const verifyOtpSchema = z.object({
  deliveryId: z.string().uuid('شناسه بارنامه الزامی است'),
  otpCode: z.string().min(6).max(6, 'کد تایید ۶ رقمی است'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const confirmDeliveryReceiptSchema = z.object({
  deliveryId: z.string().uuid('شناسه بارنامه الزامی است'),
  signatureData: z.string().min(10, 'امضای دیجیتال تحویل‌گیرنده الزامی است'),
  photoData: z.string().optional(),
  otpCode: z.string().optional(),
  notes: z.string().optional(),
});
export type ConfirmDeliveryReceiptInput = z.infer<typeof confirmDeliveryReceiptSchema>;

// --- AI Assistant Query Schema ---
export const aiAssistantQuerySchema = z.object({
  prompt: z.string().min(1, 'متن سوال یا دستور الزامی است'),
});
export type AiAssistantQueryInput = z.infer<typeof aiAssistantQuerySchema>;
