import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { Navbar } from '../components/layout/Navbar';

vi.mock('../services/api', () => {
  const offline = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: 'http://localhost:8080/api/v1' };
});

// Trên điện thoại (<640px) header chỉ chứa: tên bệnh viện + nút menu. Đặt lịch / Đăng nhập nằm trong menu,
// vì cả hai nút nằm ngoài màn hình sẽ khiến người dùng không mở được menu (đã đo: nút menu ở x=549 trong khung 390px).
const renderNavbar = (props = {}) => render(
  <ToastProvider>
    <AuthProvider>
      <Navbar onOpenAuth={vi.fn()} onOpenBooking={vi.fn()} {...props} />
    </AuthProvider>
  </ToastProvider>
);

describe('Navbar – header điện thoại không tràn', () => {
  beforeEach(() => localStorage.clear());

  it('nút Đặt lịch khám và Đăng nhập trên header chỉ hiện từ màn sm trở lên', () => {
    renderNavbar();
    expect(document.getElementById('headerBookBtn').className).toMatch(/\bhidden\b.*\bsm:inline-flex\b/);
    expect(document.getElementById('headerAuthBtn').className).toMatch(/\bhidden\b.*\bsm:inline-flex\b/);
  });

  it('khu vực thương hiệu chỉ hiển thị logo: không có chữ, liên kết vẫn có tên truy cập và đưa về đầu trang', () => {
    renderNavbar();
    const logoLink = screen.getByRole('link', { name: /Mỹ Phát Hospital – về đầu trang/ });
    expect(logoLink).toHaveAttribute('href', '#top');
    // Chỉ chứa một ảnh trang trí (alt rỗng), không có chữ hiển thị
    expect(logoLink.textContent.trim()).toBe('');
    const img = logoLink.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(screen.queryByText('MỸ PHÁT HOSPITAL')).not.toBeInTheDocument();
    expect(screen.queryByText(/1170 Quang Trung/)).not.toBeInTheDocument();

    fireEvent.click(logoLink);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('trên điện thoại header chỉ còn logo và nút menu (không còn tên bị cắt chữ)', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: /về đầu trang/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở menu' })).toBeInTheDocument();
  });

  it('đã đăng nhập: thanh trên không lặp "Lịch trực"/"Lịch khám của tôi" (đã có trong menu tài khoản) và chỉ hiện link mục từ 2xl', () => {
    localStorage.setItem('hms_token', 'fake.token');
    localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'admin', fullName: 'Quản trị', roles: ['ADMIN'] }));
    renderNavbar({ onOpenSchedule: vi.fn(), onOpenMyAppointments: vi.fn(), onOpenWorkspace: vi.fn() });

    expect(document.getElementById('headerScheduleBtn')).toBeNull();
    expect(document.getElementById('headerMyAppointmentsBtn')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Các mục trên trang' }).className).toMatch(/\bhidden\b.*\b2xl:flex\b/);
    // Tên người dùng chỉ hiện từ xl, dưới đó chỉ còn avatar để thanh trên không tràn
    const nameLabel = screen.getByText('Quản trị', { selector: 'span.truncate' });
    expect(nameLabel.parentElement.className).toMatch(/\bhidden\b.*\bxl:flex\b/);

    fireEvent.click(document.getElementById('userMenuBtn'));
    expect(screen.getByRole('button', { name: /Lịch trực nhân viên/ })).toBeInTheDocument();
  });

  it('chưa đăng nhập: link mục trên trang hiện từ xl', () => {
    renderNavbar();
    expect(screen.getByRole('navigation', { name: 'Các mục trên trang' }).className).toMatch(/\bhidden\b.*\bxl:flex\b/);
  });

  it('menu di động có mục Đăng nhập khi chưa đăng nhập và mở được hộp thoại đăng nhập', () => {
    const onOpenAuth = vi.fn();
    renderNavbar({ onOpenAuth });
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu chính' });
    fireEvent.click(within(menu).getByRole('button', { name: /Đăng nhập/ }));
    expect(onOpenAuth).toHaveBeenCalledWith('login');
  });

  it('menu di động có nút Đặt lịch khám ngay ở đầu menu (không phải cuối danh sách dài)', () => {
    const onOpenBooking = vi.fn();
    renderNavbar({ onOpenBooking });
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu chính' });
    const items = within(menu).getAllByRole('button').concat(within(menu).getAllByRole('link'));
    const first = items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .find((el) => !el.closest('[role="group"]'));
    expect(first).toHaveTextContent(/Đặt lịch khám ngay/);
    fireEvent.click(first);
    expect(onOpenBooking).toHaveBeenCalled();
  });
});
