import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import App from '../App';

const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

const invoice = {
  id: 7,
  invoiceCode: 'HD261010000007',
  visitTime: '2026-10-10T09:00:00',
  doctorName: 'BS. Hoàng C',
  totalAmount: 680000,
  insuranceAmount: 544000,
  insuranceRate: 80,
  patientAmount: 136000,
  status: 'PENDING',
  items: [{ id: 1, itemType: 'SERVICE', description: 'Phí khám bệnh: Tim mạch', amount: 150000 }]
};

const loginAs = (roles) => {
  localStorage.setItem('hms_token', 'token');
  localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'tester', fullName: 'Người Kiểm Thử', roles }));
};

const openUserMenu = () => fireEvent.click(screen.getByRole('button', { name: /Tài khoản:/ }));

describe('Hóa đơn của tôi (bệnh nhân)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockImplementation((url) => (url === '/invoices/me'
      ? Promise.resolve({ success: true, data: [invoice] })
      : networkError()));
  });

  it('bệnh nhân mở được "Hóa đơn của tôi" từ menu tài khoản và xem số tiền phải trả', async () => {
    loginAs(['PATIENT']);
    render(<App />);

    openUserMenu();
    fireEvent.click(screen.getByRole('button', { name: /Hóa đơn của tôi/ }));

    const dialog = await screen.findByRole('dialog', { name: /Hóa đơn viện phí của tôi/ });
    expect(await within(dialog).findByText('HD261010000007')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/invoices/me');
  });

  it('báo lỗi, không hiển thị dữ liệu giả, khi không tải được hóa đơn', async () => {
    api.get.mockImplementation(() => networkError());
    loginAs(['PATIENT']);
    render(<App />);

    openUserMenu();
    fireEvent.click(screen.getByRole('button', { name: /Hóa đơn của tôi/ }));

    const dialog = await screen.findByRole('dialog', { name: /Hóa đơn viện phí của tôi/ });
    await waitFor(() => expect(within(dialog).getByRole('alert')).toBeInTheDocument());
    expect(within(dialog).queryByText('HD261010000007')).not.toBeInTheDocument();
  });

  it('nhân viên không thấy mục "Hóa đơn của tôi" trong menu', () => {
    loginAs(['DOCTOR']);
    render(<App />);

    openUserMenu();
    expect(screen.queryByRole('button', { name: /Hóa đơn của tôi/ })).not.toBeInTheDocument();
  });
});
