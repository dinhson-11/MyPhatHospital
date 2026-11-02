import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// WCAG 2.2 AA: chữ thường >= 4.5:1, thành phần giao diện (viền ô nhập, icon) >= 3:1.
// Đọc token trực tiếp từ index.css để ai đổi màu làm trượt AA thì test báo đỏ.
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];

const token = (name) => {
  const m = rootBlock.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Không tìm thấy token --${name} trong :root`);
  return m[1];
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Nền thực tế của ứng dụng: trắng, canvas (tailwind), surface-muted, surface-dim
const BACKGROUNDS = ['#ffffff', '#f6f8fa', token('color-surface-muted'), token('color-surface-dim')];

describe('contrast – chữ đạt WCAG AA (>= 4.5:1)', () => {
  it.each(['color-text', 'color-text-secondary', 'color-text-muted'])('%s trên mọi nền', (name) => {
    BACKGROUNDS.forEach((bg) => {
      expect(contrast(token(name), bg), `${name} (${token(name)}) trên ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it.each([
    ['color-primary', '#ffffff'],
    ['color-success', '#ffffff'],
    ['color-error', '#ffffff'],
  ])('%s trên %s', (name, bg) => {
    expect(contrast(token(name), bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('chữ trắng trên nút chính', () => {
    expect(contrast('#ffffff', token('color-primary'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrast – thành phần giao diện (>= 3:1)', () => {
  it('viền ô nhập liệu đủ rõ trên nền trắng', () => {
    expect(contrast(token('color-border-input'), '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('placeholder dùng màu chữ phụ (không dùng màu disabled 2.56:1)', () => {
    const rule = css.match(/\.input::placeholder[^{]*\{([^}]*)\}/)[1];
    expect(rule).toContain('var(--color-text-muted)');
  });
});

describe('contrast – token Tailwind dùng trong JSX', () => {
  it('text-slate-500 đạt 4.5:1 trên trắng, slate-50, slate-100, slate-200', async () => {
    const { default: config } = await import('../../tailwind.config.js');
    const slate500 = config.theme.extend.colors?.slate?.[500] ?? '#64748b'; // mặc định của Tailwind
    ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0'].forEach((bg) => {
      expect(contrast(slate500, bg), `slate-500 (${slate500}) trên ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('text-xs tối thiểu 0.8125rem (13px)', async () => {
    const { default: config } = await import('../../tailwind.config.js');
    const xs = config.theme.extend.fontSize?.xs?.[0] ?? '0.75rem'; // mặc định của Tailwind
    expect(parseFloat(xs)).toBeGreaterThanOrEqual(0.8125);
  });
});
