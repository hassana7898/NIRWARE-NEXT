import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { mobileApi, setAuthToken, setMobileApiBaseUrl } from '../api/client';
import { StorageService } from '../services/storage.service';
import { getApiConfig } from '../config/api';
import { MobileUser } from '../types';
import { isDemoModeActive, toggleDemoMode } from '../config/demo';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUser, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isDemo, setIsDemo] = useState(isDemoModeActive());
  const [username, setUsername] = useState(isDemoModeActive() || __DEV__ ? 'manager' : '');
  const [password, setPassword] = useState(isDemoModeActive() || __DEV__ ? 'password123' : '');
  const [loading, setLoading] = useState(false);

  // Runtime Server API URL State
  const [currentApiUrl, setCurrentApiUrl] = useState(mobileApi.getBaseUrl?.() || getApiConfig().baseUrl);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const demo = isDemoModeActive();
    setIsDemo(demo);
    if (demo) {
      setUsername('manager');
      setPassword('password123');
    }
    StorageService.getCustomApiUrl().then((stored) => {
      if (stored) {
        setCurrentApiUrl(stored);
        setCustomUrlInput(stored);
      } else {
        const defaultUrl = mobileApi.getBaseUrl?.() || getApiConfig().baseUrl;
        setCurrentApiUrl(defaultUrl);
        setCustomUrlInput(defaultUrl);
      }
    });
  }, []);

  const handleTestConnection = async (urlToTest = customUrlInput) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const clean = urlToTest.trim().replace(/\/$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        throw new Error('آدرس سرور باید با http:// یا https:// آغاز شود.');
      }
      const testEndpoint = `${clean}/health`;
      const start = Date.now();
      const res = await fetch(testEndpoint, { method: 'GET' });
      const duration = Date.now() - start;
      if (res.ok) {
        setTestResult({
          success: true,
          message: `اتصال با سرور برقرار است (زمان پاسخ: ${duration} میلی‌ثانیه).`,
        });
      } else {
        setTestResult({
          success: false,
          message: `سرور کد خطا بازگرداند: ${res.status} ${res.statusText}`,
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `عدم برقراری ارتباط: ${e.message || 'سرور در دسترس نیست.'}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServerUrl = async () => {
    const clean = customUrlInput.trim().replace(/\/$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      Alert.alert('خطا', 'آدرس سرور باید با http:// یا https:// آغاز شود.');
      return;
    }
    await StorageService.setCustomApiUrl(clean);
    setMobileApiBaseUrl(clean);
    setCurrentApiUrl(clean);
    setServerModalVisible(false);
    Alert.alert('تنظیم شد', `نشانی سرور به روزرسانی شد:\n${clean}`);
  };

  const handleResetServerUrl = async () => {
    await StorageService.setCustomApiUrl(null);
    const defaultUrl = getApiConfig().baseUrl;
    setMobileApiBaseUrl(defaultUrl);
    setCurrentApiUrl(defaultUrl);
    setCustomUrlInput(defaultUrl);
    setServerModalVisible(false);
    Alert.alert('بازنشانی شد', `نشانی سرور به مقدار پیش‌فرض بیلد بازگردانده شد:\n${defaultUrl}`);
  };

  const handleLogin = async (userToLogin = username, passToLogin = password) => {
    setLoading(true);
    try {
      const res = await mobileApi.post<{
        token: string;
        user: MobileUser;
        farmerId?: string | null;
        driverId?: string | null;
      }>('/auth/login', {
        username: userToLogin,
        password: passToLogin,
      });

      const loggedInUser: MobileUser = {
        ...res.user,
        farmerId: res.farmerId ?? res.user?.farmerId ?? null,
        driverId: res.driverId ?? res.user?.driverId ?? null,
      };

      setAuthToken(res.token);
      onLoginSuccess(loggedInUser, res.token);
    } catch (err: any) {
      if (
        err.code === 'NETWORK_UNREACHABLE' ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('عدم برقراری ارتباط')
      ) {
        Alert.alert(
          'خطای ارتباط با سرور',
          `امکان برقراری ارتباط با سرور سامانه وجود ندارد.\n\n🌐 نشانی سرور: ${currentApiUrl}\n\nجهت مشاهده و بررسی UI و امکانات می‌توانید بلافاصله وارد حالت دموی آفلاین شوید:`,
          [
            {
              text: '⚡ ورود فوری به حالت دمو',
              onPress: async () => {
                await toggleDemoMode(true);
                setIsDemo(true);
                handleLogin('manager', 'password123');
              },
            },
            {
              text: 'تنظیم نشانی سرور',
              onPress: () => setServerModalVisible(true),
            },
            {
              text: 'انصراف',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('خطای ورود', err.message || 'نام کاربری یا کلمه عبور نادرست است.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>NIRWARE NEXT</Text>
        <Text style={styles.brandSubtitle}>سامانه هوشمند کارخانه خوراک و ناوگان طیور</Text>
      </View>

      <View style={styles.card}>
        {/* Demo Mode Notice Banner */}
        {isDemo && (
          <View style={styles.demoBanner}>
            <View style={styles.demoBannerHeader}>
              <Text style={styles.demoBannerBadge}>آفلاین / UI PREVIEW</Text>
              <Text style={styles.demoBannerTitle}>حالت پیش‌نمایش محلی (Demo)</Text>
            </View>
            <Text style={styles.demoBannerDesc}>
              ورود مستقل از سرور با داده‌های واقعی کارخانه خوراک، خطوط پلت، سیلوها و ناوگان
            </Text>
          </View>
        )}

        <Text style={styles.cardTitle}>ورود به سامانه همراه</Text>

        <Text style={styles.label}>نام کاربری</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="نام کاربری خود را وارد کنید"
        />

        <Text style={styles.label}>رمز عبور</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => handleLogin()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnText}>ورود به حساب کاربری</Text>
          )}
        </TouchableOpacity>

        {/* Quick Demo One-Tap Login Button */}
        {isDemo && (
          <TouchableOpacity
            style={styles.quickDemoManagerBtn}
            onPress={() => {
              setUsername('manager');
              setPassword('password123');
              handleLogin('manager', 'password123');
            }}
            disabled={loading}
          >
            <Text style={styles.quickDemoManagerText}>⚡ ورود سریع مدیر کارخانه (یک لمس)</Text>
          </TouchableOpacity>
        )}

        {/* Mode Selector Pill */}
        <View style={styles.demoToggleContainer}>
          <TouchableOpacity
            style={[styles.demoTogglePill, isDemo && styles.demoTogglePillActive]}
            onPress={async () => {
              await toggleDemoMode(true);
              setIsDemo(true);
              setUsername('manager');
              setPassword('password123');
            }}
          >
            <Text style={[styles.demoToggleText, isDemo && styles.demoToggleTextActive]}>
              {isDemo ? '✓ حالت دموی آفلاین' : 'حالت دمو'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoTogglePill, !isDemo && styles.demoTogglePillActive]}
            onPress={async () => {
              await toggleDemoMode(false);
              setIsDemo(false);
            }}
          >
            <Text style={[styles.demoToggleText, !isDemo && styles.demoToggleTextActive]}>
              {!isDemo ? '✓ اتصال آنلاین سرور' : 'اتصال آنلاین سرور'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Demo Switchers (Always shown in Demo Mode or Dev) */}
        {(isDemo || __DEV__) && (
          <View style={styles.quickAccess}>
            <Text style={styles.quickTitle}>سایر حساب‌های پیش‌فرض دمو:</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickBadge}
                onPress={() => {
                  setUsername('manager');
                  setPassword('password123');
                  handleLogin('manager', 'password123');
                }}
              >
                <Text style={styles.quickBadgeText}>مدیر کارخانه</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBadge}
                onPress={() => {
                  setUsername('driver1');
                  setPassword('password123');
                  handleLogin('driver1', 'password123');
                }}
              >
                <Text style={styles.quickBadgeText}>راننده ناوگان</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBadge}
                onPress={() => {
                  setUsername('farmer1');
                  setPassword('password123');
                  handleLogin('farmer1', 'password123');
                }}
              >
                <Text style={styles.quickBadgeText}>مرغدار</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Server Endpoint Indicator & Config Trigger */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setServerModalVisible(true)}
        >
          <Text style={styles.serverPillText} numberOfLines={1}>
            ⚙️ نشانی سرور: {currentApiUrl}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Server Configuration Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تنظیم نشانی سرور API</Text>
            <Text style={styles.modalSubtitle}>
              امکان اتصال به سرور محلی Wi-Fi، پیش‌نمایش، یا سرور ابری کارخانه
            </Text>

            <Text style={styles.label}>نشانی کامل سرور (همراه با /api/v1):</Text>
            <TextInput
              style={styles.modalInput}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.0.49:4000/api/v1"
            />

            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testSuccess : styles.testFail,
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    testResult.success ? styles.testSuccessText : styles.testFailText,
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <Text style={styles.testBtnText}>⚡ بررسی زنده اتصال (تست سلامت سرور)</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.saveBtn]}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.saveBtnText}>ذخیره و اعمال</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.resetBtn]}
                onPress={handleResetServerUrl}
              >
                <Text style={styles.resetBtnText}>پیش‌فرض بیلد</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setServerModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'right',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'right',
  },
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  demoBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  demoBannerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoBannerBadge: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  demoBannerDesc: {
    fontSize: 11,
    color: '#15803d',
    lineHeight: 16,
    textAlign: 'right',
  },
  quickDemoManagerBtn: {
    backgroundColor: '#047857',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#059669',
  },
  quickDemoManagerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  demoToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  demoTogglePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoTogglePillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  demoToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  demoToggleTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  serverPill: {
    marginTop: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  serverPillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  quickAccess: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  quickTitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  quickBadge: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickBadgeText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14,
    direction: 'ltr',
    textAlign: 'left',
  },
  testResultBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  testSuccess: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  testFail: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  testResultText: {
    fontSize: 12,
    textAlign: 'center',
  },
  testSuccessText: {
    color: '#166534',
    fontWeight: '600',
  },
  testFailText: {
    color: '#991b1b',
    fontWeight: '600',
  },
  testBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  testBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#059669',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#f1f5f9',
  },
  resetBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
