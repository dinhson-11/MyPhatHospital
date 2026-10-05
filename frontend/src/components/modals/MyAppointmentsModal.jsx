import React, { useState, useEffect } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function MyAppointmentsModal({ isOpen, onClose, onOpenBooking }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const { showToast } = useToast();

  const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  useEscapeKey(isOpen, () => {
    if (selectedTicket) {
      setSelectedTicket(null);
    } else {
      onClose();
    }
  });

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await appointmentService.getMyAppointments();
      setAppointments(data);
    } catch {
      showToast('Không thể tải danh sách lịch khám', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAppointments();
      setSelectedTicket(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = async (id, ticketCode) => {
    if (!window.confirm(`Bạn có chắc muốn huỷ lịch khám ${ticketCode}?`)) {
      return;
    }

    try {
      await appointmentService.cancelAppointment(id);
      showToast(`Đã huỷ lịch khám ${ticketCode}`, 'info');
      await loadAppointments();
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket((prev) => ({ ...prev, status: 'CANCELLED' }));
      }
    } catch {
      showToast('Huỷ lịch khám không thành công', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">event_note</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Lịch Khám Của Tôi</h3>
              <p className="text-xs text-slate-500">Tra cứu và quản lý các lịch hẹn đã đặt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {selectedTicket ? (
            /* Ticket Detail Preview */
            <div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-4"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Quay lại danh sách
              </button>

              <div className="border-2 border-dashed border-emerald-400 rounded-2xl p-6 bg-emerald-50/20">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">Mã Phiếu Khám</span>
                    <h4 className="text-xl font-mono font-black text-slate-900">{selectedTicket.ticketCode}</h4>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      selectedTicket.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedTicket.status === 'CANCELLED' ? 'Đã Hủy' : 'Đã Xác Nhận'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 text-xs">
                  <div>
                    <p className="text-slate-400">Bệnh nhân:</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedTicket.patientName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Số điện thoại:</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedTicket.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Khoa khám:</p>
                    <p className="font-bold text-primary text-sm">{selectedTicket.departmentName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bác sĩ phụ trách:</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedTicket.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ngày khám (dd/mm/yyyy):</p>
                    <p className="font-bold text-slate-800 text-sm">{formatDateVN(selectedTicket.appointmentDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Khung giờ:</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedTicket.timeSlot}</p>
                  </div>
                </div>

                <div className="pt-2 text-xs">
                  <p className="text-slate-400">Địa điểm:</p>
                  <p className="font-semibold text-slate-700">{selectedTicket.room || 'Tầng 1 sảnh tiếp đón'}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  In phiếu khám
                </button>
                {selectedTicket.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedTicket.id, selectedTicket.ticketCode)}
                    className="py-2.5 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    Huỷ lịch này
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Appointments List */
            <>
              {loading ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs">Đang tải lịch hẹn khám...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl">event_busy</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mb-1">Chưa có lịch hẹn nào</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                    Quý khách chưa đặt lịch hẹn khám nào tại Mỹ Phát Hospital. Đặt lịch ngay để được phục vụ ưu tiên!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBooking();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Đặt Lịch Khám Ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-5 rounded-2xl border border-slate-200/90 hover:border-primary/40 bg-white hover:bg-slate-50/50 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-slate-900">
                            {apt.ticketCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                              apt.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {apt.status === 'CANCELLED' ? 'Đã Hủy' : 'Đã Xác Nhận'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {apt.departmentName} &bull; <span className="font-medium text-slate-600">{apt.doctorName}</span>
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                            {formatDateVN(apt.appointmentDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                            {apt.timeSlot}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                            {apt.patientName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(apt)}
                          className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">receipt_long</span>
                          Xem vé
                        </button>
                        {apt.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(apt.id, apt.ticketCode)}
                            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors"
                          >
                            Hủy lịch
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
