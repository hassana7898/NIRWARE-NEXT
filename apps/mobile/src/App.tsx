import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { UserRole } from '@nirware/config';
import { MobileUser } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { ManagerDashboardScreen } from './screens/ManagerDashboardScreen';
import { FarmerOrdersScreen } from './screens/FarmerOrdersScreen';
import { DriverDeliveryScreen } from './screens/DriverDeliveryScreen';
import { StorageService } from './services/storage.service';
import { setAuthToken, mobileApi, setMobileApiBaseUrl } from './api/client';
import { getApiConfig } from './config/api';
import { initDemoMode, isDemoModeActive, toggleDemoMode } from './config/demo';

export const App: React.FC = () => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasValidApi, setHasValidApi] = useState(getApiConfig().isValid);
  const [activeRoleView, setActiveRoleView] = useState<UserRole | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await initDemoMode();
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
    setActiveRoleView(loggedInUser.role);
  };

  const handleLogout = async () => {
    try {
      await mobileApi.post('/auth/logout').catch(() => {});
    } catch {}
    await StorageService.clearSession();
    setAuthToken(null);
    setUser(null);
    setActiveRoleView(null);
  };

  const isDemo = isDemoModeActive();

  // If API URL is invalid AND demo mode is not active, display fail-closed card with demo mode option
  if (!hasValidApi && !isDemo) {
    const apiConfig = getApiConfig();
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.errorCard}>
          <Text style={styles.errorBadge}>پیکربندی ناقص (FAIL-CLOSED)</Text>
          <Text style={styles.errorTitle}>آدرس سرور API تنظیم نشده است</Text>
          <Text style={styles.errorMessage}>{apiConfig.error}</Text>

          <TouchableOpacity
            style={styles.demoBypassBtn}
            onPress={async () => {
              await toggleDemoMode(true);
              setIsInitializing(false);
            }}
          >
            <Text style={styles.demoBypassBtnText}>⚡ ورود به حالت دموی آفلاین (پیش‌نمایش UI)</Text>
          </TouchableOpacity>

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

  // Derive active persona for demo view switching
  const effectiveRole = isDemo && activeRoleView ? activeRoleView : user?.role;
  let effectiveUser: MobileUser | null = user;
  if (user && isDemo && activeRoleView) {
    if (activeRoleView === UserRole.DRIVER) {
      effectiveUser = {
        ...user,
        role: UserRole.DRIVER,
        fullName: user.username === 'driver1' ? user.fullName : 'آقای صادقی (راننده ترابری)',
        driverId: 'drv-01',
      };
    } else if (activeRoleView === UserRole.FARMER) {
      effectiveUser = {
        ...user,
        role: UserRole.FARMER,
        fullName: user.username === 'farmer1' ? user.fullName : 'حاج رضا مرادی (مرغداری سبز)',
        farmerId: 'far-01',
      };
    } else {
      effectiveUser = {
        ...user,
        role: UserRole.MANAGER,
        fullName: user.username === 'manager' ? user.fullName : 'مهندس حسینی (مدیر تولید و کارخانه)',
      };
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={user ? 'dark-content' : 'light-content'} backgroundColor={user ? '#ffffff' : '#0f172a'} />
      {!effectiveUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : effectiveRole === UserRole.DRIVER ? (
        <DriverDeliveryScreen
          user={effectiveUser}
          onLogout={handleLogout}
          onSwitchRole={isDemo ? setActiveRoleView : undefined}
        />
      ) : effectiveRole === UserRole.FARMER ? (
        <FarmerOrdersScreen
          user={effectiveUser}
          onLogout={handleLogout}
          onSwitchRole={isDemo ? setActiveRoleView : undefined}
        />
      ) : (
        <ManagerDashboardScreen
          user={effectiveUser}
          onLogout={handleLogout}
          onSwitchRole={isDemo ? setActiveRoleView : undefined}
        />
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
  demoBypassBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  demoBypassBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
