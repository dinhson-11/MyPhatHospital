import React from 'react';

/** Các khối giao diện dùng chung cho bảng điều khiển & báo cáo: biểu tượng, lỗi, rỗng, thẻ chỉ số, khung chờ. */

export const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

export function ErrorPanel({ message, onRetry, title = 'Không tải được dữ liệu', compact = false }) {
  return (
    <div className={`empty-state is-error ${compact ? 'py-6' : ''}`} role="alert">
      <div className="empty-state-icon">
        <Icon name="cloud_off" />
      </div>
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-text">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm btn-secondary mt-2">
          <Icon name="refresh" />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
}

export function EmptyPanel({ icon = 'inbox', title, text }) {
  return (
    <div className="empty-state py-8">
      <div className="empty-state-icon">
        <Icon name={icon} />
      </div>
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
    </div>
  );
}

const KPI_TONES = {
  primary: 'bg-primary-fixed text-primary',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  accent: 'bg-teal-50 text-teal-700',
  neutral: 'bg-slate-100 text-slate-700'
};

export function KpiCard({ label, value, icon, hint, tone = 'primary', valueClassName = 'text-2xl' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${KPI_TONES[tone] || KPI_TONES.primary}`}>
          <Icon name={icon} />
        </span>
      </div>
      <p className={`${valueClassName} font-extrabold text-slate-900 font-headline tabular-nums break-words`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
    </div>
  );
}

export function KpiSkeleton({ count = 4, label = 'Đang tải số liệu' }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ rows = 4, label = 'Đang tải' }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-9 w-full" />
      ))}
    </div>
  );
}
