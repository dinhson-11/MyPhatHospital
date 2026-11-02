import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import Modal from '../components/common/Modal';

const read = (rel) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

describe('vùng chạm 44px trên màn hình cảm ứng', () => {
  it('.touch-target nằm trong @media (pointer: coarse) với kích thước tối thiểu 2.75rem', () => {
    const css = read('index.css');
    const coarse = css.match(/@media \(pointer: coarse\) \{([\s\S]*?)\n\}/)[1];
    expect(coarse).toMatch(/\.touch-target[^{]*\{[^}]*min-height:\s*2\.75rem/);
    expect(coarse).toMatch(/\.touch-target[^{]*\{[^}]*min-width:\s*2\.75rem/);
  });

  it('mục menu bên (.nav-item) và mục menu thả xuống (.dropdown-item) cao tối thiểu 2.75rem trên cảm ứng', () => {
    const coarse = read('index.css').match(/@media \(pointer: coarse\) \{([\s\S]*?)\n\}/)[1];
    expect(coarse).toMatch(/\.nav-item[^{]*\{[^}]*min-height:\s*2\.75rem/);
    expect(coarse).toMatch(/\.dropdown-item[^{]*\{[^}]*min-height:\s*2\.75rem/);
  });

  it('khung nhân viên: nút 32–36px (h-8/w-8/h-9/w-9) đều có touch-target, trừ nút đóng nhỏ trong chip bệnh nhân', () => {
    const file = 'components/workspace/StaffWorkspace.jsx';
    const offenders = read(file)
      .split('\n')
      .map((text, i) => ({ text, line: i + 1 }))
      // Bỏ qua chip giờ khám (div chỉ hiển thị, không bấm được); nút đóng w-6 h-6 trong chip bệnh nhân (24px, đạt AA) không khớp regex
      .filter(({ text }) => /\b(h|w)-(8|9)\b/.test(text) && !/touch-target/.test(text) && !/2xl:flex/.test(text));
    expect(offenders.map((o) => `${file}:${o.line}`)).toEqual([]);
  });

  it('nút đóng của Modal có class touch-target', () => {
    render(<Modal isOpen onClose={vi.fn()} title="Thử">nội dung</Modal>);
    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveClass('touch-target');
  });

  it.each([
    'components/layout/Footer.jsx',
    'components/layout/Navbar.jsx',
    'components/chat/ChatWidget.jsx',
    'components/common/Modal.jsx'
  ])('%s: mọi dòng có h-9/w-9 (điều khiển 36px) đều có touch-target', (file) => {
    const offenders = read(file)
      .split('\n')
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => /\b(h|w)-9\b/.test(text) && !/touch-target/.test(text));
    expect(offenders.map((o) => `${file}:${o.line}`)).toEqual([]);
  });
});
