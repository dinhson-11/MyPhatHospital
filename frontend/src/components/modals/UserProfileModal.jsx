import React from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  DOCTOR: 'Bác sĩ',
  NURSE: 'Điều dưỡng',
  PHARMACIST: 'Dược sĩ',
  RECEPTIONIST: 'Lễ tân - Kế toán',
  PATIENT: 'Bệnh nhân'
};

const roleLabel = (role) => {
  const key = String(role || '').replace(/^ROLE_/, '');
  return ROLE_LABELS[key] || key;
};

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-100 last:border-b-0">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="font-semibold text-slate-800 text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function UserProfileModal({ isOpen, onClose, onOpenAppointments, onOpenPatientProfile, onOpenMyInvoices }) {
  const { user, logout, isStaff } = useAuth();
  const { showToast } = useToast();

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
    onClose();
  };

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const phone = user?.phoneNumber || user?.phone;

  return (
    <Modal
      isOpen={isOpen && Boolean(user)}
      onClose={onClose}
      size="sm"
      icon="badge"
      title="Thông Tin Tài Khoản"
      subtitle="Tài khoản khám chữa bệnh điện tử"
      bodyClassName="px-5 py-5 sm:px-6 overflow-y-auto space-y-5"
    >
      {user && (
        <>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-fixed border border-primary-fixed-dim">
            <span
              className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-extrabold shrink-0"
              aria-hidden="true"
            >
              {user.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base truncate">{user.fullName || user.username}</h3>
              <p className="text-xs text-slate-500 font-mono truncate">@{user.username}</p>
              {roles.length > 0 && (
                <ul className="flex flex-wrap gap-1 mt-1.5" aria-label="Vai trò">
                  {roles.map((r) => (
                    <li key={r} className="badge badge-primary">{roleLabel(r)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <dl className="text-sm">
            {user.title && <InfoRow label="Chức vụ">{user.title}</InfoRow>}
            {user.departmentName && <InfoRow label="Khoa / Phòng">{user.departmentName}</InfoRow>}
            {user.room && <InfoRow label="Phòng làm việc">{user.room}</InfoRow>}
            <InfoRow label="Email">
              {user.email || <span className="font-normal text-slate-400">Chưa cập nhật</span>}
            </InfoRow>
            <InfoRow label="Số điện thoại">
              {phone || <span className="font-normal text-slate-400">Chưa cập nhật</span>}
            </InfoRow>
          </dl>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPatientProfile?.();
              }}
              className="btn btn-soft btn-block"
            >
              <span className="material-symbols-outlined" aria-hidden="true">medical_information</span>
              Hồ sơ sức khỏe & tiền sử dị ứng
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAppointments?.();
              }}
              className="btn btn-secondary btn-block"
            >
              <span className="material-symbols-outlined" aria-hidden="true">event_note</span>
              Xem lịch khám của tôi
            </button>

            {!isStaff && onOpenMyInvoices && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyInvoices();
                }}
                className="btn btn-secondary btn-block"
              >
                <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                Hóa đơn của tôi
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-block bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
            >
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
