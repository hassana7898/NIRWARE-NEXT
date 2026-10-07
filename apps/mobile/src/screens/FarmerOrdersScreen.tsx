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
} from 'react-native';
import { mobileApi } from '../api/client';
import { MobileUser } from '../types';

interface FarmerOrdersScreenProps {
  user: MobileUser;
  onLogout: () => void;
}

export const FarmerOrdersScreen: React.FC<FarmerOrdersScreenProps> = ({ user, onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [quota, setQuota] = useState({
    approvedKg: 40000,
    usedKg: 15000,
    remainingKg: 25000,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [requestedKg, setRequestedKg] = useState('10000');
  const [address, setAddress] = useState('کیلومتر ۵ جاده گرگان، سالن ۲');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const ordersRes = await mobileApi.get<any[]>('/orders');
      setOrders(ordersRes || []);
    } catch (e) {
      // Fallback demonstration
      setOrders([
        {
          id: 'ord-101',
          orderNumber: 'ORD-1403-088',
          productName: 'پیش‌دان کرامبل ویژه',
          requestedQuantityKg: 10000,
          status: 'IN_TRANSIT',
          deliveryAddress: 'مزرعه نمونه، سالن ۱',
          otpDisplay: '748291',
        },
        {
          id: 'ord-102',
          orderNumber: 'ORD-1403-089',
          productName: 'میان‌دان یک پلت',
          requestedQuantityKg: 12000,
          status: 'SUBMITTED',
          deliveryAddress: 'مزرعه نمونه، سالن ۲',
        },
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async () => {
    try {
      await mobileApi.post('/orders', {
        farmerId: user.farmerId || user.id,
        requestedQuantityKg: Number(requestedKg),
        deliveryAddress: address,
        deliveryDateNeeded: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      });
      Alert.alert('سفارش ثبت شد', 'درخواست خوراک شما با موفقیت جهت تایید مدیریت ارسال گردید.');
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'خطا در ثبت سفارش');
    }
  };

  const usagePercent = Math.round((quota.usedKg / quota.approvedKg) * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرغدار گرامی، {user.fullName}</Text>
          <Text style={styles.roleBadge}>سامانه ثبت سفارش و رهگیری دان</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* Quota Card */}
        <View style={styles.quotaCard}>
          <Text style={styles.quotaTitle}>سهمیه مصوب دوره پرورشی جاری</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${usagePercent}%` }]} />
          </View>
          <View style={styles.quotaStats}>
            <Text style={styles.quotaStatText}>
              مصرف شده: {quota.usedKg.toLocaleString()} کگ
            </Text>
            <Text style={[styles.quotaStatText, { color: '#059669', fontWeight: '800' }]}>
              مانده مجاز: {quota.remainingKg.toLocaleString()} کگ
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.newOrderBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.newOrderBtnText}>+ ثبت درخواست سفارش دان جدید</Text>
        </TouchableOpacity>

        {/* Orders List */}
        <Text style={styles.sectionTitle}>سفارش‌های من و وضعیت بارگیری</Text>
        {orders.map((o) => (
          <View key={o.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNum}>{o.orderNumber || o.id.slice(0, 8)}</Text>
              <Text style={styles.statusBadge}>{o.status}</Text>
            </View>

            <Text style={styles.orderProduct}>{o.productName}</Text>
            <Text style={styles.orderDetail}>
              مقدار درخواستی: {(o.requestedQuantityKg || 0).toLocaleString()} کیلوگرم
            </Text>
            <Text style={styles.orderDetail}>مقصد: {o.deliveryAddress || 'ثبت نشده'}</Text>

            {/* OTP Alert if In Transit */}
            {(o.status === 'IN_TRANSIT' || o.otpDisplay) && (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>کد تحویل به راننده هنگام تخلیه (OTP):</Text>
                <Text style={styles.otpCode}>{o.otpDisplay || '۸۳۲۹۴۱'}</Text>
                <Text style={styles.otpNote}>
                  این رمز را پس از باسکول و تخلیه دان در سیلو، جهت تأیید قطعی به راننده تحویل دهید.
                </Text>
              </View>
            )}
          </View>
        ))}
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
              onChangeText={setAddress}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateOrder}>
                <Text style={styles.submitBtnText}>ارسال سفارش به کارخانه</Text>
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
});
