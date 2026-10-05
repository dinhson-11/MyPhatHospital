import React, { useState, useEffect } from 'react';

/**
 * NightShiftToggle: Nút chuyển đổi chế độ trực đêm (Dark Mode) cho nhân viên y tế
 * Giúp giảm mỏi mắt khi làm việc ban đêm trong buồng bệnh.
 */
export default function NightShiftToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      localStorage.getItem('hms_theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('hms_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('hms_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
        isDark
          ? 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      } ${className}`}
      title={isDark ? 'Chuyển sang chế độ ban ngày' : 'Chuyển sang chế độ trực đêm (Dark Mode)'}
      aria-label={isDark ? 'Chế độ ngày' : 'Chế độ trực đêm'}
    >
      <span className="material-symbols-outlined text-[17px] leading-none text-amber-500">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      <span className="hidden sm:inline">
        {isDark ? 'Ca Trực Đêm' : 'Chế Độ Ngày'}
      </span>
    </button>
  );
}
