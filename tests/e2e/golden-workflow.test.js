import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole, OrderStatus, DeliveryStatus } from '../../packages/config/dist/index.js';
import { FarmerService } from '../../apps/api/dist/services/farmer.service.js';
import { OrderService } from '../../apps/api/dist/services/order.service.js';
import { ProductionService } from '../../apps/api/dist/services/production.service.js';
import { LogisticsService } from '../../apps/api/dist/services/logistics.service.js';
import { InventoryService } from '../../apps/api/dist/services/inventory.service.js';
import { ReportService } from '../../apps/api/dist/services/report.service.js';
import { queryOne, pool } from '../../apps/api/dist/db/connection.js';

describe('Golden E2E Workflow - Complete Factory-To-Farmer Lifecycle', () => {
  const adminActor = {
    id: 'a0000000-0000-0000-0000-000000000002',
    username: 'admin',
    role: UserRole.ADMIN,
    fullName: 'مدیر سیستم',
    phone: '09122222222',
    isActive: true,
  };

  const managerActor = {
    id: 'a0000000-0000-0000-0000-000000000003',
    username: 'manager',
    role: UserRole.MANAGER,
    fullName: 'مهندس صمدی (مدیر کارخانه)',
    phone: '09123333333',
    isActive: true,
  };

  const driverActor = {
    id: 'a0000000-0000-0000-0000-000000000008',
    username: 'driver1',
    role: UserRole.DRIVER,
    fullName: 'علی حسینی',
    phone: '09128888888',
    isActive: true,
    driverId: '60000000-0000-0000-0000-000000000001',
  };

  let farmerId = '';
  let farmId = '';
  let houseId = '';
  let flockId = '';
  let quotaId = '';
  let orderId = '';
  let deliveryId = '';
  const formulaId = '30000000-0000-0000-0000-000000000001';
  const finishedProductId = '20000000-0000-0000-0000-000000000009'; // FG-FEED-GROWER
  const orderQuantityKg = 5000;

  test('Step 1: Create Farmer', async () => {
    const timestamp = Date.now();
    const farmer = await FarmerService.createFarmer(
      {
        fullName: 'مرتضی مرغدار طلایی',
        businessName: 'پرورش طیور طلایی البرز',
        nationalId: `00${String(timestamp).slice(-8)}`,
        mobile: '09120001122',
        address: 'قزوین، دشت قزوین، بعد از پل پناهی',
        contactPerson: 'مرتضی طلایی',
      },
      adminActor
    );
    assert.ok(farmer.id);
    farmerId = farmer.id;
  });

  test('Step 2: Create Farm', async () => {
    const farm = await FarmerService.createFarm(
      {
        farmerId,
        name: 'مزرعه طلایی شماره ۱',
        licenseNumber: `LIC-GOLD-${Date.now()}`,
        location: 'قزوین - آبیک',
        totalCapacity: 40000,
        address: 'آبیک، کیلومتر ۲ جاده خاکعلی',
      },
      adminActor
    );
    assert.ok(farm.id);
    farmId = farm.id;
  });

  test('Step 3: Create Poultry House', async () => {
    const house = await FarmerService.createHouse(
      {
        farmId,
        code: 'سالن طلایی ۱',
        capacity: 20000,
        houseType: 'TUNNEL',
      },
      adminActor
    );
    assert.ok(house.id);
    houseId = house.id;
  });

  test('Step 4: Create Flock', async () => {
    const today = new Date();
    const startDate = new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10);
    const flock = await FarmerService.createFlock(
      {
        poultryHouseId: houseId,
        flockCode: `FL-GOLD-${Date.now()}`,
        breed: 'راس ۳۰۸',
        chickCount: 19500,
        initialWeightGrams: 42,
        startDate,
      },
      adminActor
    );
    assert.ok(flock.id);
    flockId = flock.id;
  });

  test('Step 5: Create Daily Record', async () => {
    const recordDate = new Date().toISOString().slice(0, 10);
    const record = await FarmerService.createDailyRecord(
      {
        flockId,
        recordDate,
        birdCount: 19480,
        mortalityCount: 20,
        feedConsumptionKg: 850,
        avgWeightGrams: 160,
        notes: 'اشتهای پرندگان عالی، سیستم تهویه خودکار در دمای ۲۸ درجه فعال',
      },
      adminActor
    );
    assert.ok(record.id);
  });

  test('Step 6: Create Feed Quota', async () => {
    const today = new Date();
    const periodStart = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const periodEnd = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10);
    const quota = await FarmerService.createQuota(
      {
        farmerId,
        flockId,
        periodStart,
        periodEnd,
        approvedQuantityKg: 30000,
        notes: 'سهمیه رسمی پاییزه مصوب جهاد کشاورزی',
      },
      adminActor
    );
    assert.ok(quota.id);
    quotaId = quota.id;
  });

  test('Step 7: Create Feed Order (DRAFT/SUBMITTED)', async () => {
    const farmerActor = {
      ...adminActor,
      role: UserRole.FARMER,
      farmerId,
    };
    const deliveryDateNeeded = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

    const order = await OrderService.createOrder(
      {
        farmerId,
        flockId,
        quotaId,
        productId: finishedProductId,
        requestedQuantityKg: orderQuantityKg,
        deliveryAddress: 'آبیک، کیلومتر ۲ جاده خاکعلی، مزرعه طلایی شماره ۱',
        deliveryDateNeeded,
        notes: 'نیاز فوری به دان میان‌دان پلت ۲.۸ میل',
      },
      farmerActor
    );
    assert.ok(order.id);
    assert.equal(order.status, OrderStatus.SUBMITTED);
    orderId = order.id;
  });

  test('Step 8: Approve Order by Factory Manager', async () => {
    // 8a. Transition to PENDING_APPROVAL
    const inProcess = await OrderService.transitionOrder(
      orderId,
      {
        action: 'PROCESS_FOR_APPROVAL',
        targetState: OrderStatus.PENDING_APPROVAL,
      },
      managerActor
    );
    assert.equal(inProcess.status, OrderStatus.PENDING_APPROVAL);

    // 8b. Approve order
    const approved = await OrderService.transitionOrder(
      orderId,
      {
        action: 'APPROVE_ORDER',
        targetState: OrderStatus.APPROVED,
        approvedQuantityKg: orderQuantityKg,
      },
      managerActor
    );
    assert.equal(approved.status, OrderStatus.APPROVED);
    assert.equal(Number(approved.approved_quantity_kg), orderQuantityKg);

    // Verify quota used quantity was deducted
    const quota = await queryOne('SELECT * FROM feed_quotas WHERE id = $1', [quotaId]);
    assert.equal(Number(quota.used_quantity_kg), orderQuantityKg);
  });

  test('Step 9: Execute Production Batch to manufacture feed', async () => {
    const finishedStockBefore = await InventoryService.getProductStock(finishedProductId);

    const batch = await ProductionService.executeBatch(
      {
        formulaId,
        feedOrderId: orderId,
        targetQuantityKg: orderQuantityKg,
        batchNumber: `BATCH-GOLD-${Date.now()}`,
        notes: 'بچ تولید سفارشی برای سفارش طلایی',
      },
      adminActor
    );
    assert.ok(batch.id);

    const finishedStockAfter = await InventoryService.getProductStock(finishedProductId);
    assert.equal(finishedStockAfter, finishedStockBefore + orderQuantityKg);
  });

  test('Step 10: Assign Driver & Vehicle to Order (Logistics)', async () => {
    const delivery = await LogisticsService.assignDriver(
      {
        feedOrderId: orderId,
        driverId: driverActor.driverId,
        vehicleId: '70000000-0000-0000-0000-000000000001',
        originScaleWeightKg: orderQuantityKg,
        notes: 'بارگیری با باسکول ۶۰ تنی کارخانه',
      },
      managerActor
    );
    assert.ok(delivery.id);
    assert.equal(delivery.status, DeliveryStatus.ASSIGNED);
    deliveryId = delivery.id;

    // Check order state moved to ASSIGNED_TO_DRIVER
    const order = await queryOne('SELECT status FROM feed_orders WHERE id = $1', [orderId]);
    assert.equal(order.status, OrderStatus.ASSIGNED_TO_DRIVER);
  });

  test('Step 11: Driver Pick-Up from Factory (Outbound Ledger update)', async () => {
    const finishedStockBefore = await InventoryService.getProductStock(finishedProductId);

    const delivery = await LogisticsService.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.PICKED_UP,
      driverActor
    );
    assert.equal(delivery.status, DeliveryStatus.PICKED_UP);

    // Outbound remittance must have been generated and finished stock deducted!
    const outbound = await queryOne(
      'SELECT * FROM outbound_remittances WHERE delivery_id = $1',
      [deliveryId]
    );
    assert.ok(outbound);
    assert.equal(Number(outbound.dispatched_weight_kg), orderQuantityKg);

    const finishedStockAfter = await InventoryService.getProductStock(finishedProductId);
    assert.equal(finishedStockAfter, finishedStockBefore - orderQuantityKg);
  });

  test('Step 12: Driver Starts Transit and Arrives at Farm', async () => {
    const inTransit = await LogisticsService.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.IN_TRANSIT,
      driverActor
    );
    assert.equal(inTransit.status, DeliveryStatus.IN_TRANSIT);

    const arrived = await LogisticsService.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.DELIVERED,
      driverActor
    );
    assert.equal(arrived.status, DeliveryStatus.DELIVERED);
  });

  test('Step 13: Generate Recipient OTP and Confirm Delivery with Signature', async () => {
    // Generate secure OTP
    const otpResult = await LogisticsService.generateDeliveryOtp(deliveryId, driverActor);
    assert.ok(otpResult.devOtpPreview);

    const confirmed = await LogisticsService.confirmDeliveryReceipt(
      {
        deliveryId,
        otpCode: otpResult.devOtpPreview,
        signatureData: 'data:image/png;base64,SIGNATURE_OF_MORTAZA_TALAEI_CONFIRMED',
        photoData: 'data:image/jpeg;base64,UNLOAD_HOPPER_PROOF_PHOTO',
        notes: 'بار کاملاً سالم و با کیفیت عالی تخلیه شد',
      },
      driverActor
    );
    assert.equal(confirmed.status, DeliveryStatus.CONFIRMED);

    // Order status must be CONFIRMED
    const order = await queryOne('SELECT status FROM feed_orders WHERE id = $1', [orderId]);
    assert.equal(order.status, OrderStatus.CONFIRMED);
  });

  test('Step 14: System KPI & Performance Reports reflect completed workflow', async () => {
    const kpis = await ReportService.getDashboardKpis();
    assert.ok(kpis.activeFarmersCount >= 1);
    assert.ok(kpis.recentOrders.length >= 1);

    const fcrReport = await ReportService.getFlockPerformanceReport();
    assert.ok(fcrReport.length >= 1);
  });

  after(async () => {
    await pool.end();
  });
});
