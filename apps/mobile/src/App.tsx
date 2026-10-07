import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { UserRole } from '@nirware/config';
import { MobileUser } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { ManagerDashboardScreen } from './screens/ManagerDashboardScreen';
import { FarmerOrdersScreen } from './screens/FarmerOrdersScreen';
import { DriverDeliveryScreen } from './screens/DriverDeliveryScreen';
import { StorageService } from './services/storage.service';
import { setAuthToken } from './api/client';

export const App: React.FC = () => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
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
    await StorageService.clearSession();
    setAuthToken(null);
    setUser(null);
  };

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
});

export default App;
