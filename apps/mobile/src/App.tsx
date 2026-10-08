import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { UserRole } from '@nirware/config';
import { MobileUser } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { ManagerDashboardScreen } from './screens/ManagerDashboardScreen';
import { FarmerOrdersScreen } from './screens/FarmerOrdersScreen';
import { DriverDeliveryScreen } from './screens/DriverDeliveryScreen';
import { StorageService } from './services/storage.service';
import { setAuthToken, mobileApi, setMobileApiBaseUrl } from './api/client';
import { getApiConfig } from './config/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasValidApi, setHasValidApi] = useState(getApiConfig().isValid);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const customUrl = await StorageService.getCustomApiUrl();
        if (customUrl) {
          setMobileApiBaseUrl(customUrl);
          setHasValidApi(true);
        }
        const session = await StorageService.getSession();
        if (session?.token && session?.user) {
          setAuthToken(session.token);
          setUser(session.user);
        }
      } catch (e) {
        console.warn('Failed to restore mobile session', e);
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  const handleLoginSuccess = async (loggedInUser: MobileUser, token: string) => {
    await StorageService.saveSession(token, loggedInUser);
    setAuthToken(token);
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await mobileApi.post('/auth/logout').catch(() => {});
    } catch {}
    await StorageService.clearSession();
    setAuthToken(null);
    setUser(null);
  };

  if (!hasValidApi) {
    const apiConfig = getApiConfig();
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.errorCard}>
          <Text style={styles.errorBadge}>پیکربندی ناقص (FAIL-CLOSED)</Text>
          <Text style={styles.errorTitle}>آدرس سرور API تنظیم نشده است</Text>
          <Text style={styles.errorMessage}>{apiConfig.error}</Text>
          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>راهنمای تنظیم محیطی (EXPO_PUBLIC_API_URL):</Text>
            <Text style={styles.helpText}>• شبیه‌ساز اندروید: http://10.0.2.2:4000/api/v1</Text>
            <Text style={styles.helpText}>• دستگاه فیزیکی: http://192.168.x.x:4000/api/v1</Text>
            <Text style={styles.helpText}>• سرور پروداکشن: https://api.nirware.ir/api/v1</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={user ? 'dark-content' : 'light-content'} backgroundColor={user ? '#ffffff' : '#0f172a'} />
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : user.role === UserRole.DRIVER ? (
        <DriverDeliveryScreen user={user} onLogout={handleLogout} />
      ) : user.role === UserRole.FARMER ? (
        <FarmerOrdersScreen user={user} onLogout={handleLogout} />
      ) : (
        <ManagerDashboardScreen user={user} onLogout={handleLogout} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  errorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorBadge: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  helpBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  helpTitle: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
});

export default App;
