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

interface ManagerDashboardScreenProps {
  user: MobileUser;
  onLogout: () => void;
}

export const ManagerDashboardScreen: React.FC<ManagerDashboardScreenProps> = ({ user, onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kpis, setKpis] = useState({
    pendingOrdersCount: 0,
    activeDeliveriesCount: 0,
    todayProducedKg: 0,
  });

  const loadData = async () => {
    try {
      setRefreshing(true);
      setErrorMessage(null);
      const [ordersRes, summaryRes] = await Promise.all([
        mobileApi.get<any[]>('/orders'),
        mobileApi.get<any>('/reports/summary').catch(() => null),
      ]);
      setOrders(ordersRes || []);
      if (summaryRes?.kpis) {
        setKpis({
          pendingOrdersCount: summaryRes.kpis.pendingOrdersCount || 0,
          activeDeliveriesCount: summaryRes.kpis.activeDeliveriesCount || 0,
          todayProducedKg: summaryRes.kpis.todayProducedKg || 0,
        });
      }
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
        <View>
          <Text style={styles.greeting}>سلام، {user.fullName}</Text>
          <Text style={styles.roleBadge}>پنل مدیریت کارخانه و تولید</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>خروج</Text>
        </TouchableOpacity>
      </View>

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

        {/* Section: Orders */}
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
                <Text style={[styles.statusTag, order.status === 'PENDING_APPROVAL' ? styles.statusPending : styles.statusApproved]}>
                  {order.status === 'PENDING_APPROVAL' ? 'در انتظار بررسی' : order.status}
                </Text>
              </View>

              <Text style={styles.farmerName}>مرغدار: {order.farmerName || 'نامشخص'}</Text>
              <Text style={styles.productDesc}>
                {order.productName} — {(order.requestedQuantityKg || 0).toLocaleString()} کیلوگرم
              </Text>

              {order.status === 'PENDING_APPROVAL' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(order.id)}
                  >
                    <Text style={styles.approveBtnText}>تأیید سفارش</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
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
  greeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
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
  scrollContent: {
    padding: 16,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 20,
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
