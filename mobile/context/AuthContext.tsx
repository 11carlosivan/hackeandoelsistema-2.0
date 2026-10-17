import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants/Config';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  roles?: string[];
  isCompany?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string, isCompany?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  deleteAccount: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        displayName: receivedUser.displayName,
        username: receivedUser.username,
        roles,
        isCompany,
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

  const register = async (name: string, email: string, pass: string, isCompany = false) => {
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
        displayName: receivedUser.displayName,
        username: receivedUser.username,
        roles,
        isCompany,
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
    setUser(null);
    setToken(null);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
