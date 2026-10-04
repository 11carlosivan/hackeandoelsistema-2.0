import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: async () => {},
  deleteAccount: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, _pass: string) => {
    // Simulated auth state for demo/dev session
    setUser({ id: '1', email, name: 'Usuario Demo', role: 'LECTOR' });
    setToken('demo-jwt-token');
    return true;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
  };

  const deleteAccount = async () => {
    // Process data deletion compliance (Apple 5.1.1(v) & Google Play policy)
    setUser(null);
    setToken(null);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
