import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * Modal dùng chung cho toàn hệ thống – đạt chuẩn truy cập (WCAG 2.1):
 * role="dialog" + aria-modal, tiêu đề gắn aria-labelledby, giữ focus bên trong (focus trap),
 * trả focus về nút đã mở khi đóng, khóa cuộn trang nền, Esc chỉ đóng modal trên cùng.
 *
 * Props:
 *  - isOpen, onClose
 *  - title, subtitle, icon (tên Material Symbol)
 *  - size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 *  - footer: nội dung thanh thao tác dưới cùng
 *  - closeOnBackdrop: cho phép bấm nền để đóng (mặc định false – tránh mất dữ liệu đang nhập)
 *  - initialFocusRef: phần tử nhận focus khi mở
 *  - bodyClassName: class cho vùng nội dung (mặc định có padding và cuộn dọc)
 */
const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-7xl'
};

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

let openCount = 0;

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  children,
  closeOnBackdrop = false,
  initialFocusRef,
  bodyClassName = 'px-5 py-4 sm:px-6 overflow-y-auto',
  className = ''
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const [zIndex, setZIndex] = useState(1000);

  useEscapeKey(isOpen, onClose);

  // Khóa cuộn nền + thứ tự lớp (modal mở sau nằm trên)
  useEffect(() => {
    if (!isOpen) return undefined;
    openCount += 1;
    setZIndex(1000 + openCount * 10);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Đưa focus vào modal khi mở, trả focus khi đóng
  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const node = dialogRef.current;
    const target = initialFocusRef?.current || node?.querySelector('[data-autofocus]') || node;
    target?.focus?.({ preventScroll: true });
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const content = (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`modal-surface relative w-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} max-h-[100dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-pop border border-slate-200 dark:border-slate-800 outline-none ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              {icon && (
                <span className="w-10 h-10 shrink-0 rounded-xl bg-primary-fixed text-primary flex items-center justify-center dark:bg-slate-800 dark:text-sky-300">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
                </span>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {title}
                  </h2>
                )}
                {subtitle && <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                title="Đóng (Esc)"
                className="w-9 h-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
