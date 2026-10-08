/**
 * NIRWARE NEXT Mobile - Isolated Local Preview / Demo Data Adapter
 *
 * Provides realistic, structured mock data for local UI preview and testing
 * without connecting to external networks or servers.
 *
 * NOTE: This adapter is strictly active only when Demo Mode is explicitly enabled.
 */
import { UserRole } from '@nirware/config';
import { MobileUser, MobileDelivery } from '../types';

export interface DemoSiloItem {
  id: string;
  name: string;
  material: string;
  capacityKg: number;
  currentKg: number;
  fillPercent: number;
  status: 'OPTIMAL' | 'REFILL_NEEDED' | 'CRITICAL';
}

export interface DemoProductionBatch {
  id: string;
  batchNumber: string;
  line: string;
  productName: string;
  targetKg: number;
  producedKg: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'MIXING';
  conditionerTemp: string;
}

export interface DemoScaleShipment {
  id: string;
  ticketNumber: string;
  type: 'INBOUND' | 'OUTBOUND';
  vehiclePlate: string;
  driverName: string;
  materialName: string;
  netWeightKg: number;
  status: 'WEIGHED' | 'IN_QUEUE' | 'DISPATCHED';
  time: string;
}

// 1. Initial State for Demo Session
let demoOrdersState = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-1403-101',
    farmerName: 'مرتضی کاظمی (مرغداری پیشگام)',
    farmerId: 'demo-farmer-1',
    productName: 'پلت سوپر پیشدان گوشتی',
    requestedQuantityKg: 12000,
    status: 'PENDING_APPROVAL',
    createdAt: '1403/07/17 09:30',
    deliveryAddress: 'کیلومتر ۱۵ جاده ساری، مزرعه شماره ۱',
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-1403-102',
    farmerName: 'مهندس رضا مرادی (مرغداری طبرستان)',
    farmerId: 'demo-farmer-2',
    productName: 'پلت میان‌دان گوشتی (فرمول ۲)',
    requestedQuantityKg: 24000,
    status: 'PENDING_APPROVAL',
    createdAt: '1403/07/17 10:15',
    deliveryAddress: 'گرگان، روستای محمدآباد، فارم سپید',
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-1403-103',
    farmerName: 'حاج احمد رضایی (کشت و صنعت البرز)',
    farmerId: 'demo-farmer-3',
    productName: 'کنسانتره ۵ درصد تخم‌گذار ویژه',
    requestedQuantityKg: 8000,
    status: 'APPROVED',
    createdAt: '1403/07/16 14:00',
    deliveryAddress: 'جاده ساوه، شهرک دام و طیور، سالن ۴',
  },
  {
    id: 'ord-104',
    orderNumber: 'ORD-1403-104',
    farmerName: 'شرکت طیور دشتستان (فارم گلستان)',
    farmerId: 'demo-farmer-4',
    productName: 'پلت پایانی گوشتی (بدون دارو)',
    requestedQuantityKg: 36000,
    status: 'APPROVED',
    createdAt: '1403/07/16 16:45',
    deliveryAddress: 'جاده قدیم شهریار، مجتمع پرورش طیور دشتستان',
  },
  {
    id: 'ord-105',
    orderNumber: 'ORD-1403-105',
    farmerName: 'مهندس صادقی (گنبد قابوس)',
    farmerId: 'demo-farmer-5',
    productName: 'مش تخم‌گذار دوره‌ای',
    requestedQuantityKg: 15000,
    status: 'DELIVERED',
    createdAt: '1403/07/15 11:20',
    deliveryAddress: 'گنبد قابوس، کیلومتر ۸، جنب کشتارگاه',
  },
];

let demoDeliveriesState: MobileDelivery[] = [
  {
    id: 'del-201',
    orderId: 'ord-103',
    orderNumber: 'ORD-1403-103',
    farmerName: 'حاج احمد رضایی (کشت و صنعت البرز)',
    farmerPhone: '09126666666',
    productName: 'کنسانتره ۵ درصد تخم‌گذار ویژه',
    weightKg: 8000,
    destinationAddress: 'جاده ساوه، شهرک دام و طیور، سالن ۴',
    status: 'IN_TRANSIT',
  },
  {
    id: 'del-202',
    orderId: 'ord-104',
    orderNumber: 'ORD-1403-104',
    farmerName: 'شرکت طیور دشتستان (فارم گلستان)',
    farmerPhone: '09127777777',
    productName: 'پلت پایانی گوشتی (بدون دارو)',
    weightKg: 22000,
    destinationAddress: 'جاده قدیم شهریار، مجتمع پرورش طیور دشتستان',
    status: 'ASSIGNED',
  },
];

