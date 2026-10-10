import React, { useState } from 'react';

/**
 * SensitiveMask: Che mờ thông tin cá nhân nhạy cảm (SĐT, CCCD/CMND)
 * Tuân thủ bảo mật thông tin y tế, cho phép mở mắt để kiểm tra khi cần.
 */
export default function SensitiveMask({ value, type = 'phone', className = '' }) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return <span className="text-slate-500 italic">Chưa có</span>;

  const maskValue = (val, maskType) => {
    const str = String(val).trim();
    if (maskType === 'phone') {
      if (str.length < 7) return '***';
      return `${str.slice(0, 4)}***${str.slice(-3)}`;
    }
    if (maskType === 'nationalId' || maskType === 'cccd') {
      if (str.length < 6) return '******';
      return `${str.slice(0, 4)}******${str.slice(-2)}`;
    }
    if (maskType === 'email') {
      const parts = str.split('@');
      if (parts.length !== 2) return '***';
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
      return `${maskedName}@${parts[1]}`;
    }
    return '******';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <span>{revealed ? value : maskValue(value, type)}</span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        title={revealed ? 'Ẩn thông tin nhạy cảm' : 'Xem thông tin đầy đủ'}
        aria-label={revealed ? 'Ẩn thông tin nhạy cảm' : 'Xem thông tin đầy đủ'}
      >
        <span className="material-symbols-outlined text-[15px] leading-none align-middle" aria-hidden="true">
          {revealed ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </span>
  );
}
