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

  it('tên bệnh viện được phép xuống dòng trên màn nhỏ để nhường chỗ cho nút menu', () => {
    renderNavbar();
    const brand = screen.getByText('MỸ PHÁT HOSPITAL');
    expect(brand.className).not.toMatch(/(^|\s)whitespace-nowrap/);
    expect(brand.className).toMatch(/sm:whitespace-nowrap/);
    expect(brand.closest('a').className).not.toMatch(/\bshrink-0\b/);
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
