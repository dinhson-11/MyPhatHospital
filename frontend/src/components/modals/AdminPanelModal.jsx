import React, { useState, useEffect } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { DEPARTMENTS, DOCTORS } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';

export default function AdminPanelModal({ isOpen, onClose }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await appointmentService.getMyAppointments();
      setAppointments(data);
    } catch {
      showToast('Lỗi khi tải dữ liệu quản trị', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAll();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Bảng Điều Khiển Quản Trị Hệ Thống (Sprint 1)</h3>
              <p className="text-xs text-slate-400">HMS-AI Management Console &bull; Quyền Quản trị viên</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* System Overview Badges */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Backend API</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 font-mono">Port 8080 Active</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Flyway Migrations</span>
            <div className="text-xs font-bold text-slate-800 mt-1">
              V1 - V10 (Seed OK)
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Khoa phòng</span>
            <div className="text-xs font-bold text-primary mt-1">
              {DEPARTMENTS.length} Chuyên khoa
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Bác sĩ chuyên trách</span>
            <div className="text-xs font-bold text-secondary mt-1">
              {DOCTORS.length} Bác sĩ
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">calendar_view_day</span>
              Danh Sách Lịch Khám Đã Đăng Ký ({appointments.length})
            </h4>
            <button
              type="button"
              onClick={loadAll}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Đang tải dữ liệu...</div>
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Chưa có lịch khám nào trong cơ sở dữ liệu.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mã Phiếu</th>
                    <th className="py-3 px-4">Bệnh Nhân</th>
                    <th className="py-3 px-4">SĐT</th>
                    <th className="py-3 px-4">Chuyên Khoa</th>
                    <th className="py-3 px-4">Ngày / Giờ</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{apt.ticketCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{apt.patientName}</td>
                      <td className="py-3 px-4">{apt.phoneNumber}</td>
                      <td className="py-3 px-4 text-primary font-medium">{apt.departmentName}</td>
                      <td className="py-3 px-4">{apt.appointmentDate} ({apt.timeSlot})</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            apt.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {apt.status === 'CANCELLED' ? 'Đã Hủy' : 'Đã Xác Nhận'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
