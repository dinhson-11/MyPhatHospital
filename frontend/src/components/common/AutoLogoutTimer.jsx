import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

/**
 * AutoLogoutTimer: Tự động khóa màn hình và đăng xuất nhân viên sau thời gian không hoạt động
 * Tiêu chuẩn an toàn bệnh viện: 15 phút không thao tác chuột/bàn phím sẽ cảnh báo trước 60 giây.
 */
export default function AutoLogoutTimer({ idleTimeoutMs = 15 * 60 * 1000, warningTimeoutMs = 60 * 1000 }) {
  const { isAuthenticated, logout, user } = useAuth();
  const { showToast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [showWarning]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleEvent = () => resetActivity();

    events.forEach(evt => window.addEventListener(evt, handleEvent));

    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const warningThreshold = idleTimeoutMs - warningTimeoutMs;

      if (idleTime >= idleTimeoutMs) {
        // Hết giờ hoàn toàn -> tự động đăng xuất
        setShowWarning(false);
        clearInterval(checkInterval);
        if (countdownRef.current) clearInterval(countdownRef.current);
        logout();
        showToast('Phiên làm việc đã tự động kết thúc để bảo mật thông tin y tế!', 'warning');
      } else if (idleTime >= warningThreshold && !showWarning) {
        // Đến ngưỡng cảnh báo 60s
        setShowWarning(true);
        setSecondsLeft(Math.max(1, Math.round((idleTimeoutMs - idleTime) / 1000)));

        countdownRef.current = setInterval(() => {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 2000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleEvent));
      clearInterval(checkInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, idleTimeoutMs, warningTimeoutMs, logout, showToast, resetActivity, showWarning]);

  if (!isAuthenticated || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-amber-300 dark:border-amber-700 animate-fade-in space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl animate-bounce">
            lock_clock
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Cảnh Báo Hết Hạn Phiên Làm Việc
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Để bảo mật hồ sơ bệnh án, hệ thống sẽ tự động đăng xuất tài khoản <strong className="text-teal-700 dark:text-teal-400">{user?.fullName || 'nhân viên'}</strong> sau:
          </p>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono py-2">
            {secondsLeft} giây
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={resetActivity}
            className="flex-1 btn btn-primary py-3 font-semibold shadow-md"
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>Tiếp tục làm việc</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWarning(false);
              logout();
            }}
            className="btn btn-outline py-3 text-slate-600 dark:text-slate-300"
          >
            Đăng xuất ngay
          </button>
        </div>
      </div>
    </div>
  );
}
