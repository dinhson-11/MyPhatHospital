import React, { useState } from 'react';
import { TEXT_SIZES, loadTextSize, saveTextSize } from '../../utils/textSize';

// Chữ "A" tăng dần để người dùng nhìn là hiểu, không cần đọc nhãn
const GLYPH_CLASS = { normal: 'text-[0.8125rem]', large: 'text-[1rem]', xlarge: 'text-[1.25rem]' };

/** Nhóm 3 nút chọn cỡ chữ (thường / lớn / rất lớn), lưu lựa chọn trên trình duyệt. */
export default function TextSizeControl({ className = '' }) {
  const [current, setCurrent] = useState(loadTextSize);

  return (
    <div role="group" aria-label="Cỡ chữ" className={`inline-flex items-center gap-1 ${className}`}>
      {TEXT_SIZES.map((size) => {
        const active = size.id === current;
        return (
          <button
            key={size.id}
            type="button"
            onClick={() => setCurrent(saveTextSize(size.id))}
            aria-pressed={active}
            aria-label={size.label}
            title={size.label}
            className={`btn btn-sm btn-icon font-bold ${active ? 'btn-primary' : 'btn-outline'}`}
          >
            <span aria-hidden="true" className={GLYPH_CLASS[size.id]}>A</span>
          </button>
        );
      })}
    </div>
  );
}
