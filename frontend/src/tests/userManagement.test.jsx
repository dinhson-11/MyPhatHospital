import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import api from '../services/api';
import { userService } from '../services/userService';
import UserManagementPanel, { validateUserForm } from '../components/admin/UserManagementPanel';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../components/common/ConfirmDialog';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const page = (content, extra = {}) => ({ content, totalPages: 1, totalElements: content.length, number: 0, ...extra });

const USERS = [
  { id: 1, username: 'admin', fullName: 'Quản trị viên', email: 'admin@hospital.com', phone: '0900000000', status: 'ACTIVE', roles: ['ADMIN'], createdAt: '2026-10-01T08:00:00' },
  { id: 2, username: 'letan', fullName: 'CN. Hoàng Thùy Linh', email: 'letan@x.vn', phone: '0945678901', status: 'ACTIVE', roles: ['RECEPTIONIST'], createdAt: '2026-10-02T08:00:00' },
  { id: 3, username: 'bs.cu', fullName: 'BS. Cũ', email: null, phone: null, status: 'LOCKED', roles: ['DOCTOR'], createdAt: '2026-10-03T08:00:00' }
];

function renderPanel(loginAs = 'admin') {
  localStorage.setItem('hms_token', 'tok');
  localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: loginAs, roles: ['ADMIN'] }));
  return render(
    <ToastProvider>
      <AuthProvider>
        <ConfirmProvider>
          <UserManagementPanel />
        </ConfirmProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('Quản lý tài khoản (Quản trị viên)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockImplementation((url) => (url === '/users' ? ok(page(USERS)) : Promise.reject(new Error('unexpected ' + url))));
    api.post.mockImplementation((url, body) => ok({ id: 50, ...body }));
    api.put.mockImplementation((url, body) => ok({ id: 2, ...body }));
    api.patch.mockImplementation(() => ok(null));
  });

  describe('userService', () => {
    it('getUsers gọi GET /users kèm phân trang + tìm kiếm và trả danh sách + tổng trang', async () => {
      api.get.mockImplementation(() => ok(page(USERS, { totalPages: 3, totalElements: 25, number: 1 })));
      const res = await userService.getUsers({ page: 1, size: 10, search: ' linh ' });

      expect(api.get).toHaveBeenCalledWith('/users', { params: { page: 1, size: 10, sortBy: 'createdAt', sortDir: 'desc', search: 'linh' } });
      expect(res).toMatchObject({ totalPages: 3, totalElements: 25, page: 1 });
      expect(res.items).toHaveLength(3);
    });

    it('lock/unlock gọi đúng PATCH', async () => {
      await userService.lockUser(7);
      await userService.unlockUser(7);
      expect(api.patch).toHaveBeenNthCalledWith(1, '/users/7/lock');
      expect(api.patch).toHaveBeenNthCalledWith(2, '/users/7/unlock');
    });
  });

  describe('validateUserForm', () => {
    const base = { username: 'bs.moi', password: 'Doctor@123', fullName: 'BS Mới', email: '', phone: '', roleCodes: ['DOCTOR'] };

    it('hợp lệ → chuỗi rỗng', () => expect(validateUserForm(base, false)).toBe(''));
    it('mật khẩu yếu bị từ chối', () => {
      expect(validateUserForm({ ...base, password: 'abcdefgh' }, false)).toMatch(/Mật khẩu/);
      expect(validateUserForm({ ...base, password: 'Ab1' }, false)).toMatch(/Mật khẩu/);
    });
    it('bắt buộc họ tên, vai trò; email và SĐT đúng định dạng', () => {
      expect(validateUserForm({ ...base, fullName: ' ' }, false)).toMatch(/họ và tên/);
      expect(validateUserForm({ ...base, roleCodes: [] }, false)).toMatch(/vai trò/);
      expect(validateUserForm({ ...base, email: 'khong-hop-le' }, false)).toMatch(/Email/);
      expect(validateUserForm({ ...base, phone: '12345' }, false)).toMatch(/Số điện thoại/);
    });
    it('khi sửa không bắt buộc tên đăng nhập và mật khẩu', () => {
      expect(validateUserForm({ ...base, username: '', password: '' }, true)).toBe('');
    });
  });

  it('hiển thị danh sách tài khoản với vai trò "Lễ tân - Kế toán" và trạng thái khóa', async () => {
    renderPanel();

    expect(await screen.findByText('CN. Hoàng Thùy Linh')).toBeInTheDocument();
    expect(screen.getByText('Lễ tân - Kế toán')).toBeInTheDocument();
    expect(screen.getByText('Đã khóa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở khóa tài khoản bs.cu' })).toBeInTheDocument();
  });

  it('không cho tự khóa tài khoản của chính mình', async () => {
    renderPanel('admin');
    const selfLock = await screen.findByRole('button', { name: 'Khóa tài khoản admin' });
    expect(selfLock).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Khóa tài khoản letan' })).toBeEnabled();
  });

  it('khóa tài khoản: xác nhận rồi gọi PATCH /users/{id}/lock và tải lại danh sách', async () => {
    renderPanel();
    await screen.findByText('CN. Hoàng Thùy Linh');

    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản letan' }));
    const dialog = await screen.findByRole('dialog', { name: /Khóa tài khoản/ });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Khóa' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/users/2/lock'));
    await waitFor(() => expect(api.get.mock.calls.filter((c) => c[0] === '/users').length).toBeGreaterThanOrEqual(2));
  });

  it('tạo tài khoản: chặn mật khẩu yếu ở giao diện, hợp lệ thì POST /users với vai trò và hồ sơ nhân viên', async () => {
    renderPanel();
    await screen.findByText('CN. Hoàng Thùy Linh');

    fireEvent.click(screen.getByRole('button', { name: /Thêm tài khoản/ }));
    const form = await screen.findByRole('form', { name: 'Thêm tài khoản' });

    fireEvent.change(within(form).getByLabelText(/Tên đăng nhập/), { target: { value: 'bs.moi' } });
    fireEvent.change(within(form).getByLabelText(/Mật khẩu/), { target: { value: 'yeu' } });
    fireEvent.change(within(form).getByLabelText(/Họ và tên/), { target: { value: 'BS. Mới' } });
    fireEvent.click(within(form).getByLabelText('Bác sĩ'));
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/Mật khẩu/);
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText(/Mật khẩu/), { target: { value: 'Doctor@123' } });
    fireEvent.change(within(form).getByLabelText('Khoa / bộ phận'), { target: { value: '2' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/users');
    expect(body).toMatchObject({
      username: 'bs.moi', password: 'Doctor@123', fullName: 'BS. Mới', roleCodes: ['DOCTOR'],
      staffProfile: { departmentId: 2 }
    });
    expect(body.email).toBeUndefined(); // email trống không gửi
  });

  it('lỗi từ máy chủ (trùng tên đăng nhập) hiện đúng thông báo và không đóng form', async () => {
    api.post.mockImplementation(() => backendError(409, 'User đã tồn tại với username: letan', 'DUPLICATE_RESOURCE'));
    renderPanel();
    await screen.findByText('CN. Hoàng Thùy Linh');

    fireEvent.click(screen.getByRole('button', { name: /Thêm tài khoản/ }));
    const form = await screen.findByRole('form', { name: 'Thêm tài khoản' });
    fireEvent.change(within(form).getByLabelText(/Tên đăng nhập/), { target: { value: 'letan' } });
    fireEvent.change(within(form).getByLabelText(/Mật khẩu/), { target: { value: 'Receptionist@123' } });
    fireEvent.change(within(form).getByLabelText(/Họ và tên/), { target: { value: 'Trùng' } });
    fireEvent.click(within(form).getByLabelText('Lễ tân - Kế toán'));
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(/User đã tồn tại/);
    expect(screen.getByRole('form', { name: 'Thêm tài khoản' })).toBeInTheDocument();
  });

  it('sửa tài khoản: PUT /users/{id} không gửi tên đăng nhập/mật khẩu', async () => {
    renderPanel();
    await screen.findByText('CN. Hoàng Thùy Linh');

    fireEvent.click(screen.getByRole('button', { name: 'Sửa tài khoản letan' }));
    const form = await screen.findByRole('form', { name: 'Sửa tài khoản' });
    fireEvent.change(within(form).getByLabelText(/Họ và tên/), { target: { value: 'CN. Linh (đã sửa)' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [url, body] = api.put.mock.calls[0];
    expect(url).toBe('/users/2');
    expect(body.fullName).toBe('CN. Linh (đã sửa)');
    expect(body.roleCodes).toEqual(['RECEPTIONIST']);
    expect(body).not.toHaveProperty('username');
    expect(body).not.toHaveProperty('password');
  });

  it('ảnh đại diện: danh sách hiện ảnh; sửa tài khoản đổi ảnh ngay (POST /users/{id}/avatar) rồi tải lại danh sách', async () => {
    const withAvatar = USERS.map((u) => (u.id === 2 ? { ...u, avatarUrl: 'https://cdn/linh.jpg' } : u));
    api.get.mockImplementation(() => ok(page(withAvatar)));
    api.post.mockImplementation(() => ok({ avatarUrl: 'https://cdn/linh-moi.jpg' }));
    const { container } = renderPanel();

    await screen.findByText('CN. Hoàng Thùy Linh');
    expect(container.querySelector('img[src="https://cdn/linh.jpg"]')).not.toBeNull();
    const loadsBefore = api.get.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Sửa tài khoản letan' }));
    const dialog = await screen.findByRole('dialog', { name: /Sửa tài khoản letan/ });
    fireEvent.change(within(dialog).getByLabelText('Chọn ảnh đại diện'), {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] }
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/2/avatar', expect.any(FormData), expect.anything()));
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(loadsBefore));
    expect(JSON.parse(localStorage.getItem('hms_user')).avatarUrl).toBeUndefined();
  });

  it('quản trị viên đổi ảnh của chính mình → phiên đăng nhập cũng cập nhật ảnh', async () => {
    api.post.mockImplementation(() => ok({ avatarUrl: 'https://cdn/admin.jpg' }));
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Sửa tài khoản admin' }));
    const dialog = await screen.findByRole('dialog', { name: /Sửa tài khoản admin/ });
    fireEvent.change(within(dialog).getByLabelText('Chọn ảnh đại diện'), {
      target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] }
    });

    await waitFor(() => expect(JSON.parse(localStorage.getItem('hms_user')).avatarUrl).toBe('https://cdn/admin.jpg'));
  });

  it('lỗi tải danh sách: hiện thông báo và nút Thử lại', async () => {
    api.get.mockImplementation(() => backendError(403, 'Không đủ quyền truy cập', 'ACCESS_DENIED'));
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không đủ quyền truy cập/);
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
