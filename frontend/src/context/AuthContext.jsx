import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEYS = new Set(['hms_token', 'hms_user']);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(false);

  const syncAuth = useCallback(() => {
    setUser(authService.getCurrentUser());
    setToken(authService.getToken());
  }, []);

  useEffect(() => {
    // hms_auth_changed: đăng nhập/đăng xuất trong tab hiện tại (hoặc 401 từ API)
    // storage: đăng xuất ở tab khác → tab này cũng thoát để không lộ dữ liệu bệnh nhân
    const handleStorage = (event) => {
      if (event.key === null || AUTH_STORAGE_KEYS.has(event.key)) syncAuth();
    };
    window.addEventListener('hms_auth_changed', syncAuth);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hms_auth_changed', syncAuth);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncAuth]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      setUser(res.user);
      setToken(res.token);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Cập nhật hồ sơ người dùng đang đăng nhập (VD: { avatarUrl }) – mọi chỗ hiển thị đổi ngay. */
  const updateUser = useCallback((patch) => {
    setUser(authService.updateCurrentUser(patch));
  }, []);

  // Ổn định tham chiếu: AutoLogoutTimer và các effect khác phụ thuộc vào hàm này
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(user && token);
    const userRoles = Array.isArray(user?.roles) ? user.roles : [];
    const hasRole = (role) => userRoles.includes(role) || userRoles.includes(`ROLE_${role}`);
    const hasAnyRole = (...roles) => roles.some((r) => hasRole(r));

    const isAdmin = hasRole('ADMIN');
    const isDoctor = hasRole('DOCTOR') || isAdmin;
    // RECEPTIONIST = "Lễ tân - Kế toán": tiếp đón, thu viện phí và xem báo cáo doanh thu
    const isReceptionist = hasRole('RECEPTIONIST') || isAdmin;
    const isNurse = hasRole('NURSE') || isAdmin;
    const isPharmacist = hasRole('PHARMACIST') || isAdmin;
    const isPatient = hasRole('PATIENT');
    const isStaff = isAuthenticated && (isAdmin || isDoctor || isReceptionist || isNurse || isPharmacist);

    return {
      user,
      token,
      isAuthenticated,
      isAdmin,
      isDoctor,
      isReceptionist,
      isNurse,
      isPharmacist,
      isPatient,
      isStaff,
      hasRole,
      hasAnyRole,
      loading,
      login,
      register,
      logout,
      updateUser,
    };
  }, [user, token, loading, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
