import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function UserProfileModal({ isOpen, onClose, onOpenAppointments }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">person</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Hồ Sơ Cá Nhân</h3>
              <p className="text-xs text-slate-500">Thông tin tài khoản khám bệnh điện tử</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* User Card */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-black shadow-md">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{user.fullName}</h4>
              <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
              <div className="flex gap-1 mt-1">
                {user.roles && user.roles.map((r, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="font-semibold text-slate-800">{user.email || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Số điện thoại:</span>
              <span className="font-semibold text-slate-800">{user.phoneNumber || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Đang kích hoạt
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAppointments) onOpenAppointments();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Xem Lịch Khám Của Tôi
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Đăng Xuất Khỏi Tài Khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
