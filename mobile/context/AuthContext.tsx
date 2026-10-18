import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/constants/Config';

export interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  roles?: string[];
  isCompany?: boolean;
  followersCount?: number;
  followingCount?: number;
  savedPostsCount?: number;
  unreadNotificationsCount?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string, age?: number, isCompany?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  deleteAccount: async () => false,
  refreshUser: async () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      const received = json.data?.user;
      if (received) {
        setUser((prev) => ({
          ...prev,
          id: received.id,
          email: received.email,
          name: received.displayName || received.username || received.email,
          displayName: received.displayName,
          username: received.username,
          avatarUrl: received.avatarUrl,
          bio: received.bio,
          phone: received.phone,
          roles: received.roles || [],
          isCompany: received.roles?.includes('COMPANY') || received.roles?.includes('EMPRESA'),
          followersCount: received.followersCount || 0,
          followingCount: received.followingCount || 0,
          savedPostsCount: received.savedPostsCount || 0,
          unreadNotificationsCount: received.unreadNotificationsCount || 0,
        }));
      }
    } catch {}
  }, [token]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
          tokenResponse: true,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.data?.accessToken) {
        setIsLoading(false);
        return {
          success: false,
          error: json?.message || 'Credenciales incorrectas.',
        };
      }

      const receivedUser = json.data.user;
      const roles: string[] = receivedUser.roles || [];
      const isCompany = roles.includes('COMPANY') || roles.includes('EMPRESA');

      const appUser: User = {
        id: receivedUser.id,
        email: receivedUser.email,
        name: receivedUser.displayName || receivedUser.username || receivedUser.email,
        displayName: receivedUser.displayName,
        username: receivedUser.username,
        avatarUrl: receivedUser.avatarUrl || null,
        bio: receivedUser.bio || null,
        phone: receivedUser.phone || null,
        roles,
        isCompany,
        followersCount: receivedUser.followersCount || 0,
        followingCount: receivedUser.followingCount || 0,
        savedPostsCount: receivedUser.savedPostsCount || 0,
        unreadNotificationsCount: receivedUser.unreadNotificationsCount || 0,
      };

      setUser(appUser);
      setToken(json.data.accessToken);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor.',
      };
    }
  };

  const register = async (name: string, email: string, pass: string, age = 18, isCompany = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          displayName: name.trim(),
          email: email.trim().toLowerCase(),
          password: pass,
          age,
          termsAccepted: true,
          tokenResponse: true,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.data?.accessToken) {
        setIsLoading(false);
        return {
          success: false,
          error: json?.message || 'No se pudo completar el registro.',
        };
      }

      const receivedUser = json.data.user;
      const roles: string[] = receivedUser.roles || [];

      const appUser: User = {
        id: receivedUser.id,
        email: receivedUser.email,
        name: receivedUser.displayName || receivedUser.username || receivedUser.email,
        displayName: receivedUser.displayName,
        username: receivedUser.username,
        avatarUrl: receivedUser.avatarUrl || null,
        bio: receivedUser.bio || null,
        phone: receivedUser.phone || null,
        roles,
        isCompany,
        followersCount: 0,
        followingCount: 0,
        savedPostsCount: 0,
        unreadNotificationsCount: 0,
      };

      setUser(appUser);
      setToken(json.data.accessToken);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Error de conexión al registrarse.',
      };
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
  };

  const deleteAccount = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
      } catch (err) {
        console.warn('Error deleting account on backend:', err);
      }
    }
    setUser(null);
    setToken(null);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        deleteAccount,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
