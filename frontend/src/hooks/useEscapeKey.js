import { useEffect, useRef } from 'react';

/**
 * useEscapeKey
 * Đóng modal / popup khi nhấn Esc.
 *
 * Các modal đang mở được xếp thành một ngăn xếp: Esc chỉ đóng modal mở SAU CÙNG
 * (modal con trước, modal cha sau) thay vì đóng tất cả cùng lúc và làm mất dữ liệu đang nhập.
 */
const stack = [];
let listening = false;

function handleKeyDown(event) {
  if (event.key !== 'Escape' && event.key !== 'Esc') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.stopPropagation();
  top.current?.();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeyDown);
  listening = true;
}

export function useEscapeKey(isOpen, onClose) {
  const handlerRef = useRef(onClose);

  useEffect(() => {
    handlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    ensureListener();
    const entry = handlerRef;
    stack.push(entry);
    return () => {
      const idx = stack.lastIndexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }, [isOpen]);
}

export default useEscapeKey;
