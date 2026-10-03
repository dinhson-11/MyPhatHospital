import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { authService } from '../services/authService';
import { AuthProvider, useAuth } from '../context/AuthContext';

describe('Authentication & Authorization Suite (Enterprise Grade)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should authenticate Admin user successfully with correct credentials', async () => {
    const res = await authService.login('admin', 'Admin@123');

    expect(res.success).toBe(true);
    expect(res.user.username).toBe('admin');
    expect(res.user.roles).toContain('ADMIN');
    expect(res.token).toBeDefined();

    expect(authService.getToken()).toBe(res.token);
    expect(authService.getCurrentUser().username).toBe('admin');
  });

  it('should authenticate Patient user successfully with correct credentials', async () => {
    const res = await authService.login('benhnhan', 'Password@123');

    expect(res.success).toBe(true);
    expect(res.user.username).toBe('benhnhan');
    expect(res.user.roles).toContain('PATIENT');
  });

  it('should reject login attempt when given incorrect password', async () => {
    await expect(authService.login('admin', 'WrongPass@999')).rejects.toThrow(
      'Tên đăng nhập hoặc mật khẩu không chính xác!'
    );
  });

  it('should register a new patient account and persist in storage', async () => {
    const uniqueUsername = `testpatient_${Date.now()}`;
    const newUserData = {
      fullName: 'Bệnh Nhân Kiểm Thử',
      username: uniqueUsername,
      email: `${uniqueUsername}@gmail.com`,
      phone: '0988776655',
      password: 'Password@123'
    };

    const res = await authService.register(newUserData);
    expect(res.success).toBe(true);
    expect(res.user.username).toBe(uniqueUsername);
    expect(res.user.roles).toContain('PATIENT');

    // Trying to register again with same username should be rejected
    await expect(authService.register(newUserData)).rejects.toThrow();
  });

  it('should clear stored session and state upon logout', async () => {
    await authService.login('benhnhan', 'Password@123');
    expect(authService.getToken()).not.toBeNull();

    authService.logout();
    expect(authService.getToken()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('should provide dynamic state through React useAuth hook', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);

    // Login as Admin
    await act(async () => {
      await result.current.login('admin', 'Admin@123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user.username).toBe('admin');

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
