import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Khi người dùng phóng chữ (html font-size 115–130%), khung gắn với header/chat phải co giãn theo.
// Chiều cao tính bằng px sẽ bị cắt nội dung hoặc tràn khỏi màn hình.
const root = resolve(__dirname, '../components');
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const files = walk(root).filter((f) => f.endsWith('.jsx'));

const violations = (regex) => files.flatMap((f) => readFileSync(f, 'utf8').split('\n')
  .map((text, i) => ({ text, loc: `${f.slice(root.length + 1).replace(/\\/g, '/')}:${i + 1}` }))
  .filter(({ text }) => regex.test(text))
  .map(({ loc }) => loc));

describe('bố cục co giãn theo cỡ chữ', () => {
  it('không dùng calc(100vh - Npx) / calc(100dvh - Npx) cho khung có giới hạn chiều cao', () => {
    expect(violations(/calc\(100d?vh[-_ ]+\d+px\)/)).toEqual([]);
  });

  it('khung chat không đặt kích thước bằng px', () => {
    const chat = readFileSync(join(root, 'chat/ChatWidget.jsx'), 'utf8');
    expect(chat).not.toMatch(/\bh-\[560px\]/);
    expect(chat).not.toMatch(/\bsm:w-\[410px\]/);
  });
});
