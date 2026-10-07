import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '@nirware/config';
import { api } from '../api/client';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  farmerId?: string | null;
  driverId?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isManager: boolean;
  isFarmer: boolean;
  isDriver: boolean;
  isScaleOperator: boolean;
  isProductionOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nirware_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('nirware_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('nirware_token', newToken);
    localStorage.setItem('nirware_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    if (token) {
      api.post('/auth/logout').catch(() => {});
    }
    localStorage.removeItem('nirware_token');
    localStorage.removeItem('nirware_user');
    setToken(null);
    setUser(null);
  };

  const isManager = !!user && ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] as string[]).includes(user.role);
  const isFarmer = !!user && user.role === UserRole.FARMER;
  const isDriver = !!user && user.role === UserRole.DRIVER;
  const isScaleOperator = !!user && (user.role === UserRole.SCALE_OPERATOR || isManager);
  const isProductionOperator = !!user && (user.role === UserRole.PRODUCTION_OPERATOR || isManager);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        isManager,
        isFarmer,
        isDriver,
        isScaleOperator,
        isProductionOperator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
