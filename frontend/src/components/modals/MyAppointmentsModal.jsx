import React, { useCallback, useEffect, useState } from 'react';
import { appointmentService, canCancelAppointment } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import { APPOINTMENT_STATUS_LABELS, formatDate, labelOf } from '../../utils/format';

const STATUS_BADGE = {
  BOOKED: 'badge-warning',
  CONFIRMED: 'badge-success',
  COMPLETED: 'badge-info',
  CANCELLED: 'badge-error',
  NO_SHOW: 'badge-neutral'
};

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] || 'badge-neutral'}`}>
      {labelOf(APPOINTMENT_STATUS_LABELS, status, 'Không rõ')}
    </span>
  );
}

/**
 * Lịch khám của tôi.
 * - Đã đăng nhập: lấy lịch hẹn từ máy chủ (trạng thái mới nhất).
 * - Chưa đăng nhập: hiển thị các phiếu đã đặt thành công trên thiết bị này (không hủy được, cần đăng nhập).
 * - Chỉ cho hủy lịch "Đã đặt" / "Đã xác nhận" và chưa tới giờ khám; có hộp thoại xác nhận.
 */
export default function MyAppointmentsModal({ isOpen, onClose, onOpenBooking }) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [state, setState] = useState({ status: 'idle', items: [], error: '', fromDevice: false });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadAppointments = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ status: 'ready', items: appointmentService.getDeviceBookings(), error: '', fromDevice: true });
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await appointmentService.getMyAppointments();
      setState({ status: 'ready', items, error: '', fromDevice: false });
    } catch (err) {
      setState({ status: 'error', items: [], error: err.message, fromDevice: false });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      setSelectedTicket(null);
      loadAppointments();
    }
  }, [isOpen, loadAppointments]);

  const handleCancel = async (apt) => {
    if (cancellingId) return;
    const ok = await confirm({
      title: 'Hủy lịch khám?',
      message: 'Lịch khám sẽ bị hủy và khung giờ được nhường cho người bệnh khác.',
      details: [
        `Mã phiếu: ${apt.ticketCode}`,
        `Ngày khám: ${formatDate(apt.appointmentDate)}${apt.timeSlot ? `, ${apt.timeSlot}` : ''}`,
        apt.departmentName ? `Khoa: ${apt.departmentName}` : null
      ].filter(Boolean),
      tone: 'danger',
      confirmText: 'Hủy lịch khám',
      cancelText: 'Giữ lịch'
    });
    if (!ok) return;
    setCancellingId(apt.id);
    try {
      await appointmentService.cancelAppointment(apt.id);
      showToast(`Đã hủy lịch khám ${apt.ticketCode}.`, 'success');
      setSelectedTicket((prev) => (prev && prev.id === apt.id ? { ...prev, status: 'CANCELLED' } : prev));
      await loadAppointments();
    } catch (err) {
      showToast(err.message || 'Hủy lịch khám không thành công', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (apt) => isAuthenticated && canCancelAppointment(apt);

  const cancelButton = (apt, extraClass = '') => (
    <button
      type="button"
      onClick={() => handleCancel(apt)}
      disabled={Boolean(cancellingId)}
      className={`btn btn-secondary btn-sm text-red-700 ${extraClass}`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
      {cancellingId === apt.id ? 'Đang hủy…' : 'Hủy lịch'}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch khám của tôi"
      subtitle="Tra cứu và quản lý các lịch hẹn đã đặt"
      icon="event_note"
      size="lg"
    >
      {selectedTicket ? (
        <div>
          <button type="button" onClick={() => setSelectedTicket(null)} className="btn btn-ghost btn-sm mb-3">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            Quay lại danh sách
          </button>

          <article className="border-2 border-dashed border-primary/40 rounded-2xl p-5 bg-primary-fixed/40" aria-labelledby="ticket-code">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 flex-wrap">
              <div>
                <p className="text-xs text-slate-600 font-semibold">Mã phiếu khám</p>
                <h3 id="ticket-code" className="text-xl font-mono font-black text-slate-900">{selectedTicket.ticketCode}</h3>
              </div>
              <StatusBadge status={selectedTicket.status} />
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-[13px]">
              <div><dt className="text-slate-600">Bệnh nhân</dt><dd className="font-bold text-slate-900 text-sm">{selectedTicket.patientName || '—'}</dd></div>
              <div><dt className="text-slate-600">Số điện thoại</dt><dd className="font-bold text-slate-900 text-sm">{selectedTicket.patientPhone || '—'}</dd></div>
              <div><dt className="text-slate-600">Khoa khám</dt><dd className="font-bold text-primary text-sm">{selectedTicket.departmentName || '—'}</dd></div>
              <div><dt className="text-slate-600">Bác sĩ</dt><dd className="font-bold text-slate-900 text-sm">{selectedTicket.doctorName || 'Bệnh viện sẽ phân công'}</dd></div>
              <div><dt className="text-slate-600">Ngày khám</dt><dd className="font-bold text-slate-900 text-sm">{formatDate(selectedTicket.appointmentDate)}</dd></div>
              <div><dt className="text-slate-600">Khung giờ</dt><dd className="font-bold text-slate-900 text-sm">{selectedTicket.timeSlot || '—'}</dd></div>
            </dl>

            <p className="text-[13px] text-slate-700">
              Vui lòng đến quầy tiếp đón tầng 1 trước giờ hẹn 15 phút và xuất trình mã phiếu khám.
            </p>
          </article>

          <div className="mt-4 flex gap-3 flex-wrap">
            <button type="button" onClick={() => window.print()} className="btn btn-secondary">
              <span className="material-symbols-outlined" aria-hidden="true">print</span>
              In phiếu khám
            </button>
            {canCancel(selectedTicket) && cancelButton(selectedTicket)}
          </div>
        </div>
      ) : state.status === 'loading' || state.status === 'idle' ? (
        <p className="py-12 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải lịch hẹn…</p>
      ) : state.status === 'error' ? (
        <div role="alert" className="py-10 text-center space-y-3">
          <p className="text-sm text-red-800">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadAppointments}>
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Thử lại
          </button>
        </div>
      ) : state.items.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">event_busy</span>
          <h3 className="font-bold text-slate-900 text-base mt-2 mb-1">Chưa có lịch hẹn nào</h3>
          <p className="text-[13px] text-slate-600 max-w-sm mx-auto mb-5">
            {state.fromDevice
              ? 'Thiết bị này chưa đặt lịch khám nào. Đăng nhập để xem toàn bộ lịch hẹn của bạn.'
              : 'Bạn chưa đặt lịch khám nào tại Bệnh viện Mỹ Phát.'}
          </p>
          <button type="button" onClick={() => { onClose?.(); onOpenBooking?.(); }} className="btn btn-primary">
            <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
            Đặt lịch khám
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {state.fromDevice && (
            <p className="text-[13px] p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-950">
              Đây là các phiếu đã đặt trên thiết bị này – trạng thái có thể chưa cập nhật. Đăng nhập để xem trạng thái mới nhất và hủy lịch.
            </p>
          )}
          <ul className="space-y-3">
            {state.items.map((apt) => (
              <li
                key={apt.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-slate-900">{apt.ticketCode}</span>
                    <StatusBadge status={apt.status} />
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {apt.departmentName || 'Chưa rõ khoa'} · <span className="font-medium text-slate-700">{apt.doctorName || 'Bệnh viện sẽ phân công'}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-3 text-[13px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">calendar_today</span>
                      {formatDate(apt.appointmentDate)}
                    </span>
                    {apt.timeSlot && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">schedule</span>
                        {apt.timeSlot}
                      </span>
                    )}
                    {apt.patientName && <span>{apt.patientName}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedTicket(apt)} className="btn btn-secondary btn-sm" aria-label={`Xem phiếu ${apt.ticketCode}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                    Xem phiếu
                  </button>
                  {canCancel(apt) && cancelButton(apt)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
