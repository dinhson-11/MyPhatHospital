import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { authService } from '../services/authService';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import AuthModal from '../components/modals/AuthModal';

// Backend giả lập có kiểm soát (không gọi mạng thật). `backend.online = false` mô phỏng mất kết nối.
const backend = vi.hoisted(() => ({ online: true, users: {} }));

vi.mock('../services/api', () => {
  const respondError = (status, message) => Promise.reject(
    Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: { message } } })
  );
  const authResponse = (user) => ({
    success: true,
    data: { accessToken: `access_${user.username}`, refreshToken: `refresh_${user.username}`, tokenType: 'Bearer', user }
  });
  const post = vi.fn((url, body) => {
    if (!backend.online) return Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    if (url === '/auth/login') {
      const u = backend.users[body.username];
      if (!u || u.password !== body.password) return respondError(401, 'Tên đăng nhập hoặc mật khẩu không chính xác!');
      return Promise.resolve(authResponse(u.profile));
    }
    if (url === '/auth/register') {
      if (backend.users[body.username]) return respondError(409, 'Tên đăng nhập đã tồn tại trên hệ thống!');
      const profile = { id: 99, username: body.username, fullName: body.fullName, phone: body.phone, roles: ['PATIENT'] };
      backend.users[body.username] = { password: body.password, profile };
      return Promise.resolve(authResponse(profile));
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  return { default: { get: vi.fn(), post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() }, BASE_URL: '' };
});

const seedBackend = () => {
  backend.online = true;
  backend.users = {
    admin: { password: 'Admin@123', profile: { id: 1, username: 'admin', fullName: 'Ban Giám Đốc', roles: ['ADMIN'] } },
    benhnhan: { password: 'Password@123', profile: { id: 2, username: 'benhnhan', fullName: 'Trần Đức Minh', roles: ['PATIENT'] } }
  };
};

describe('Authentication & Authorization Suite (Enterprise Grade)', () => {
  beforeEach(() => {
    localStorage.clear();
    seedBackend();
  });

  it('should authenticate Admin user successfully with correct credentials', async () => {
    const res = await authService.login('admin', 'Admin@123');

    expect(res.success).toBe(true);
    expect(res.user.username).toBe('admin');
    expect(res.user.roles).toContain('ADMIN');
    expect(res.token).toBe('access_admin');

    expect(authService.getToken()).toBe(res.token);
    expect(authService.getRefreshToken()).toBe('refresh_admin');
    expect(authService.getCurrentUser().username).toBe('admin');
  });

  it('should authenticate Patient user successfully with correct credentials', async () => {
    const res = await authService.login('benhnhan', 'Password@123');

    expect(res.success).toBe(true);
    expect(res.user.roles).toContain('PATIENT');
  });

  it('should reject login attempt when given incorrect password', async () => {
    await expect(authService.login('admin', 'WrongPass@999')).rejects.toThrow(
      'Tên đăng nhập hoặc mật khẩu không chính xác!'
    );
    expect(authService.getToken()).toBeNull();
  });

  it('should NOT log in offline (no fake token) when the backend is unreachable', async () => {
    backend.online = false;
    await expect(authService.login('admin', 'Admin@123')).rejects.toThrow();
    expect(authService.getToken()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('should NOT register offline when the backend is unreachable', async () => {
    backend.online = false;
    await expect(authService.register({
      fullName: 'Bệnh Nhân', username: 'offline_user', phone: '0988776655', password: 'Password@123'
    })).rejects.toThrow();
    expect(authService.getToken()).toBeNull();
  });

  it('should register a new patient account and reject a duplicate username', async () => {
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
    expect(authService.getRefreshToken()).toBe(`refresh_${uniqueUsername}`);
    // Mật khẩu không bao giờ được lưu vào trình duyệt
    expect(JSON.stringify({ ...localStorage })).not.toContain('Password@123');

    await expect(authService.register(newUserData)).rejects.toThrow('Tên đăng nhập đã tồn tại');
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
    seedBackend();
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

  it('shows usernames and passwords of the 6 demo accounts on the login form', () => {
    renderAuthModal();

    const expected = [
      ['admin', 'Admin@123'], ['bs.maianh', 'Doctor@123'], ['ds.quang', 'Pharmacist@123'],
      ['letan', 'Receptionist@123'], ['dieuduong', 'Nurse@123'], ['benhnhan', 'Password@123']
    ];
    expected.forEach(([user, pass]) => {
      expect(screen.getAllByText(user).length).toBeGreaterThan(0);
      expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === `${user} / ${pass}`)).toBeInTheDocument();
    });
    // Vai trò Kế toán đã gộp vào Lễ tân - Kế toán: không còn tài khoản demo riêng
    expect(screen.queryByText(/ketoan|Accountant@123/)).not.toBeInTheDocument();
    expect(screen.getByText(/Lễ tân – Kế toán/)).toBeInTheDocument();
  });

  it('shows demo accounts in a production build when VITE_SHOW_DEMO_ACCOUNTS=true', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SHOW_DEMO_ACCOUNTS', 'true');
    renderAuthModal();

    expect(screen.getByText('Tài khoản thử nghiệm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lễ tân – Kế toán/ }));
    expect(screen.getByLabelText(/Tên đăng nhập/)).toHaveValue('letan');
    expect(screen.getByLabelText(/Mật khẩu/)).toHaveValue('Receptionist@123');
  });

  it('hides demo accounts and credentials when not in development (production build)', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SHOW_DEMO_ACCOUNTS', 'false');
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
