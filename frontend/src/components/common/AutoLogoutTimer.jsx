import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];

/**
 * AutoLogoutTimer: tự động đăng xuất sau thời gian không thao tác (mặc định 15 phút),
 * cảnh báo trước 60 giây. Khi đăng xuất, App.jsx đóng toàn bộ cửa sổ chứa dữ liệu bệnh nhân.
 * Trong lúc cảnh báo, chỉ thao tác chủ động ("Tiếp tục làm việc") mới gia hạn phiên.
 */
export default function AutoLogoutTimer({ idleTimeoutMs = 15 * 60 * 1000, warningTimeoutMs = 60 * 1000 }) {
  const { isAuthenticated, logout, user } = useAuth();
  const { showToast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(warningTimeoutMs / 1000));

  const lastActivityRef = useRef(0);
  const warningRef = useRef(false);

  const continueSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningRef.current = false;
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    lastActivityRef.current = Date.now();
    const handleActivity = () => {
      if (!warningRef.current) lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    // Tính theo đồng hồ thực (không đếm lùi thủ công) để đúng cả khi tab bị trình duyệt làm chậm
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= idleTimeoutMs) {
        clearInterval(interval);
        warningRef.current = false;
        setShowWarning(false);
        logout();
        showToast('Bạn đã được đăng xuất tự động sau thời gian không thao tác để bảo mật thông tin y tế.', 'warning');
      } else if (idleTime >= idleTimeoutMs - warningTimeoutMs) {
        warningRef.current = true;
        setShowWarning(true);
        setSecondsLeft(Math.max(1, Math.ceil((idleTimeoutMs - idleTime) / 1000)));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
      // Đăng xuất / đổi phiên: bỏ cảnh báo cũ để không hiện lại ở lần đăng nhập sau
      warningRef.current = false;
      setShowWarning(false);
    };
  }, [isAuthenticated, idleTimeoutMs, warningTimeoutMs, logout, showToast]);

  const handleLogoutNow = () => {
    warningRef.current = false;
    setShowWarning(false);
    logout();
    showToast('Bạn đã đăng xuất tài khoản.', 'info');
  };

  return (
    <Modal
      isOpen={isAuthenticated && showWarning}
      onClose={continueSession}
      title="Phiên làm việc sắp hết hạn"
      icon="lock_clock"
      size="sm"
      footer={(
        <>
          <button type="button" onClick={handleLogoutNow} className="btn btn-secondary">
            Đăng xuất ngay
          </button>
          <button type="button" onClick={continueSession} className="btn btn-primary" data-autofocus>
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            <span>Tiếp tục làm việc</span>
          </button>
        </>
      )}
    >
      <div className="text-center space-y-3 py-2">
        <p className="text-sm text-slate-600">
          Để bảo mật hồ sơ bệnh án, tài khoản{' '}
          <strong className="text-slate-900">{user?.fullName || user?.username || 'của bạn'}</strong>{' '}
          sẽ tự động đăng xuất sau:
        </p>
        <p className="text-3xl font-extrabold text-amber-700 tabular-nums">
          {secondsLeft} giây
        </p>
        <p className="text-xs text-slate-500">
          Các cửa sổ đang mở sẽ được đóng lại khi đăng xuất. Dữ liệu chưa lưu có thể bị mất.
        </p>
      </div>
    </Modal>
  );
}
