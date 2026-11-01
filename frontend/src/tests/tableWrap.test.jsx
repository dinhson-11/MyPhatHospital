import React from 'react';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { render, screen } from '@testing-library/react';
import TableWrap from '../components/common/TableWrap';

const SRC = resolve(__dirname, '..');
const read = (rel) => readFileSync(resolve(SRC, rel), 'utf8');

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});
const componentFiles = walk(resolve(SRC, 'components')).filter((f) => f.endsWith('.jsx') && !f.endsWith('TableWrap.jsx'));

// Đã đo trên Chrome thật (axe `scrollable-region-focusable`): bảng cuộn ngang không focus được,
// người dùng bàn phím không cuộn tới được các cột bị che ở màn nhỏ hoặc chữ lớn.
describe('TableWrap – bảng cuộn ngang dùng được bằng bàn phím', () => {
  it('là vùng (region) có tên, focus được bằng Tab, giữ class table-wrap và class truyền vào', () => {
    render(<TableWrap label="Danh sách thử" className="max-h-[55vh]"><table><tbody><tr><td>a</td></tr></tbody></table></TableWrap>);
    const region = screen.getByRole('region', { name: 'Danh sách thử' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('table-wrap', 'max-h-[55vh]');
    expect(region.querySelector('table')).not.toBeNull();
  });

  it('không file nào trong components/ còn tự dựng div.table-wrap (phải dùng TableWrap)', () => {
    const offenders = componentFiles.filter((f) => /className=(\{`|")table-wrap\b/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.replace(SRC, ''))).toEqual([]);
  });

  it('mọi chỗ gọi <TableWrap> đều có label không rỗng', () => {
    const calls = componentFiles.flatMap((f) => (readFileSync(f, 'utf8').match(/<TableWrap\b[^>]*>/g) || []).map((c) => `${f.replace(SRC, '')}: ${c}`));
    expect(calls.length).toBe(9);
    expect(calls.filter((c) => !/\blabel=("[^"]+"|\{[^}]+\})/.test(c))).toEqual([]);
  });

  it('.table-wrap:focus-visible có viền nhìn thấy', () => {
    expect(read('index.css')).toMatch(/\.table-wrap:focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });

  it('bảng kê chi phí của hóa đơn (kiểu riêng, không dùng .table-wrap) cũng focus được và có tên', () => {
    const src = read('components/billing/InvoiceDetail.jsx');
    const box = src.match(/<div\s[^>]*overflow-x-auto[\s\S]*?>/)[0];
    expect(box).toMatch(/tabIndex=\{0\}/);
    expect(box).toMatch(/role="region"/);
    expect(box).toMatch(/aria-label="[^"]+"/);
  });

  // Đã đo trên Chrome thật (lễ tân, 390px): bảng 6 cột rộng hơn màn hình nên dòng "Không có lịch hẹn nào…"
  // căn giữa theo cả bảng và nằm ngoài vùng nhìn thấy ("Không có lịch hẹn nào ngày 31/1…").
  it.each([
    ['components/reception/ReceptionDashboardModal.jsx', /colSpan=\{6\}[^>]*>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<div className="[^"]*sticky left-0/],
    ['components/pharmacy/PharmacyDispenseModal.jsx', /Không có thuốc phù hợp bộ lọc/]
  ])('%s: thông báo "không có dữ liệu" trong bảng cuộn được ghim ở mép trái (sticky left-0)', (file, re) => {
    const src = read(file);
    expect(src).toMatch(re);
    if (file.includes('Pharmacy')) {
      expect(src.match(/<td colSpan=\{6\}[^>]*>\s*<div className="[^"]*sticky left-0[^"]*">Không có thuốc phù hợp bộ lọc/)).not.toBeNull();
    }
  });

  it('tabpanel cuộn của ca khám (bác sĩ) focus được bằng bàn phím', () => {
    const src = read('components/clinical/VisitDashboard.jsx');
    const panel = src.match(/<div[^>]*role="tabpanel"[^>]*id=\{`visit-panel-[^`]*`\}[\s\S]*?>/) || src.match(/<div[^>]*visit-panel[\s\S]*?>/);
    expect(panel).not.toBeNull();
    expect(panel[0]).toMatch(/tabIndex=\{0\}/);
  });
});
