import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { mobileApi } from '../api/client';
import { MobileUser } from '../types';
import { UserRole } from '@nirware/config';

interface FarmerOrdersScreenProps {
  user: MobileUser;
  onLogout: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const FarmerOrdersScreen: React.FC<FarmerOrdersScreenProps> = ({ user, onLogout, onSwitchRole }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quota, setQuota] = useState<{
    approvedKg: number;
    usedKg: number;
    remainingKg: number;
  }>({
    approvedKg: 0,
    usedKg: 0,
    remainingKg: 0,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [requestedKg, setRequestedKg] = useState('10000');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const [ordersRes, quotasRes] = await Promise.all([
        mobileApi.get<any[]>('/orders'),
        mobileApi.get<any[]>(`/farmers/${user.farmerId || user.id}/quotas`).catch(() => []),
      ]);

      setOrders(ordersRes || []);

      if (quotasRes && quotasRes.length > 0) {
        const primary = quotasRes[0];
        const approved = Number(primary.approvedQuantityKg || primary.approved_quantity_kg || 0);
        const used = Number(primary.usedQuantityKg || primary.used_quantity_kg || 0);
        setQuota({
          approvedKg: approved,
          usedKg: used,
          remainingKg: Math.max(0, approved - used),
        });
      }
    } catch (e: any) {
      setError(e.message || 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی فرمایید.');
      setOrders([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async () => {
    if (!requestedKg || Number(requestedKg) <= 0) {
      Alert.alert('خطا', 'لطفاً مقدار دان درخواستی را مشخص فرمایید.');
      return;
    }
    setSubmitting(true);
    try {
      await mobileApi.post('/orders', {
        farmerId: user.farmerId || user.id,
        requestedQuantityKg: Number(requestedKg),
        deliveryAddress: address || 'آدرس پیش‌فرض مزرعه ثبت شده',
        deliveryDateNeeded: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      });
      Alert.alert('ثبت موفق', 'درخواست خوراک شما با موفقیت جهت بررسی و تأیید به کارخانه ارسال گردید.');
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('خطا در ثبت سفارش', err.message || 'خطا در پردازش درخواست');
    } finally {
      setSubmitting(false);
    }
  };

  const usagePercent = quota.approvedKg > 0 ? Math.min(100, Math.round((quota.usedKg / quota.approvedKg) * 100)) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرغدار گرامی، {user.fullName}</Text>
          <Text style={styles.roleBadge}>سامانه همراه نظارت بر سهمیه و سفارش دان</Text>
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
              style={styles.rolePill}
              onPress={() => onSwitchRole(UserRole.MANAGER)}
            >
              <Text style={styles.rolePillText}>🏢 مدیر کارخانه</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rolePill}
              onPress={() => onSwitchRole(UserRole.DRIVER)}
            >
              <Text style={styles.rolePillText}>🚚 راننده ناوگان</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rolePill, styles.rolePillActive]}
              disabled
            >
              <Text style={[styles.rolePillText, styles.rolePillTextActive]}>🌾 مرغدار</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* Quota Card */}
        {quota.approvedKg > 0 && (
          <View style={styles.quotaCard}>
            <Text style={styles.quotaTitle}>سهمیه مصوب دوره پرورشی فعال</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${usagePercent}%` }]} />
            </View>
            <View style={styles.quotaStats}>
              <Text style={styles.quotaStatText}>
                مصرف شده: {quota.usedKg.toLocaleString()} کگ ({usagePercent}٪)
              </Text>
              <Text style={[styles.quotaStatText, { color: '#059669', fontWeight: '800' }]}>
                مانده مجاز: {quota.remainingKg.toLocaleString()} کگ
              </Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.newOrderBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.newOrderBtnText}>+ ثبت درخواست سفارش دان جدید</Text>
        </TouchableOpacity>

        {/* Orders List */}
        <Text style={styles.sectionTitle}>سفارش‌های من و وضعیت بارگیری</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>در حال دریافت وضعیت سفارش‌ها از سرور...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>تلاش مجدد</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>هیچ سفارشی در این دوره ثبت نگردیده است.</Text>
          </View>
        ) : (
          orders.map((o) => (
            <View key={o.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNum}>{o.orderNumber || o.id.slice(0, 8)}</Text>
                <Text style={styles.statusBadge}>{o.status}</Text>
              </View>

              <Text style={styles.orderProduct}>{o.productName || 'خوراک آماده طیور'}</Text>
              <Text style={styles.orderDetail}>
                مقدار درخواستی: {(o.requestedQuantityKg || o.requested_quantity_kg || 0).toLocaleString()} کیلوگرم
              </Text>
              <Text style={styles.orderDetail}>مقصد: {o.deliveryAddress || o.delivery_address || 'ثبت نشده'}</Text>

              {/* Real OTP Display if Available */}
              {o.otpCode && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>کد تحویل به راننده هنگام تخلیه (OTP):</Text>
                  <Text style={styles.otpCode}>{o.otpCode}</Text>
                  <Text style={styles.otpNote}>
                    این رمز را صرفاً پس از اتمام توزین و تخلیه دان در سیلو، جهت تأیید قطعی به راننده تحویل فرمایید.
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* New Order Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ثبت سفارش خوراک</Text>

            <Text style={styles.inputLabel}>مقدار مورد نیاز (کیلوگرم):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={requestedKg}
              onChangeText={setRequestedKg}
            />

            <Text style={styles.inputLabel}>آدرس تحویل در مزرعه:</Text>
            <TextInput
              style={styles.modalInput}
              value={address}
              placeholder="مثال: سالن شماره ۲ فارم البرز"
              onChangeText={setAddress}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.disabledSubmit]}
                disabled={submitting}
                onPress={handleCreateOrder}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'در حال ارسال به سرور...' : 'ارسال سفارش به کارخانه'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>انصراف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  quotaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
    marginBottom: 10,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 5,
  },
  quotaStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  quotaStatText: {
    fontSize: 11,
    color: '#64748b',
  },
  newOrderBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  newOrderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 18,
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
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderProduct: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  orderDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'right',
  },
  otpBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
  },
  otpCode: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 6,
    marginVertical: 4,
  },
  otpNote: {
    fontSize: 10,
    color: '#047857',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'right',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'right',
  },
  modalActions: {
    marginTop: 10,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledSubmit: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
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
});
