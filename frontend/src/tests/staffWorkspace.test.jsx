import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import StaffWorkspace from '../components/workspace/StaffWorkspace';

vi.mock('../services/api', () => {
  const offline = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: 'http://localhost:8080/api/v1' };
});

const css = readFileSync(resolve(__dirname, '..', 'index.css'), 'utf8');

const renderWorkspace = (roles = ['ADMIN'], props = {}) => {
  localStorage.setItem('hms_token', 'test-token');
  localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'nv', fullName: 'Nguyễn Văn Nhân Viên', email: 'nv@example.com', roles }));
  return render(
    <ToastProvider>
      <AuthProvider>
        <StaffWorkspace
          onSwitchToPortal={vi.fn()}
          onOpenReception={vi.fn()}
          onOpenClinical={vi.fn()}
          onOpenNurse={vi.fn()}
          onOpenPharmacy={vi.fn()}
          onOpenInvoice={vi.fn()}
          onOpenReports={vi.fn()}
          onOpenSchedule={vi.fn()}
          onOpenAdmin={vi.fn()}
          {...props}
        />
      </AuthProvider>
    </ToastProvider>
  );
};

const accountButton = () => screen.getByRole('button', { name: /^Tài khoản:/ });

// Đã đo trên Chrome thật: ở 1280px topbar tràn 17–44px (chữ 100%) và 277–325px (chữ 130%),
// nút "Cổng thông tin" và menu tài khoản bị cắt khỏi màn hình.
describe('StaffWorkspace – topbar không tràn ngang', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.style.fontSize = ''; });

  it('chip ngày giờ khám chỉ hiện từ màn 2xl', () => {
    renderWorkspace();
    const chip = screen.getByText(/Giờ khám:/).closest('div');
    expect(chip.className).toMatch(/\bhidden\b.*\b2xl:flex\b/);
  });

  it('nút Cổng thông tin trên topbar chỉ hiện từ màn 2xl (lối vào khác vẫn còn ở sidebar và menu tài khoản)', () => {
    renderWorkspace();
    const topbarBtn = within(screen.getByRole('banner')).getByRole('button', { name: /Cổng thông tin/ });
    expect(topbarBtn.className).toMatch(/\bhidden\b.*\b2xl:inline-flex\b/);
    expect(screen.getByRole('button', { name: /Xem cổng thông tin/ })).toBeInTheDocument();
  });

  it('nhãn dài của ô tìm bệnh nhân chỉ hiện từ màn xl', () => {
    renderWorkspace();
    const label = screen.getByText('Tìm bệnh nhân (tên, SĐT, CCCD)…');
    expect(label.className).toMatch(/\bxl:inline\b/);
    expect(label.className).not.toMatch(/\blg:inline\b/);
  });

  it('điều dưỡng (ít mục menu) vẫn có ô tìm kiếm và menu tài khoản trên topbar', () => {
    renderWorkspace(['NURSE']);
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /Tìm bệnh nhân/ })).toBeInTheDocument();
    expect(accountButton()).toBeInTheDocument();
  });
});

// Đã đo trên Chrome thật (bác sĩ, 1280px): khung chi tiết ca khám rộng hơn hộp thoại 41px (chữ 100%) và 437px (chữ 130%),
// nên cột "Huyết áp tâm trương", ngày giờ ca khám và các tab bị cắt, không cuộn tới được.
describe('VisitDashboard – khung chi tiết ca khám co lại theo hộp thoại', () => {
  it('<section> chi tiết ca khám (flex-1 trong hàng flex) có min-w-0', () => {
    const src = readFileSync(resolve(__dirname, '..', 'components/clinical/VisitDashboard.jsx'), 'utf8');
    const section = src.match(/<section className="[^"]*"\s+aria-label=\{`Ca khám của[^`]*`\}/)[0];
    expect(section).toMatch(/\bflex-1\b/);
    expect(section).toMatch(/\bmin-w-0\b/);
  });
});

// Sau khi khung ca khám co đúng chiều ngang, ảnh Chrome ở chữ 130% cho thấy 4 cột sinh hiệu chỉ còn ~15px cho giá trị
// ("80" hiện thành "8"): ô có pr-20 dành chỗ cho đơn vị. Số cột phải tự giảm khi chữ lớn lên.
describe('VitalSignsForm – ô sinh hiệu đủ rộng khi phóng chữ', () => {
  const src = readFileSync(resolve(__dirname, '..', 'components/clinical/VitalSignsForm.jsx'), 'utf8');
  const grid = src.match(/<div className="(grid [^"]*)">/)[1];

  it('lưới chia cột theo chiều rộng tối thiểu tính bằng rem (co giãn theo cỡ chữ), không cố định 4 cột', () => {
    expect(grid).toMatch(/grid-cols-\[repeat\(auto-fill,minmax\(1[01](\.\d+)?rem,1fr\)\)\]/);
    expect(grid).not.toMatch(/lg:grid-cols-4/);
  });
});

describe('index.css – menu bên không cắt chữ khi phóng chữ', () => {
  const navItemRule = css.match(/\n\.nav-item \{([\s\S]*?)\n\}/)[1];

  it('.nav-item cho phép nhãn xuống dòng thay vì cắt bằng dấu …', () => {
    expect(navItemRule).not.toMatch(/white-space:\s*nowrap/);
  });

  it('.nav-item dùng min-height (rem) thay vì height cố định bằng px', () => {
    expect(navItemRule).not.toMatch(/(^|\s)height:\s*40px/);
    expect(navItemRule).toMatch(/min-height:\s*2\.5rem/);
  });

  it('sidebar thu gọn vẫn căn giữa icon', () => {
    expect(css).toMatch(/\.ws-sidebar\.is-collapsed \.nav-item \{[^}]*justify-content:\s*center/);
  });
});

describe('StaffWorkspace – cỡ chữ trong menu tài khoản', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.style.fontSize = ''; });

  it('menu tài khoản có nhóm nút Cỡ chữ', () => {
    renderWorkspace();
    fireEvent.click(accountButton());
    expect(screen.getByRole('group', { name: 'Cỡ chữ' })).toBeInTheDocument();
  });

  it('chọn Chữ lớn đặt font-size gốc 115% và ghi nhớ lựa chọn, menu vẫn mở', () => {
    renderWorkspace();
    fireEvent.click(accountButton());
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Chữ lớn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chữ lớn' }));
    expect(document.documentElement.style.fontSize).toBe('115%');
    expect(localStorage.getItem('hms_text_size')).toBe('large');
    expect(screen.getByRole('group', { name: 'Cỡ chữ' })).toBeInTheDocument();
  });

  it('nhấn Esc đóng menu và trả focus về nút tài khoản', () => {
    renderWorkspace();
    fireEvent.click(accountButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Cỡ chữ' })).not.toBeInTheDocument();
    expect(accountButton()).toHaveFocus();
  });

  it('tên người dùng dài bị cắt gọn trong menu thay vì đẩy menu ra ngoài', () => {
    renderWorkspace();
    fireEvent.click(accountButton());
    const menu = screen.getByRole('group', { name: 'Cỡ chữ' }).closest('.dropdown');
    expect(within(menu).getByText('Nguyễn Văn Nhân Viên').className).toMatch(/\btruncate\b/);
  });
});
