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
import { MobileUser, MobileDelivery } from '../types';

interface DriverDeliveryScreenProps {
  user: MobileUser;
  onLogout: () => void;
}

export const DriverDeliveryScreen: React.FC<DriverDeliveryScreenProps> = ({ user, onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<MobileDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<MobileDelivery | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await mobileApi.get<MobileDelivery[]>('/deliveries/my');
      setDeliveries(res || []);
    } catch (e) {
      // Fallback demo data
      setDeliveries([
        {
          id: 'del-501',
          orderId: 'ord-101',
          orderNumber: 'ORD-1403-088',
          farmerName: 'حاج احمد رضایی',
          farmerPhone: '09121112233',
          destinationAddress: 'کیلومتر ۵ جاده گرگان، سالن ۲ مرغداری',
          productName: 'پیش‌دان کرامبل ویژه',
          weightKg: 10000,
          status: 'ASSIGNED',
        },
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartTransit = async (deliveryId: string) => {
    try {
      await mobileApi.post(`/deliveries/${deliveryId}/start-transit`);
      Alert.alert('شروع بارگیری', 'وضعیت بار به «در مسیر حمل» تغییر یافت.');
      loadData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'خطا در تغییر وضعیت');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedDelivery || !otpInput.trim()) return;
    setSubmitting(true);
    try {
      await mobileApi.post(`/deliveries/${selectedDelivery.id}/confirm`, {
        otp: otpInput.trim(),
        signature: 'SIGNED_ON_MOBILE_DEVICE',
      });

      Alert.alert('تحویل قطعی شد', 'رمز OTP تایید و حواله تحویل با موفقیت ثبت شد.');
      setConfirmModalVisible(false);
      setSelectedDelivery(null);
      setOtpInput('');
      loadData();
    } catch (err: any) {
      Alert.alert('خطای تایید OTP', err.message || 'رمز وارد شده اشتباه یا منقضی شده است.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>راننده گرامی، {user.fullName}</Text>
          <Text style={styles.roleBadge}>ناوگان حمل و تحویل خوراک طیور</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <Text style={styles.sectionTitle}>حواله‌های بارگیری و مقاصد تحویل</Text>

        {deliveries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>هیچ باری در حال حاضر به شما تخصیص نیافته است.</Text>
          </View>
        ) : (
          deliveries.map((del) => (
            <View key={del.id} style={styles.deliveryCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>سفارش {del.orderNumber || del.id.slice(0, 8)}</Text>
                <Text style={styles.statusBadge}>{del.status}</Text>
              </View>

              <Text style={styles.farmerName}>تحویل‌گیرنده: {del.farmerName}</Text>
              <Text style={styles.phoneText}>تماس: {del.farmerPhone}</Text>
              <Text style={styles.addressText}>مقصد: {del.destinationAddress}</Text>

              <View style={styles.productBanner}>
                <Text style={styles.productName}>{del.productName}</Text>
                <Text style={styles.productWeight}>{(del.weightKg || 0).toLocaleString()} کیلوگرم</Text>
              </View>

              <View style={styles.actionButtons}>
                {del.status === 'ASSIGNED' && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => handleStartTransit(del.id)}
                  >
                    <Text style={styles.btnText}>خروج از کارخانه و شروع حمل</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setSelectedDelivery(del);
                    setConfirmModalVisible(true);
                  }}
                >
                  <Text style={styles.btnText}>تأیید تحویل با رمز مرغدار (OTP)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* OTP Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تأیید تحویل و ثبت امضای دیجیتال</Text>
            <Text style={styles.modalSub}>
              کد ۶ رقمی پیامک شده به مرغدار ({selectedDelivery?.farmerName}) را دریافت و وارد نمایید:
            </Text>

            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="••••••"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                disabled={submitting || otpInput.length < 6}
                onPress={handleConfirmDelivery}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'در حال راستی‌آزمایی...' : 'تأیید قطعی تحویل'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>انصراف</Text>
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
    color: '#3b82f6',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'right',
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
  deliveryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  productBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  productWeight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  actionButtons: {
    marginTop: 14,
    gap: 8,
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  otpInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 10,
    color: '#047857',
    marginBottom: 16,
  },
  modalActions: {
    width: '100%',
    gap: 8,
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
