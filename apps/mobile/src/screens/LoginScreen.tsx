import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { mobileApi, setAuthToken } from '../api/client';
import { MobileUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUser, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(__DEV__ ? 'manager' : '');
  const [password, setPassword] = useState(__DEV__ ? 'password123' : '');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('خطای ورود', err.message || 'نام کاربری یا کلمه عبور نادرست است.');
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

        {/* Quick Demo Switchers (Dev Only) */}
        {__DEV__ && (
          <View style={styles.quickAccess}>
            <Text style={styles.quickTitle}>ورود سریع توسعه (حساب‌های آزمایشی):</Text>
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
                  setUsername('farmer1');
                  setPassword('password123');
                  handleLogin('farmer1', 'password123');
                }}
              >
                <Text style={styles.quickBadgeText}>مرغدار (مزرعه)</Text>
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
            </View>
          </View>
        )}
      </View>
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
  quickAccess: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
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
});
