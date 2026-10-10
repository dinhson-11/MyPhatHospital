import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

/** Thời gian hiển thị mặc định (ms). Lỗi hiển thị lâu hơn để người dùng kịp đọc. */
const TOAST_DURATIONS = {
  success: 4500,
  info: 5000,
  warning: 7000,
  error: 10000
};

const MAX_TOASTS = 5;

const TOAST_META = {
  success: { icon: 'check_circle', title: 'Thành công' },
  info: { icon: 'info', title: 'Thông báo' },
  warning: { icon: 'warning', title: 'Cảnh báo' },
  error: { icon: 'error', title: 'Lỗi' }
};

let toastSeq = 0;

/**
 * Thông báo nổi dùng chung.
 *  showToast(message, type = 'success', options?)
 *   - type: 'success' | 'info' | 'warning' | 'error'
 *   - options.duration: ms; 0 hoặc Infinity = chỉ đóng khi người dùng bấm "Đóng"
 * Truy cập: thông báo thường được đọc qua vùng role="status" (aria-live polite),
 * lỗi được đọc ngay qua vùng role="alert" (assertive).
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', options = {}) => {
    const kind = TOAST_META[type] ? type : 'info';
    const id = `toast-${Date.now()}-${(toastSeq += 1)}`;
    const duration = options.duration ?? TOAST_DURATIONS[kind];

    setToasts((prev) => {
      // Bỏ bản trùng nội dung đang hiển thị để không dồn nhiều thông báo giống nhau
      const filtered = prev.filter((t) => !(t.message === message && t.type === kind));
      return [...filtered, { id, message, type: kind }].slice(-MAX_TOASTS);
    });

    if (duration && Number.isFinite(duration)) {
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, []);

  // Dọn bộ hẹn giờ khi provider bị gỡ
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  const errorToasts = toasts.filter((t) => t.type === 'error');
  const otherToasts = toasts.filter((t) => t.type !== 'error');

  const renderToast = (toast) => {
    const meta = TOAST_META[toast.type];
    const isError = toast.type === 'error';
    return (
      <div
        key={toast.id}
        className={`toast toast-${toast.type}`}
        data-testid="toast"
        // Lỗi: mỗi thông báo là một role="alert" riêng (được đọc ngay khi xuất hiện)
        role={isError ? 'alert' : undefined}
      >
        <span className="toast-icon" aria-hidden="true">
          <span className="material-symbols-outlined">{meta.icon}</span>
        </span>
        <div className="toast-body">
          <span className="toast-title">{meta.title}</span>
          <span>{toast.message}</span>
        </div>
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="toast-close"
          aria-label="Đóng thông báo"
          title="Đóng thông báo"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    );
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Vùng thông báo thường luôn có mặt trong DOM (role="status") để trình đọc màn hình bắt được nội dung mới */}
      <div className="toast-region">
        <div className="toast-stack">{errorToasts.map(renderToast)}</div>
        <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
          {otherToasts.map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
