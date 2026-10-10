import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import App from '../App';
import { authService } from '../services/authService';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import AutoLogoutTimer from '../components/common/AutoLogoutTimer';

// Hermetic: không gọi backend thật (mô phỏng mất kết nối → các service dùng luồng offline dev/test)
vi.mock('../services/api', () => {
  const offline = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: 'http://localhost:8080/api/v1' };
});

const loginAs = (roles, extra = {}) => {
  localStorage.setItem('hms_token', 'jwt_test_token');
  localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'tester', fullName: 'Người Kiểm Thử', email: 'tester@myphathospital.com', roles, ...extra }));
};

describe('UI & Component Integration Suite (Enterprise Grade)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render the homepage with complete header, hero, and main brand', () => {
    render(<App />);

    // Brand and hospital titles
    expect(screen.getAllByText(/Mỹ Phát/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Đặt Lịch Khám/i).length).toBeGreaterThan(0);
  });

  it('should open Auth Modal when clicking login button in navigation', async () => {
    render(<App />);

    const loginBtns = screen.getAllByRole('button', { name: /Đăng Nhập/i });
    expect(loginBtns.length).toBeGreaterThan(0);

    fireEvent.click(loginBtns[0]);

    // Modal should become visible
    expect(await screen.findByText('Đăng Nhập Hệ Thống')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập tên đăng nhập/i)).toBeInTheDocument();
  });

  it('should open Booking Modal when clicking booking button', async () => {
    render(<App />);

    const bookingBtns = screen.getAllByRole('button', { name: /Đặt Lịch Khám/i });
    expect(bookingBtns.length).toBeGreaterThan(0);

    fireEvent.click(bookingBtns[0]);

    // Booking modal should be open (hộp thoại có tên truy cập được)
    expect(await screen.findByRole('dialog', { name: /Đặt lịch khám/i })).toBeInTheDocument();
  });

  it('should trigger AI Triage analysis when clicking a quick suggestion tag', async () => {
    render(<App />);

    const quickTag = screen.getByRole('button', { name: /Đau tức ngực, khó thở/i });
    fireEvent.click(quickTag);

    // Should display AI Clinical assessment result
    expect(await screen.findByText('Kết Quả Đánh Giá Lâm Sàng')).toBeInTheDocument();
    expect(screen.getAllByText(/Khoa Khám bệnh \/ Cấp cứu ban đầu/i).length).toBeGreaterThan(0);
  });
});

