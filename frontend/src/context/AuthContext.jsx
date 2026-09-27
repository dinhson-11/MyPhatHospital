import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(false);

  const syncAuth = useCallback(() => {
    setUser(authService.getCurrentUser());
    setToken(authService.getToken());
  }, []);

  useEffect(() => {
    window.addEventListener('hms_auth_changed', syncAuth);
    return () => window.removeEventListener('hms_auth_changed', syncAuth);
  }, [syncAuth]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = Boolean(user && token);
  const isAdmin = Boolean(user && user.roles && user.roles.includes('ADMIN'));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
