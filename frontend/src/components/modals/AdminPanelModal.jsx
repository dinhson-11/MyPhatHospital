import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { appointmentService } from '../../services/appointmentService';
import { DEPARTMENTS, DOCTORS } from '../../services/dataService';
import { getErrorMessage } from '../../services/apiError';
import { APPOINTMENT_STATUS_LABELS, formatDate, formatDateTime, labelOf } from '../../utils/format';

const STATUS_BADGE = {
  BOOKED: 'badge-warning',
  CONFIRMED: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-error',
  NO_SHOW: 'badge-neutral'
};

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BOOKED', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'COMPLETED', label: 'Đã khám xong' },
  { key: 'CANCELLED', label: 'Đã hủy' }
];

const dateOf = (apt) => apt.appointmentDate || apt.scheduledDate || '';

function StatCard({ icon, label, value, tone = 'text-primary bg-primary-fixed' }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function AdminPanelModal({ isOpen, onClose }) {
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Mỗi lần mở modal: hiển thị trạng thái đang tải (điều chỉnh state khi render, không đặt trong effect)
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setStatus('loading');
      setError('');
    }
  }

  // Tải danh sách khi mở modal hoặc khi bấm "Làm mới"/"Thử lại"; bỏ qua phản hồi đến muộn của lần tải cũ
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    // Quản trị viên xem toàn bộ lịch khám (GET /appointments) – /appointments/me chỉ dành cho bệnh nhân
    Promise.resolve()
      .then(() => appointmentService.getAppointments())
      .then(
        (data) => {
          if (cancelled) return;
          setAppointments(Array.isArray(data) ? data : []);
          setStatus('ready');
        },
        (err) => {
          if (cancelled) return;
          setError(getErrorMessage(err, 'Không tải được danh sách lịch khám. Vui lòng thử lại.'));
          setStatus('error');
        }
      );
    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadKey]);

  const loadAll = () => {
    setStatus('loading');
    setError('');
    setReloadKey((k) => k + 1);
  };

  const counts = useMemo(() => {
    const result = { ALL: appointments.length };
    appointments.forEach((a) => {
      result[a.status] = (result[a.status] || 0) + 1;
    });
    return result;
  }, [appointments]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments
      .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
      .filter((a) => {
        if (!q) return true;
        return [a.ticketCode, a.patientName, a.phoneNumber, a.patientPhone, a.departmentName, a.doctorName]
          .some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => `${dateOf(b)} ${b.timeSlot || ''}`.localeCompare(`${dateOf(a)} ${a.timeSlot || ''}`));
  }, [appointments, statusFilter, search]);

  const isLoading = status === 'loading' || status === 'idle';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon="admin_panel_settings"
      title="Bảng Điều Khiển Quản Trị"
      subtitle="Tổng quan lịch khám và danh mục khoa phòng của bệnh viện"
      bodyClassName="px-5 py-5 sm:px-6 overflow-y-auto space-y-5"
    >
      {/* Tổng quan */}
      <section aria-label="Số liệu tổng quan" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="domain" label="Khoa phòng" value={`${DEPARTMENTS.length} khoa`} />
        <StatCard icon="stethoscope" label="Bác sĩ" value={`${DOCTORS.length} bác sĩ`} tone="text-teal-700 bg-teal-50" />
        <StatCard
          icon="event_available"
          label="Lịch khám"
          value={isLoading ? '…' : `${counts.ALL || 0} lịch`}
        />
        <StatCard
          icon="pending_actions"
          label="Chờ xác nhận"
          value={isLoading ? '…' : `${counts.BOOKED || 0} lịch`}
          tone="text-amber-700 bg-amber-50"
        />
      </section>

      {/* Danh sách lịch khám */}
      <section aria-labelledby="admin-appointments-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="admin-appointments-title" className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">calendar_view_day</span>
            Danh sách lịch khám đã đăng ký
          </h3>
          <button
            type="button"
            onClick={loadAll}
            disabled={status === 'loading'}
            className="btn btn-secondary btn-sm"
          >
            <span className={`material-symbols-outlined ${status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
            Làm mới
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="segmented flex-wrap" role="group" aria-label="Lọc theo trạng thái">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                className={statusFilter === f.key ? 'is-active' : ''}
              >
                {f.label} ({counts[f.key] || 0})
              </button>
            ))}
          </div>
          <div className="input-group lg:ml-auto lg:w-72">
            <label htmlFor="admin-appointment-search" className="sr-only">Tìm lịch khám</label>
            <span className="material-symbols-outlined input-icon" aria-hidden="true">search</span>
            <input
              id="admin-appointment-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mã phiếu, tên, SĐT, khoa…"
              className="input"
            />
          </div>
        </div>

        {isLoading ? (
          <div role="status" aria-live="polite" className="space-y-2">
            <span className="sr-only">Đang tải danh sách lịch khám…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12" aria-hidden="true" />
            ))}
          </div>
        ) : status === 'error' ? (
          <div className="empty-state border border-red-200 bg-red-50 rounded-xl">
            <div className="empty-state-icon !bg-red-100 !text-red-700">
              <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
            </div>
            <p className="empty-state-title">Không tải được danh sách lịch khám</p>
            <p role="alert" className="empty-state-text !text-red-800">{error}</p>
            <button type="button" onClick={loadAll} className="btn btn-primary btn-sm mt-2">
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Thử lại
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-state border border-dashed border-slate-300 rounded-xl">
            <div className="empty-state-icon">
              <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
            </div>
            <p className="empty-state-title">Chưa có lịch khám nào</p>
            <p className="empty-state-text">Lịch khám do bệnh nhân hoặc lễ tân đăng ký sẽ hiển thị tại đây.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state border border-dashed border-slate-300 rounded-xl">
            <div className="empty-state-icon">
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
            </div>
            <p className="empty-state-title">Không có lịch khám phù hợp</p>
            <p className="empty-state-text">Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm.</p>
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setSearch(''); }}
              className="btn btn-light btn-sm mt-2"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="table-wrap max-h-[55vh]">
            <table className="table">
              <caption className="sr-only">Danh sách lịch khám ({visible.length} lịch)</caption>
              <thead>
                <tr>
                  <th scope="col">Mã phiếu</th>
                  <th scope="col">Bệnh nhân</th>
                  <th scope="col">Chuyên khoa / Bác sĩ</th>
                  <th scope="col">Ngày khám</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((apt) => (
                  <tr key={apt.id ?? apt.ticketCode}>
                    <td>
                      <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">{apt.ticketCode || '—'}</span>
                      {apt.createdAt && (
                        <span className="block text-xs text-slate-500 whitespace-nowrap">Tạo lúc {formatDateTime(apt.createdAt)}</span>
                      )}
                    </td>
                    <td>
                      <span className="cell-primary block">{apt.patientName || '—'}</span>
                      <span className="block text-xs text-slate-500">{apt.phoneNumber || apt.patientPhone || 'Chưa có SĐT'}</span>
                    </td>
                    <td>
                      <span className="block text-primary font-medium">{apt.departmentName || '—'}</span>
                      {apt.doctorName && <span className="block text-xs text-slate-500">{apt.doctorName}</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="block font-semibold text-slate-800">{formatDate(dateOf(apt))}</span>
                      {apt.timeSlot && <span className="block text-xs text-slate-500">{apt.timeSlot}</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[apt.status] || 'badge-neutral'}`}>
                        {labelOf(APPOINTMENT_STATUS_LABELS, apt.status, 'Chưa rõ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Modal>
  );
}
