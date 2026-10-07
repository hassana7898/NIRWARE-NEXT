import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { UserRole } from '@nirware/config';
import { MobileUser } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { ManagerDashboardScreen } from './screens/ManagerDashboardScreen';
import { FarmerOrdersScreen } from './screens/FarmerOrdersScreen';
import { DriverDeliveryScreen } from './screens/DriverDeliveryScreen';

export const App: React.FC = () => {
  const [user, setUser] = useState<MobileUser | null>(null);

  const handleLoginSuccess = (loggedInUser: MobileUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

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
});

export default App;
