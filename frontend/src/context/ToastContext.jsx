import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const bgColors = {
    success: 'bg-[#005440] text-white border-[#84d6b9]/40',
    error: 'bg-[#ba1a1a] text-white border-red-300/40',
    info: 'bg-[#1960a6] text-white border-blue-300/40',
    warning: 'bg-[#b25e00] text-white border-amber-300/40'
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Floating Container */}
      <div className="fixed top-24 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${bgColors[toast.type] || bgColors.success} text-sm font-medium transition-all duration-300 animate-slide-in`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {icons[toast.type] || 'info'}
            </span>
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 hover:opacity-75 cursor-pointer text-white/80"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
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
