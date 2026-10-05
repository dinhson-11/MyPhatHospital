import { useEffect } from 'react';

/**
 * useEscapeKey
 * Hook to dismiss modals and popups when the Escape key is pressed.
 * Essential for desktop productivity and accessibility (WCAG 2.1).
 */
export function useEscapeKey(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}

export default useEscapeKey;