export const demoSilosData: DemoSiloItem[] = [
  {
    id: 'silo-1',
    name: 'سیلوی فلزی شماره ۱',
    material: 'ذرت دانه‌ای برزیلی درجه یک',
    capacityKg: 100000,
    currentKg: 82000,
    fillPercent: 82,
    status: 'OPTIMAL',
  },
  {
    id: 'silo-2',
    name: 'سیلوی فلزی شماره ۲',
    material: 'کنجاله سویای پلت آرژانتین',
    capacityKg: 80000,
    currentKg: 54000,
    fillPercent: 68,
    status: 'OPTIMAL',
  },
  {
    id: 'silo-3',
    name: 'سیلوی شماره ۳',
    material: 'گلوتن ذرت ۶۰ درصد پروتئین',
    capacityKg: 40000,
    currentKg: 14000,
    fillPercent: 35,
    status: 'REFILL_NEEDED',
  },
  {
    id: 'silo-4',
    name: 'سیلوی شماره ۴',
    material: 'دی‌کلسیم فسفات (DCP)',
    capacityKg: 20000,
    currentKg: 12500,
    fillPercent: 63,
    status: 'OPTIMAL',
  },
  {
    id: 'silo-p1',
    name: 'سیلوی محصول نهایی A',
    material: 'پلت میان‌دان گوشتی آماده تحویل',
    capacityKg: 50000,
    currentKg: 42000,
    fillPercent: 84,
    status: 'OPTIMAL',
  },
  {
    id: 'silo-p2',
    name: 'سیلوی محصول نهایی B',
    material: 'پلت سوپر پیشدان آماده تحویل',
    capacityKg: 30000,
    currentKg: 21500,
    fillPercent: 72,
    status: 'OPTIMAL',
  },
];

export const demoBatchesData: DemoProductionBatch[] = [
  {
    id: 'batch-1',
    batchNumber: 'B-1403-208',
    line: 'خط پلت شماره ۱',
    productName: 'پلت میان‌دان گوشتی (فرمول استاندارد)',
    targetKg: 20000,
    producedKg: 14500,
    status: 'IN_PROGRESS',
    conditionerTemp: '۸۳°C',
  },
  {
    id: 'batch-2',
    batchNumber: 'B-1403-209',
    line: 'خط میکسر شماره ۲',
    productName: 'پلت سوپر پیشدان گوشتی',
    targetKg: 15000,
    producedKg: 6000,
    status: 'MIXING',
    conditionerTemp: '۷۸°C',
  },
  {
    id: 'batch-3',
    batchNumber: 'B-1403-207',
    line: 'خط پلت شماره ۲',
    productName: 'کنسانتره ۵ درصد تخم‌گذار',
    targetKg: 14000,
    producedKg: 14000,
    status: 'COMPLETED',
    conditionerTemp: '۸۱°C',
  },
];

export const demoScaleShipmentsData: DemoScaleShipment[] = [
  {
    id: 'scale-1',
    ticketNumber: 'TKT-IN-841',
    type: 'INBOUND',
    vehiclePlate: '۲۴ ع ۴۲۸ - ایران ۷۲',
    driverName: 'جواد رضایی',
    materialName: 'ذرت دانه‌ای برزیلی',
    netWeightKg: 24850,
    status: 'WEIGHED',
    time: '۰۸:۴۵',
  },
  {
    id: 'scale-2',
    ticketNumber: 'TKT-IN-842',
    type: 'INBOUND',
    vehiclePlate: '۱۸ ب ۵۱۴ - ایران ۲۱',
    driverName: 'محمد قنبری',
    materialName: 'کنجاله سویا',
    netWeightKg: 16200,
    status: 'IN_QUEUE',
    time: '۰۹:۳۰',
  },
  {
    id: 'scale-3',
    ticketNumber: 'TKT-OUT-408',
    type: 'OUTBOUND',
    vehiclePlate: '۷۷ د ۹۳۱ - ایران ۱۲',
    driverName: 'علی حسینی',
    materialName: 'پلت میان‌دان گوشتی',
    netWeightKg: 18000,
    status: 'DISPATCHED',
    time: '۱۰:۰۰',
  },
  {
    id: 'scale-4',
    ticketNumber: 'TKT-OUT-409',
    type: 'OUTBOUND',
    vehiclePlate: '۵۵ ج ۶۲۲ - ایران ۹۹',
    driverName: 'بهنام کریمی',
    materialName: 'پلت سوپر پیشدان',
    netWeightKg: 22000,
    status: 'WEIGHED',
    time: '۱۰:۴۵',
  },
];

export const demoUsers: Record<string, MobileUser> = {
  manager: {
    id: 'demo-user-manager-id',
    username: 'manager',
    fullName: 'مهندس صمدی (مدیر کارخانه)',
    role: UserRole.MANAGER,
    phone: '09123333333',
    farmerId: null,
    driverId: null,
  },
  driver: {
    id: 'demo-user-driver-id',
    username: 'driver1',
    fullName: 'علی حسینی (راننده ناوگان)',
    role: UserRole.DRIVER,
    phone: '09128888888',
    farmerId: null,
    driverId: 'demo-driver-1',
  },
  farmer: {
    id: 'demo-user-farmer-id',
    username: 'farmer1',
    fullName: 'حاج مرتضی کشاورز (مرغداری پیشگام)',
    role: UserRole.FARMER,
    phone: '09126666666',
    farmerId: 'demo-farmer-1',
    driverId: null,
  },
};

