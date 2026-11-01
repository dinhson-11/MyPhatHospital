import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Kiểm tra tĩnh mã nguồn để lỗi truy cập cơ bản không quay lại khi thêm giao diện mới.
const srcRoot = resolve(__dirname, '..');
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const files = [...walk(join(srcRoot, 'components')), join(srcRoot, 'App.jsx')].filter((f) => f.endsWith('.jsx'));
const rel = (f) => f.slice(srcRoot.length + 1).replace(/\\/g, '/');
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

// Chuỗi 'a > b' trong biểu thức JS (vd. `x => y`) không được coi là kết thúc thẻ: bỏ qua nội dung trong {...} và chuỗi
const TAG_BODY = String.raw`(?:[^>{}"']|"[^"]*"|'[^']*'|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*`;

describe('truy cập – kiểm tra tĩnh mã nguồn', () => {
  it('mọi <img> có thuộc tính alt (ảnh trang trí dùng alt="")', () => {
    const bad = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(new RegExp(`<img\\b(${TAG_BODY})>`, 'g'))) {
        if (!/\balt\s*=/.test(m[1])) bad.push(`${rel(f)}:${lineOf(src, m.index)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('nút chỉ có icon phải có tên truy cập (aria-label, aria-labelledby hoặc title)', () => {
    const bad = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(new RegExp(`<button\\b(${TAG_BODY})>([\\s\\S]*?)</button>`, 'g'))) {
        const withoutIcons = m[2]
          .replace(/<span[^>]*material-symbols[^>]*>[\s\S]*?<\/span>/g, '')
          .replace(/<Icon\b[^>]*\/>/g, '')
          .replace(/<[^>]*>/g, '');
        const hasVisibleLabel = /[A-Za-zÀ-ỹ0-9]/.test(withoutIcons);
        if (!hasVisibleLabel && !/aria-label|aria-labelledby|title=/.test(m[1])) {
          bad.push(`${rel(f)}:${lineOf(src, m.index)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