describe('App shell – thanh điều hướng, không gian làm việc, bảo mật phiên', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('nhân viên: nút "Lịch trực" trên thanh điều hướng hiển thị và mở lịch trực', async () => {
    loginAs(['ADMIN']);
    render(<App />);

    const btn = screen.getByRole('button', { name: /^Lịch trực$/i });
    fireEvent.click(btn);
    expect(await screen.findByRole('dialog', { name: /Lịch Trực Nhân Viên Y Tế/i })).toBeInTheDocument();
  });

  it('nút không gian làm việc dùng tiếng Việt (không còn "Workspace")', () => {
    loginAs(['DOCTOR']);
    render(<App />);
    expect(screen.getByRole('button', { name: 'Không gian làm việc' })).toBeInTheDocument();
    expect(screen.queryByText(/^Workspace$/)).not.toBeInTheDocument();
  });

  it('menu di động có đủ mục Nhà thuốc & Viện phí cho vai trò được phép', () => {
    loginAs(['ADMIN']);
    render(<App />);

    const toggle = screen.getByRole('button', { name: 'Mở menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const nav = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(nav).getByRole('button', { name: /Nhà thuốc & cấp phát/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Hóa đơn & viện phí/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Lịch trực nhân viên/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
  });

  it('menu di động của dược sĩ không hiện mục Viện phí / Báo cáo', () => {
    loginAs(['PHARMACIST']);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const nav = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(nav).getByRole('button', { name: /Nhà thuốc & cấp phát/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /Hóa đơn & viện phí/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /Báo cáo & thống kê/i })).not.toBeInTheDocument();
  });

  it('menu tài khoản: aria-expanded, không còn gợi ý tiếng Anh, Esc để đóng', () => {
    loginAs(['ADMIN']);
    render(<App />);

    const accountBtn = screen.getByRole('button', { name: /Tài khoản: Người Kiểm Thử/i });
    fireEvent.click(accountBtn);
    expect(accountBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Báo cáo & thống kê' })).toBeInTheDocument();
    expect(screen.queryByText(/\((Reception|Nurse|Clinical|Pharmacy|Billing|Admin|BI)\)/)).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(accountBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('không gian làm việc: mục thanh bên của phân hệ đang mở được đánh dấu hiện tại', async () => {
    loginAs(['ADMIN']);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Không gian làm việc' }));
    const dashboardItem = screen.getByRole('button', { name: 'Bảng điều khiển' });
    expect(dashboardItem).toHaveAttribute('aria-current', 'page');

    const reportsItem = document.getElementById('sidebarReportsBtn');
    fireEvent.click(reportsItem);
    expect(await screen.findByRole('dialog', { name: /Báo cáo & thống kê bệnh viện/i })).toBeInTheDocument();
    expect(reportsItem).toHaveAttribute('aria-current', 'true');
    expect(dashboardItem).not.toHaveAttribute('aria-current');
  });

  it('đăng xuất (VD: hết phiên) đóng ngay mọi cửa sổ nghiệp vụ chứa dữ liệu và về cổng thông tin', async () => {
    loginAs(['ADMIN']);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Không gian làm việc' }));
    fireEvent.click(document.getElementById('sidebarReportsBtn'));
    expect(await screen.findByRole('dialog', { name: /Báo cáo & thống kê bệnh viện/i })).toBeInTheDocument();

    act(() => {
      authService.logout(); // giống AutoLogoutTimer / lỗi 401: phát sự kiện hms_auth_changed
    });

    expect(screen.queryByRole('dialog', { name: /Báo cáo & thống kê bệnh viện/i })).not.toBeInTheDocument();
    expect(document.getElementById('sidebarReportsBtn')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Đăng nhập/i }).length).toBeGreaterThan(0);

    // Đăng nhập lại: cửa sổ cũ không tự mở lại
    act(() => {
      authService.saveSession({ id: 1, username: 'tester', fullName: 'Người Kiểm Thử', roles: ['ADMIN'] }, 'jwt_test_token_2');
    });
    expect(screen.queryByRole('dialog', { name: /Báo cáo & thống kê bệnh viện/i })).not.toBeInTheDocument();
  });
});

describe('Thông báo nổi (Toast) – truy cập & thời gian hiển thị', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const Trigger = ({ message, type }) => {
    const { showToast } = useToast();
    return <button type="button" onClick={() => showToast(message, type)}>Hiện thông báo</button>;
  };

  it('thông báo thường nằm trong vùng role="status" và tự ẩn sau vài giây', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger message="Đã lưu hồ sơ" type="success" /></ToastProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Hiện thông báo' }));
    expect(within(screen.getByRole('status')).getByText('Đã lưu hồ sơ')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Đã lưu hồ sơ')).not.toBeInTheDocument();
  });

  it('lỗi dùng role="alert", hiển thị ít nhất 8 giây và đóng được bằng nút', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger message="Không lưu được đơn thuốc" type="error" /></ToastProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Hiện thông báo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được đơn thuốc');

    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được đơn thuốc');

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('AutoLogoutTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('cảnh báo trước khi hết phiên, "Tiếp tục" gia hạn, hết giờ thì đăng xuất', () => {
    vi.useFakeTimers();
    loginAs(['NURSE']);
    render(
      <AuthProvider>
        <ToastProvider>
          <AutoLogoutTimer idleTimeoutMs={10000} warningTimeoutMs={4000} />
        </ToastProvider>
      </AuthProvider>
    );

    act(() => { vi.advanceTimersByTime(7000); });
    const dialog = screen.getByRole('dialog', { name: 'Phiên làm việc sắp hết hạn' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Tiếp tục làm việc/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('hms_token')).toBe('jwt_test_token');

    act(() => { vi.advanceTimersByTime(11000); });
    expect(localStorage.getItem('hms_token')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/đăng xuất tự động/i)).toBeInTheDocument();
  });
});
