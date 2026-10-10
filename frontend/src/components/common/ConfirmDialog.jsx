import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';

/**
 * Hộp thoại xác nhận dùng chung thay cho window.confirm.
 *
 * const confirm = useConfirm();
 * const ok = await confirm({ title, message, confirmText, tone: 'danger' });          // → true | false
 * const reason = await confirm({ title, message, requireReason: true });              // → chuỗi lý do | false
 *
 * Tham số: title, message (chuỗi hoặc JSX), details (mảng dòng nhấn mạnh), confirmText, cancelText,
 * tone: 'primary' | 'danger' | 'warning', requireReason, reasonLabel, reasonPlaceholder, reasonMinLength.
 */
const ConfirmContext = createContext(null);

const TONE = {
  primary: { button: 'bg-primary hover:bg-primary-dark text-white', icon: 'help', chip: 'bg-primary-fixed text-primary' },
  warning: { button: 'bg-amber-600 hover:bg-amber-700 text-white', icon: 'warning', chip: 'bg-amber-100 text-amber-700' },
  danger: { button: 'bg-red-700 hover:bg-red-800 text-white', icon: 'report', chip: 'bg-red-100 text-red-700' }
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [reason, setReason] = useState('');
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setReason('');
    setState(options);
  }), []);

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  };

  const minLength = state?.reasonMinLength ?? 5;
  const reasonValid = !state?.requireReason || reason.trim().length >= minLength;
  const tone = TONE[state?.tone] || TONE.primary;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title || 'Xác nhận thao tác'}
        size="sm"
        footer={(
          <>
            <button type="button" className="btn btn-light" onClick={() => close(false)}>
              {state?.cancelText || 'Quay lại'}
            </button>
            <button
              type="button"
              data-autofocus={state?.requireReason ? undefined : true}
              disabled={!reasonValid}
              onClick={() => close(state?.requireReason ? reason.trim() : true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tone.button}`}
            >
              {state?.confirmText || 'Xác nhận'}
            </button>
          </>
        )}
      >
        <div className="flex gap-3">
          <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${tone.chip}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{tone.icon}</span>
          </span>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200 min-w-0">
            {state?.message && <div className="leading-relaxed">{state.message}</div>}
            {state?.details?.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-slate-800 dark:text-slate-100">
                {state.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
            {state?.requireReason && (
              <div>
                <label htmlFor="confirm-reason" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {state.reasonLabel || 'Lý do'} <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="confirm-reason"
                  data-autofocus
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={state.reasonPlaceholder || `Tối thiểu ${minLength} ký tự`}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {!reasonValid && reason.length > 0 && (
                  <p className="text-[12px] text-red-700 mt-1">Lý do cần tối thiểu {minLength} ký tự.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

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

export default ConfirmProvider;
