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
import { MobileUser, MobileDelivery } from '../types';
import { LocationService } from '../services/location.service';
import { SignaturePad } from '../components/SignaturePad';

interface DriverDeliveryScreenProps {
  user: MobileUser;
  onLogout: () => void;
}

export const DriverDeliveryScreen: React.FC<DriverDeliveryScreenProps> = ({ user, onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<MobileDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<MobileDelivery | null>(null);

  // Modal states
  const [otpInput, setOtpInput] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const res = await mobileApi.get<MobileDelivery[]>('/deliveries/my');
      setDeliveries(res || []);
    } catch (e: any) {
      setError(e.message || 'خطا در برقراری ارتباط با سامانه کارخانه. لطفاً اتصال اینترنت خود را بررسی کنید.');
      setDeliveries([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    LocationService.requestPermission();
  }, []);

  const handleStartTransit = async (deliveryId: string) => {
    try {
      const coords = await LocationService.getCurrentLocation();
      await mobileApi.post(`/deliveries/${deliveryId}/start-transit`, {
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Alert.alert('شروع حمل بار', 'وضعیت بارنامه به «در مسیر حمل به سوی مرغداری» تغییر یافت.');
      loadData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'خطا در ثبت شروع حمل');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedDelivery || !otpInput.trim()) return;
    if (!capturedSignature) {
      Alert.alert('امضای تحویل الزامی است', 'لطفاً ابتدا امضای دیجیتال مرغدار یا نماینده مزرعه را اخذ فرمایید.');
      return;
    }

    setSubmitting(true);
    try {
      const coords = await LocationService.getCurrentLocation();
      await mobileApi.post(`/deliveries/${selectedDelivery.id}/confirm`, {
        otp: otpInput.trim(),
        signature: capturedSignature,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      Alert.alert('تأیید نهایی', 'رمز OTP راستی‌آزمایی شد و رسید تحویل با موفقیت ثبت و نهایی گردید.');
      setConfirmModalVisible(false);
      setSelectedDelivery(null);
      setOtpInput('');
      setCapturedSignature(null);
      loadData();
    } catch (err: any) {
      Alert.alert('خطای اعتبارسنجی OTP', err.message || 'کد وارد شده اشتباه یا منقضی شده است.');
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
          <Text style={styles.roleBadge}>سامانه همراه ناوگان ترابری و بارگیری</Text>
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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>در حال دریافت فهرست بارنامه‌های فعال...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>تلاش مجدد</Text>
            </TouchableOpacity>
          </View>
        ) : deliveries.length === 0 ? (
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

      {/* OTP and Digital Signature Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {showSignaturePad ? (
              <SignaturePad
                actorName={selectedDelivery?.farmerName || 'مرغدار'}
                deliveryId={selectedDelivery?.id || ''}
                onSave={(sigData) => {
                  setCapturedSignature(sigData);
                  setShowSignaturePad(false);
                }}
                onCancel={() => setShowSignaturePad(false)}
              />
            ) : (
              <>
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

                {/* Signature status box */}
                <TouchableOpacity
                  style={[styles.sigStatusBtn, capturedSignature ? styles.sigDone : styles.sigNeeded]}
                  onPress={() => setShowSignaturePad(true)}
                >
                  <Text style={[styles.sigStatusText, capturedSignature ? styles.sigDoneText : styles.sigNeededText]}>
                    {capturedSignature ? '✓ امضای دیجیتال مرغدار اخذ شد (تغییر)' : '✎ رسم و اخذ امضای دیجیتال مرغدار'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, (!capturedSignature || otpInput.length < 6) && styles.disabledSubmit]}
                    disabled={submitting || otpInput.length < 6 || !capturedSignature}
                    onPress={handleConfirmDelivery}
                  >
                    <Text style={styles.modalSubmitText}>
                      {submitting ? 'در حال راستی‌آزمایی...' : 'تأیید قطعی تحویل'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      setConfirmModalVisible(false);
                      setCapturedSignature(null);
                    }}
                  >
                    <Text style={styles.modalCancelText}>انصراف</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    marginBottom: 14,
  },
  sigStatusBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  sigNeeded: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sigDone: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  sigStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sigNeededText: {
    color: '#2563eb',
  },
  sigDoneText: {
    color: '#059669',
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
  disabledSubmit: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
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
