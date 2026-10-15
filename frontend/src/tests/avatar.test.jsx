import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import { userService } from '../services/userService';
import Avatar from '../components/common/Avatar';
import { getInitials } from '../utils/format';
import AvatarUploader from '../components/common/AvatarUploader';
import UserProfileModal from '../components/modals/UserProfileModal';
import DoctorsSection from '../components/home/DoctorsSection';
import { syncCatalogWithBackend } from '../services/dataService';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const jpg = (size = 10) => new File([new Uint8Array(size)], 'anh.jpg', { type: 'image/jpeg' });

describe('Avatar – ảnh đại diện dùng chung', () => {
  it('lấy 2 chữ cái cuối của họ tên', () => {
    expect(getInitials('Vi Mai Anh')).toBe('MA');
    expect(getInitials('admin')).toBe('A');
    expect(getInitials('')).toBe('U');
  });

  it('có link ảnh → hiện ảnh; không có → hiện chữ cái đầu tên', () => {
    const { rerender, container } = render(<Avatar name="Vi Mai Anh" src="https://cdn/ma.jpg" alt="BS Mai Anh" />);
    expect(screen.getByRole('img', { name: 'BS Mai Anh' })).toHaveAttribute('src', 'https://cdn/ma.jpg');

    rerender(<Avatar name="Vi Mai Anh" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('MA');
  });

  it('ảnh lỗi (link hỏng / mất mạng) → quay về chữ cái đầu tên', () => {
    const { container } = render(<Avatar name="Vi Mai Anh" src="https://cdn/hong.jpg" />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('MA');
  });
});

describe('userService – ảnh đại diện', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tự đổi ảnh: gửi multipart lên /users/me/avatar, trả về link ảnh mới', async () => {
    api.post.mockReturnValueOnce(ok({ avatarUrl: 'https://cdn/me.jpg' }));
    const file = jpg();

    await expect(userService.uploadMyAvatar(file)).resolves.toBe('https://cdn/me.jpg');

    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/users/me/avatar');
    expect(body.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.timeout).toBeGreaterThanOrEqual(30000);
  });

  it('gỡ ảnh của mình và quản trị viên đổi / gỡ ảnh tài khoản khác', async () => {
    api.delete.mockReturnValue(ok(null));
    api.post.mockReturnValueOnce(ok({ avatarUrl: 'https://cdn/12.jpg' }));

    await userService.removeMyAvatar();
    expect(api.delete).toHaveBeenLastCalledWith('/users/me/avatar');

    await expect(userService.uploadUserAvatar(12, jpg())).resolves.toBe('https://cdn/12.jpg');
    expect(api.post.mock.calls[0][0]).toBe('/users/12/avatar');

    await userService.removeUserAvatar(12);
    expect(api.delete).toHaveBeenLastCalledWith('/users/12/avatar');
  });
});

describe('AvatarUploader – đổi / gỡ ảnh', () => {
  it('chọn ảnh hợp lệ → tải lên và hiện ảnh mới', async () => {
    const onUpload = vi.fn().mockResolvedValue('https://cdn/new.jpg');
    render(<AvatarUploader name="Vi Mai Anh" avatarUrl={null} onUpload={onUpload} onRemove={vi.fn()} />);
    const file = jpg();

    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
    expect(screen.queryByRole('button', { name: /Gỡ ảnh/ })).toBeInTheDocument();
  });

  it('chặn file không phải JPG/PNG/WebP hoặc quá 5MB ngay ở trình duyệt', async () => {
    const onUpload = vi.fn();
    render(<AvatarUploader name="A" avatarUrl={null} onUpload={onUpload} onRemove={vi.fn()} />);
    const input = screen.getByLabelText('Chọn ảnh đại diện');

    fireEvent.change(input, { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');

    fireEvent.change(input, { target: { files: [jpg(5 * 1024 * 1024 + 1)] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('tối đa 5MB');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('gỡ ảnh → gọi onRemove, quay về chữ cái đầu tên; lỗi máy chủ hiện nguyên văn', async () => {
    const onRemove = vi.fn().mockResolvedValue();
    const onUpload = vi.fn().mockRejectedValue(new Error('Kho ảnh đang gặp sự cố'));
    const { container } = render(
      <AvatarUploader name="Vi Mai Anh" avatarUrl="https://cdn/old.jpg" onUpload={onUpload} onRemove={onRemove} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Gỡ ảnh/ }));
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('img')).toBeNull());

    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), { target: { files: [jpg()] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Kho ảnh đang gặp sự cố');
  });
});

describe('UserProfileModal – tự đổi ảnh đại diện', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('hms_token', 'tok');
    localStorage.setItem('hms_user', JSON.stringify({ id: 7, username: 'bs.nga', fullName: 'BS Nga', roles: ['DOCTOR'] }));
  });

  it('đổi ảnh xong → phiên đăng nhập lưu link mới để mọi chỗ hiển thị cập nhật ngay', async () => {
    api.post.mockReturnValueOnce(ok({ avatarUrl: 'https://cdn/nga.jpg' }));
    render(
      <ToastProvider>
        <AuthProvider>
          <UserProfileModal isOpen onClose={vi.fn()} />
        </AuthProvider>
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), { target: { files: [jpg()] } });

    await waitFor(() => expect(JSON.parse(localStorage.getItem('hms_user')).avatarUrl).toBe('https://cdn/nga.jpg'));
    expect(api.post.mock.calls[0][0]).toBe('/users/me/avatar');
  });
});

describe('DoctorsSection – ảnh bác sĩ lấy từ tài khoản', () => {
  it('hiện ảnh đại diện của tài khoản bác sĩ; chưa có ảnh thì hiện chữ cái, không dùng ảnh minh họa', async () => {
    api.get.mockImplementation((url) => (url === '/public/doctors'
      ? ok([{ id: 101, username: 'bs.maianh', fullName: 'Vi Mai Anh', departmentId: 1, canBook: true, avatarUrl: 'https://cdn/maianh.jpg' }])
      : backendError(404, 'not found')));
    await syncCatalogWithBackend();

    const { container } = render(<DoctorsSection onOpenBooking={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'TS.BS Vi Mai Anh' })).toHaveAttribute('src', 'https://cdn/maianh.jpg');
    const imgs = Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(imgs.some((src) => /unsplash|ui-avatars/.test(src))).toBe(false);
    expect(within(container).getAllByRole('img').length).toBeGreaterThan(1);
  });
});
