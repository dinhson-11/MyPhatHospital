import { createContext, useContext } from 'react';

export const ConfirmContext = createContext(null);

/**
 * Lấy hàm confirm. Nếu component được render ngoài ConfirmProvider (VD: trong test đơn lẻ)
 * thì dùng hộp thoại mặc định của trình duyệt.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return async (options = {}) => {
    const text = [options.title, typeof options.message === 'string' ? options.message : '', ...(options.details || [])]
      .filter(Boolean).join('\n');
    if (options.requireReason) {
      const value = typeof window !== 'undefined' && window.prompt ? window.prompt(text) : null;
      return value && value.trim().length >= (options.reasonMinLength ?? 5) ? value.trim() : false;
    }
    return typeof window !== 'undefined' && window.confirm ? window.confirm(text) : true;
  };
}
