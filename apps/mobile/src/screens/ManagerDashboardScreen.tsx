import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { mobileApi } from '../api/client';
import { MobileUser } from '../types';
import { UserRole } from '@nirware/config';
import { isDemoModeActive } from '../config/demo';
import {
  DemoSiloItem,
  DemoProductionBatch,
  DemoScaleShipment,
  demoSilosData,
  demoBatchesData,
  demoScaleShipmentsData,
} from '../api/demo.adapter';

interface ManagerDashboardScreenProps {
  user: MobileUser;
  onLogout: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

type TabType = 'orders' | 'inventory' | 'production' | 'logistics';

export const ManagerDashboardScreen: React.FC<ManagerDashboardScreenProps> = ({
  user,
  onLogout,
  onSwitchRole,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [silos, setSilos] = useState<DemoSiloItem[]>(demoSilosData);
  const [batches, setBatches] = useState<DemoProductionBatch[]>(demoBatchesData);
  const [shipments, setShipments] = useState<DemoScaleShipment[]>(demoScaleShipmentsData);
  const [kpis, setKpis] = useState({
    pendingOrdersCount: 0,
    activeDeliveriesCount: 0,
    todayProducedKg: 0,
    totalInventoryKg: 182000,
  });

  const isDemo = isDemoModeActive();

  const loadData = async () => {
    try {
      setRefreshing(true);
      setErrorMessage(null);
      const [ordersRes, kpisRes, silosRes, batchesRes, shipmentsRes] = await Promise.all([
        mobileApi.get<any[]>('/orders'),
        mobileApi.get<any>('/reports/kpis').catch(() => null),
        mobileApi.get<any[]>('/inventory/silos').catch(() => null),
        mobileApi.get<any[]>('/production/batches').catch(() => null),
        mobileApi.get<any[]>('/scale/shipments').catch(() => null),
      ]);

      setOrders(ordersRes || []);
      if (kpisRes) {
        setKpis({
          pendingOrdersCount: kpisRes.pendingOrdersCount || 0,
          activeDeliveriesCount: kpisRes.activeDeliveriesCount || 0,
          todayProducedKg: kpisRes.todayProducedKg || 0,
          totalInventoryKg: kpisRes.totalInventoryKg || 182000,
        });
      }
      if (silosRes && Array.isArray(silosRes)) setSilos(silosRes);
      if (batchesRes && Array.isArray(batchesRes)) setBatches(batchesRes);
      if (shipmentsRes && Array.isArray(shipmentsRes)) setShipments(shipmentsRes);
    } catch (e: any) {
      setErrorMessage(e.message || 'خطا در دریافت اطلاعات از سرور');
      setOrders([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (orderId: string) => {
    try {
      await mobileApi.post(`/orders/${orderId}/transition`, {
        action: 'APPROVE',
        targetState: 'APPROVED',
      });
      Alert.alert('موفق', 'سفارش با موفقیت تأیید شد.');
      loadData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'خطا در تأیید سفارش');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>سلام، {user.fullName}</Text>
            {isDemo && <Text style={styles.demoBadge}>حالت دمو</Text>}
          </View>
          <Text style={styles.roleBadge}>پنل مدیریت کارخانه و نظارت بر خطوط</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {/* Role Navigation Pill Bar (Enabled in Demo / Preview Mode) */}
      {onSwitchRole && (
        <View style={styles.roleSwitcherBar}>
          <Text style={styles.roleSwitcherLabel}>پیش‌نمایش نقش‌ها:</Text>
          <View style={styles.rolePillsRow}>
            <TouchableOpacity
              style={[styles.rolePill, styles.rolePillActive]}
              disabled
            >
              <Text style={[styles.rolePillText, styles.rolePillTextActive]}>🏢 مدیر کارخانه</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rolePill}
              onPress={() => onSwitchRole(UserRole.DRIVER)}
            >
              <Text style={styles.rolePillText}>🚚 راننده ناوگان</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rolePill}
              onPress={() => onSwitchRole(UserRole.FARMER)}
            >
              <Text style={styles.rolePillText}>🌾 مرغدار</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.kpiLabel}>سفارش‌های در انتظار تأیید</Text>
            <Text style={styles.kpiValue}>{kpis.pendingOrdersCount}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.kpiLabel}>ناوگان در حال حمل</Text>
            <Text style={styles.kpiValue}>{kpis.activeDeliveriesCount}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.kpiLabel}>تولید امروز (کیلوگرم)</Text>
            <Text style={styles.kpiValue}>{kpis.todayProducedKg.toLocaleString()}</Text>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>تلاش مجدد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Segmented Tab Controls */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'orders' && styles.tabBtnTextActive]}>
              📋 سفارشات ({orders.filter((o) => o.status === 'PENDING_APPROVAL').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'inventory' && styles.tabBtnActive]}
            onPress={() => setActiveTab('inventory')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'inventory' && styles.tabBtnTextActive]}>
              🏢 سیلوها و انبار
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'production' && styles.tabBtnActive]}
            onPress={() => setActiveTab('production')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'production' && styles.tabBtnTextActive]}>
              ⚙️ خطوط تولید
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'logistics' && styles.tabBtnActive]}
            onPress={() => setActiveTab('logistics')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'logistics' && styles.tabBtnTextActive]}>
              ⚖️ باسکول و حمل
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <View>
            <Text style={styles.sectionTitle}>سفارش‌های نیازمند اقدام فوری</Text>
            {orders.length === 0 && !errorMessage ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>هیچ سفارشی در حال حاضر ثبت نشده است.</Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNum}>{order.orderNumber || order.id.slice(0, 8)}</Text>
                    <Text
                      style={[
                        styles.statusTag,
                        order.status === 'PENDING_APPROVAL'
                          ? styles.statusPending
                          : order.status === 'APPROVED'
                          ? styles.statusApproved
                          : styles.statusDelivered,
                      ]}
                    >
                      {order.status === 'PENDING_APPROVAL'
                        ? 'در انتظار تأیید'
                        : order.status === 'APPROVED'
                        ? 'تأیید شده'
                        : 'تحویل شده'}
                    </Text>
                  </View>

                  <Text style={styles.farmerName}>مرغدار: {order.farmerName || 'نامشخص'}</Text>
                  <Text style={styles.productDesc}>
                    {order.productName} — {(order.requestedQuantityKg || 0).toLocaleString()} کیلوگرم
                  </Text>
                  {order.deliveryAddress && (
                    <Text style={styles.addressDesc}>📍 {order.deliveryAddress}</Text>
                  )}

                  {order.status === 'PENDING_APPROVAL' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(order.id)}
                      >
                        <Text style={styles.approveBtnText}>✓ تأیید و ارسال به خط تولید</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Silos & Raw Material Inventory */}
        {activeTab === 'inventory' && (
          <View>
            <Text style={styles.sectionTitle}>وضعیت ذخایر سیلوها و مواد اولیه</Text>
            {silos.map((silo) => (
              <View key={silo.id} style={styles.siloCard}>
                <View style={styles.siloHeader}>
                  <Text style={styles.siloName}>{silo.name}</Text>
                  <Text
                    style={[
                      styles.siloStatusBadge,
                      silo.status === 'OPTIMAL' ? styles.statusApproved : styles.statusPending,
                    ]}
                  >
                    {silo.status === 'OPTIMAL' ? 'مطلوب' : 'نیازمند شارژ'}
                  </Text>
                </View>
                <Text style={styles.siloMaterial}>{silo.material}</Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${silo.fillPercent}%`,
                        backgroundColor: silo.fillPercent > 40 ? '#10b981' : '#f59e0b',
                      },
                    ]}
                  />
                </View>
                <View style={styles.siloFooter}>
                  <Text style={styles.siloFooterText}>{silo.fillPercent}٪ تکمیل</Text>
                  <Text style={styles.siloFooterText}>
                    {silo.currentKg.toLocaleString()} از {silo.capacityKg.toLocaleString()} کیلوگرم
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 3: Production Batches */}
        {activeTab === 'production' && (
          <View>
            <Text style={styles.sectionTitle}>بچ‌های تولیدی در حال اجرا و تکمیل‌شده امروز</Text>
            {batches.map((batch) => (
              <View key={batch.id} style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <Text style={styles.batchNumber}>{batch.batchNumber}</Text>
                  <Text
                    style={[
                      styles.statusTag,
                      batch.status === 'COMPLETED'
                        ? styles.statusApproved
                        : batch.status === 'IN_PROGRESS'
                        ? styles.statusPending
                        : styles.statusMixing,
                    ]}
                  >
                    {batch.status === 'COMPLETED'
                      ? 'تکمیل شد'
                      : batch.status === 'IN_PROGRESS'
                      ? 'در حال پلت‌سازی'
                      : 'میکسینگ'}
                  </Text>
                </View>
                <Text style={styles.batchLine}>خط: {batch.line} | دمای کاندیشنر: {batch.conditionerTemp}</Text>
                <Text style={styles.batchProduct}>{batch.productName}</Text>
                <View style={styles.batchFooter}>
                  <Text style={styles.batchFooterText}>
                    تولید: {batch.producedKg.toLocaleString()} / هدف: {batch.targetKg.toLocaleString()} کیلوگرم
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 4: Logistics & Weighbridge */}
        {activeTab === 'logistics' && (
          <View>
            <Text style={styles.sectionTitle}>حواله‌ها و نوبت‌های باسکول کارخانه</Text>
            {shipments.map((shipment) => (
              <View key={shipment.id} style={styles.scaleCard}>
                <View style={styles.scaleHeader}>
                  <Text style={styles.scaleTicket}>{shipment.ticketNumber}</Text>
                  <Text
                    style={[
                      styles.scaleTypeTag,
                      shipment.type === 'INBOUND' ? styles.tagInbound : styles.tagOutbound,
                    ]}
                  >
                    {shipment.type === 'INBOUND' ? 'حواله ورود' : 'حواله خروج'}
                  </Text>
                </View>
                <Text style={styles.scaleDetail}>
                  🚛 پلاک: {shipment.vehiclePlate} | راننده: {shipment.driverName}
                </Text>
                <Text style={styles.scaleMaterial}>
                  محموله: {shipment.materialName} — {shipment.netWeightKg.toLocaleString()} کیلوگرم
                </Text>
                <View style={styles.scaleFooter}>
                  <Text style={styles.scaleTime}>ساعت توزین: {shipment.time}</Text>
                  <Text style={styles.scaleStatus}>{shipment.status === 'WEIGHED' ? 'توزین قطعی' : shipment.status === 'DISPATCHED' ? 'خروج ثبت شد' : 'در صف باسکول'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 45,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greetingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  demoBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  logoutBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
  },
  roleSwitcherBar: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  roleSwitcherLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 6,
  },
  rolePillsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  rolePillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  rolePillTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 4,
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'right',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
    color: '#047857',
  },
  statusDelivered: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  statusMixing: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  farmerName: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
  },
  productDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  addressDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'right',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row-reverse',
  },
  approveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  siloCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  siloHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siloName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  siloStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  siloMaterial: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    textAlign: 'right',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  siloFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  siloFooterText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  batchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  batchHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  batchLine: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  batchProduct: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 4,
    textAlign: 'right',
  },
  batchFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
  },
  batchFooterText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  scaleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  scaleHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleTicket: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  scaleTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagInbound: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  tagOutbound: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  scaleDetail: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
    textAlign: 'right',
  },
  scaleMaterial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 4,
    textAlign: 'right',
  },
  scaleFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scaleTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  scaleStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
