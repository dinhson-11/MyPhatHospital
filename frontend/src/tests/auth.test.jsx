import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { authService } from '../services/authService';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import AuthModal from '../components/modals/AuthModal';

// Hermetic: không gọi backend thật (mô phỏng mất kết nối -> luồng offline dev/test)
vi.mock('../services/api', () => {
  const offline = () => Promise.reject(new Error('Network Error'));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: '' };
});

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

describe('AuthModal UI', () => {
  const renderAuthModal = (props = {}) => {
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <AuthProvider>
          <AuthModal isOpen onClose={onClose} {...props} />
        </AuthProvider>
      </ToastProvider>
    );
    return { onClose };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders an accessible dialog named by its title with login/register tabs', () => {
    renderAuthModal();

    expect(screen.getByRole('dialog', { name: 'Đăng Nhập Hệ Thống' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên đăng nhập/)).toHaveAttribute('placeholder', expect.stringMatching(/Nhập tên đăng nhập/i));
    expect(screen.getByRole('tab', { name: 'Đăng Nhập' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Đăng Ký Mới' }));
    expect(screen.getByRole('dialog', { name: 'Đăng Ký Tài Khoản' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đăng Ký Mới' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Họ và tên/)).toBeInTheDocument();
  });

  it('shows demo quick-login accounts in development builds', () => {
    expect(import.meta.env.DEV).toBe(true);
    renderAuthModal();

    expect(screen.getByText('Tài khoản thử nghiệm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ban Giám Đốc/ }));
    expect(screen.getByLabelText(/Tên đăng nhập/)).toHaveValue('admin');
    expect(screen.getByLabelText(/Mật khẩu/)).toHaveValue('Admin@123');
  });

  it('hides demo accounts and credentials when not in development (production build)', () => {
    vi.stubEnv('DEV', false);
    expect(import.meta.env.DEV).toBe(false);
    renderAuthModal();

    expect(screen.getByRole('dialog', { name: 'Đăng Nhập Hệ Thống' })).toBeInTheDocument();
    expect(screen.queryByText('Tài khoản thử nghiệm')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ban Giám Đốc/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin@123|Doctor@123/)).not.toBeInTheDocument();
  });

  it('announces validation and authentication errors in Vietnamese via role="alert"', async () => {
    const { onClose } = renderAuthModal();

    fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên đăng nhập và mật khẩu.');

    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'WrongPass@999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập' }));

    expect(await screen.findByText('Tên đăng nhập hoặc mật khẩu không chính xác!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Tên đăng nhập hoặc mật khẩu không chính xác!');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('logs in successfully and closes the modal', async () => {
    const { onClose } = renderAuthModal();

    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: 'benhnhan' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'Password@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(authService.getCurrentUser().username).toBe('benhnhan');
  });

  it('validates the password policy and sends the phone number when registering', async () => {
    const { onClose } = renderAuthModal({ initialTab: 'register' });
    const username = `bn_ui_${Date.now()}`;

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Nguyễn Văn An' } });
    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: username } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '0912345678' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: `${username}@gmail.com` } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu/), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tài Khoản Mới' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/tối thiểu 8 ký tự/);

    fireEvent.change(screen.getByLabelText(/^Mật khẩu/), { target: { value: 'Password@123' } });
    fireEvent.change(screen.getByLabelText(/Nhập lại mật khẩu/), { target: { value: 'Password@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Tài Khoản Mới' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(authService.getCurrentUser()).toMatchObject({ username, phone: '0912345678' });
  });
});