/**
 * Demo Adapter Dispatcher
 */
export class DemoAdapter {
  public static async handleGet(path: string): Promise<any> {
    // Artificial small delay for realistic UI transition
    await new Promise((r) => setTimeout(r, 80));

    const cleanPath = path.split('?')[0];

    if (cleanPath === '/reports/kpis') {
      const pendingCount = demoOrdersState.filter((o) => o.status === 'PENDING_APPROVAL').length;
      return {
        pendingOrdersCount: pendingCount,
        activeDeliveriesCount: demoDeliveriesState.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'ASSIGNED').length,
        todayProducedKg: 48500,
        totalInventoryKg: 182000,
        activeBatchesCount: 6,
        completedTodayBatches: 4,
        totalFarmersCount: 28,
        fleetOnRouteCount: 3,
      };
    }

    if (cleanPath === '/orders') {
      return [...demoOrdersState];
    }

    if (cleanPath === '/deliveries/my') {
      return [...demoDeliveriesState];
    }

    if (cleanPath.startsWith('/farmers/') && cleanPath.endsWith('/quotas')) {
      return [
        {
          id: 'quota-demo-1',
          approvedQuantityKg: 85000,
          usedQuantityKg: 49000,
          remainingKg: 36000,
          period: 'دوره پاییز ۱۴۰۳',
          status: 'ACTIVE',
        },
      ];
    }

    if (cleanPath === '/auth/me') {
      return demoUsers.manager;
    }

    if (cleanPath === '/inventory/silos') {
      return demoSilosData;
    }

    if (cleanPath === '/production/batches') {
      return demoBatchesData;
    }

    if (cleanPath === '/scale/shipments') {
      return demoScaleShipmentsData;
    }

    // Default safe fallback for demo mode
    return [];
  }

  public static async handlePost(path: string, body?: any): Promise<any> {
    await new Promise((r) => setTimeout(r, 120));

    if (path === '/auth/login') {
      const uname = (body?.username || '').toLowerCase().trim();
      let matchedUser = demoUsers.manager;
      if (uname.includes('driver')) {
        matchedUser = demoUsers.driver;
      } else if (uname.includes('farmer')) {
        matchedUser = demoUsers.farmer;
      }

      return {
        token: `demo-jwt-${matchedUser.role.toLowerCase()}-session-token`,
        user: matchedUser,
        farmerId: matchedUser.farmerId,
        driverId: matchedUser.driverId,
      };
    }

    if (path === '/auth/logout') {
      return { success: true, message: 'خروج با موفقیت انجام شد' };
    }

    // Approve / Reject Order Transition
    const transitionMatch = path.match(/\/orders\/([^/]+)\/transition/);
    if (transitionMatch) {
      const orderId = transitionMatch[1];
      const targetState = body?.targetState || 'APPROVED';
      demoOrdersState = demoOrdersState.map((o) =>
        o.id === orderId ? { ...o, status: targetState } : o
      );
      return { success: true, orderId, status: targetState };
    }

    // Create Order (Farmer)
    if (path === '/orders') {
      const newOrder = {
        id: `ord-${Date.now().toString().slice(-4)}`,
        orderNumber: `ORD-1403-${(demoOrdersState.length + 101).toString()}`,
        farmerName: 'حاج مرتضی کشاورز (مرغداری پیشگام)',
        farmerId: body?.farmerId || 'demo-farmer-1',
        productName: 'پلت میان‌دان گوشتی (سفارش جدید)',
        requestedQuantityKg: Number(body?.requestedQuantityKg) || 10000,
        status: 'PENDING_APPROVAL',
        createdAt: 'امروز، چند لحظه پیش',
        deliveryAddress: body?.deliveryAddress || 'آدرس ثبت شده مزرعه',
      };
      demoOrdersState = [newOrder, ...demoOrdersState];
      return { success: true, order: newOrder };
    }

    // Driver Start Transit
    const startTransitMatch = path.match(/\/deliveries\/([^/]+)\/start-transit/);
    if (startTransitMatch) {
      const deliveryId = startTransitMatch[1];
      demoDeliveriesState = demoDeliveriesState.map((d) =>
        d.id === deliveryId ? { ...d, status: 'IN_TRANSIT' } : d
      );
      return { success: true, deliveryId, status: 'IN_TRANSIT' };
    }

    // Driver Confirm Delivery
    const confirmDeliveryMatch = path.match(/\/deliveries\/([^/]+)\/confirm/);
    if (confirmDeliveryMatch) {
      const deliveryId = confirmDeliveryMatch[1];
      demoDeliveriesState = demoDeliveriesState.map((d) =>
        d.id === deliveryId ? { ...d, status: 'DELIVERED' } : d
      );
      return { success: true, deliveryId, status: 'DELIVERED' };
    }

    return { success: true };
  }
}
