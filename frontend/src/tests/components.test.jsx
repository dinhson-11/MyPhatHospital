import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('UI & Component Integration Suite (Enterprise Grade)', () => {
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

    // Booking modal should be open
    expect(await screen.findByText('Đăng Ký Đặt Lịch Khám')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ví dụ: Nguyễn Văn An/i)).toBeInTheDocument();
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
