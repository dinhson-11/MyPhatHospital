import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextSizeControl from '../components/common/TextSizeControl';
import { applyTextSize, loadTextSize, saveTextSize } from '../utils/textSize';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.fontSize = '';
});

describe('textSize – tiện ích', () => {
  it('mặc định là cỡ thường khi chưa lưu gì', () => {
    expect(loadTextSize()).toBe('normal');
  });

  it('bỏ qua giá trị lưu không hợp lệ', () => {
    localStorage.setItem('hms_text_size', 'huge');
    expect(loadTextSize()).toBe('normal');
  });

  it('áp phần trăm lên <html> và xóa khi về cỡ thường', () => {
    applyTextSize('large');
    expect(document.documentElement.style.fontSize).toBe('115%');
    applyTextSize('normal');
    expect(document.documentElement.style.fontSize).toBe('');
  });

  it('lưu lựa chọn để lần sau đọc lại được', () => {
    saveTextSize('xlarge');
    expect(loadTextSize()).toBe('xlarge');
    expect(document.documentElement.style.fontSize).toBe('130%');
  });

  it('vẫn áp dụng cho phiên hiện tại khi localStorage bị chặn', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
    try {
      expect(saveTextSize('large')).toBe('large');
      expect(document.documentElement.style.fontSize).toBe('115%');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('TextSizeControl', () => {
  it('có nhóm "Cỡ chữ" với 3 nút, nút đang chọn có aria-pressed', () => {
    render(<TextSizeControl />);
    expect(screen.getByRole('group', { name: 'Cỡ chữ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chữ thường' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Chữ lớn' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('bấm "Chữ lớn" đổi cỡ chữ trang và ghi nhớ lựa chọn', async () => {
    render(<TextSizeControl />);
    await userEvent.click(screen.getByRole('button', { name: 'Chữ lớn' }));
    expect(screen.getByRole('button', { name: 'Chữ lớn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Chữ thường' })).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.style.fontSize).toBe('115%');
    expect(localStorage.getItem('hms_text_size')).toBe('large');
  });

  it('khởi tạo theo cỡ chữ đã lưu', () => {
    localStorage.setItem('hms_text_size', 'xlarge');
    render(<TextSizeControl />);
    expect(screen.getByRole('button', { name: 'Chữ rất lớn' })).toHaveAttribute('aria-pressed', 'true');
  });
});
