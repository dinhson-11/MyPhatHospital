import React, { useEffect, useState } from 'react';
import { DEPARTMENTS, DOCTORS } from '../../services/dataService';
import { getTimeSlots, parseLocalDate } from '../../services/hospitalHours';
import { appointmentService } from '../../services/appointmentService';
import { VN_MOBILE_REGEX } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { APPOINTMENT_STATUS_LABELS, formatDate, labelOf, todayISO } from '../../utils/format';

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const cleanPhone = (v) => String(v || '').replace(/[\s.-]/g, '');

/** Khung giờ đã qua (với ngày hôm nay) thì không cho chọn. */
const isPastSlot = (dateStr, slot, now = new Date()) => {
  if (dateStr !== todayISO()) return false;
  const [h, m] = String(slot).split('-')[0].trim().split(':').map(Number);
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
};

/**
 * Đặt lịch khám: kiểm tra số điện thoại di động Việt Nam, ngày theo giờ địa phương,
 * chỉ hiển thị phiếu khi máy chủ đã ghi nhận lịch hẹn (trạng thái thật từ máy chủ).
 */
export default function BookingModal({ isOpen, onClose, initialData = {}, onViewAppointments }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setTicket(null);
      return;
    }
    setErrors({});
    setSubmitError('');
    setPatientName(user?.fullName || '');
    setPhoneNumber(user?.phoneNumber || user?.phone || '');

    const bookableDepts = DEPARTMENTS.filter((dept) => dept.canBook !== false);
    if (initialData.departmentId && bookableDepts.some((dept) => dept.id === Number(initialData.departmentId))) {
      setDepartmentId(String(initialData.departmentId));
    } else {
      setDepartmentId(String(bookableDepts[0]?.id || ''));
    }
    const targetDoc = initialData.doctorId ? DOCTORS.find((d) => d.id === Number(initialData.doctorId)) : null;
    setDoctorId(targetDoc && targetDoc.canBook !== false ? String(initialData.doctorId) : '');
    setNotes(initialData.notes || '');
    setAppointmentDate(tomorrowISO());
    setTimeSlot('');
  }, [isOpen, initialData, user]);

  const timeSlots = getTimeSlots(parseLocalDate(appointmentDate));
  const availableSlots = timeSlots.filter((s) => !isPastSlot(appointmentDate, s));
  const selectedSlot = availableSlots.includes(timeSlot) ? timeSlot : (availableSlots[0] || '');

  const availableDoctors = DOCTORS.filter(
    (d) => (!departmentId || d.departmentId === Number(departmentId)) && d.canBook !== false
  );

  const validate = () => {
    const e = {};
    if (!patientName.trim()) e.patientName = 'Vui lòng nhập họ tên người khám';
    const phone = cleanPhone(phoneNumber);
    if (!phone) e.phoneNumber = 'Vui lòng nhập số điện thoại';
    else if (!VN_MOBILE_REGEX.test(phone)) e.phoneNumber = 'Số điện thoại không hợp lệ (10–11 chữ số, bắt đầu bằng 0)';
    if (!departmentId) e.departmentId = 'Vui lòng chọn chuyên khoa';
    if (!appointmentDate) e.appointmentDate = 'Vui lòng chọn ngày khám';
    else if (appointmentDate < todayISO()) e.appointmentDate = 'Ngày khám không được ở quá khứ';
    if (!selectedSlot) e.timeSlot = 'Không còn khung giờ trống trong ngày đã chọn – vui lòng chọn ngày khác';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const v = validate();
    setErrors(v);
    setSubmitError('');
    if (Object.keys(v).length > 0) return;

    const selectedDept = DEPARTMENTS.find((d) => d.id === Number(departmentId));
    const selectedDoc = DOCTORS.find((d) => d.id === Number(doctorId));
    setLoading(true);
    try {
      const result = await appointmentService.createAppointment({
        patientName: patientName.trim(),
        phoneNumber: cleanPhone(phoneNumber),
        departmentId: Number(departmentId),
        departmentName: selectedDept?.name || '',
        doctorId: doctorId ? Number(doctorId) : null,
        doctorName: selectedDoc?.name || '',
        room: selectedDoc?.room || selectedDept?.room || '',
        appointmentDate,
        timeSlot: selectedSlot,
        notes: notes.trim()
      });
      setTicket(result);
      showToast('Đặt lịch khám thành công.', 'success');
    } catch (err) {
      setSubmitError(err.message || 'Không thể đặt lịch khám lúc này');
      showToast(err.message || 'Không thể đặt lịch khám lúc này', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = (name) => ({
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `booking-${name}-error` : undefined
  });
  const errorOf = (name) => (errors[name]
    ? <p id={`booking-${name}-error`} className="form-error">{errors[name]}</p>
    : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ticket ? 'Phiếu khám bệnh điện tử' : 'Đặt lịch khám'}
      subtitle={ticket ? 'Bệnh viện Mỹ Phát đã ghi nhận lịch hẹn của bạn' : 'Đặt trước để giảm thời gian chờ tại bệnh viện'}
      icon={ticket ? 'confirmation_number' : 'event_available'}
      size="md"
    >
      {ticket ? (
        <div id="appointment-ticket-content">
          <article className="border-2 border-dashed border-primary/40 rounded-2xl p-5 bg-primary-fixed/40" aria-labelledby="booking-ticket-code">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-primary">Mã phiếu khám</p>
                <p id="booking-ticket-code" className="text-2xl font-black text-slate-900 font-mono tracking-wider">{ticket.ticketCode}</p>
              </div>
              <span className="badge badge-primary">{labelOf(APPOINTMENT_STATUS_LABELS, ticket.status, 'Đã ghi nhận')}</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-sm border-b border-slate-200">
              <div><dt className="text-xs text-slate-600">Bệnh nhân</dt><dd className="font-bold text-slate-900">{ticket.patientName}</dd></div>
              <div><dt className="text-xs text-slate-600">Số điện thoại</dt><dd className="font-bold text-slate-900">{ticket.patientPhone}</dd></div>
              <div><dt className="text-xs text-slate-600">Chuyên khoa</dt><dd className="font-bold text-primary">{ticket.departmentName || '—'}</dd></div>
              <div><dt className="text-xs text-slate-600">Bác sĩ</dt><dd className="font-bold text-slate-900">{ticket.doctorName || 'Bệnh viện sẽ phân công'}</dd></div>
              <div><dt className="text-xs text-slate-600">Ngày khám</dt><dd className="font-bold text-slate-900">{formatDate(ticket.appointmentDate)}</dd></div>
              <div><dt className="text-xs text-slate-600">Khung giờ</dt><dd className="font-bold text-slate-900">{ticket.timeSlot}</dd></div>
            </dl>

            <p className="pt-3 text-[13px] text-slate-700">
              {ticket.status === 'BOOKED'
                ? 'Lịch hẹn đang chờ bệnh viện xác nhận. '
                : ''}
              Vui lòng đến quầy tiếp đón tầng 1 trước giờ hẹn 15 phút và đọc mã phiếu khám.
              Địa chỉ: 1170 Quang Trung, Thị trấn Chũ, Lục Ngạn, Bắc Giang · Hotline: 0789 065 493.
            </p>
          </article>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button type="button" id="btn-print-ticket" onClick={() => window.print()} className="btn btn-secondary flex-1">
              <span className="material-symbols-outlined" aria-hidden="true">print</span>
              In / lưu phiếu khám
            </button>
            <button
              type="button"
              id="btn-view-my-appointments-ticket"
              onClick={() => { onClose?.(); onViewAppointments?.(); }}
              className="btn btn-primary flex-1"
            >
              <span className="material-symbols-outlined" aria-hidden="true">list_alt</span>
              Xem lịch khám của tôi
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor="booking-patient-name" className="form-label">Họ và tên người khám <span className="required">*</span></label>
              <input
                id="booking-patient-name"
                type="text"
                autoComplete="name"
                value={patientName}
                onChange={(e) => { setPatientName(e.target.value); setErrors((p) => ({ ...p, patientName: undefined })); }}
                className={`input ${errors.patientName ? 'is-error' : ''}`}
                {...fieldProps('patientName')}
              />
              {errorOf('patientName')}
            </div>
            <div className="form-field">
              <label htmlFor="booking-phone-number" className="form-label">Số điện thoại di động <span className="required">*</span></label>
              <input
                id="booking-phone-number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setErrors((p) => ({ ...p, phoneNumber: undefined })); }}
                onBlur={() => {
                  const phone = cleanPhone(phoneNumber);
                  if (phone && !VN_MOBILE_REGEX.test(phone)) {
                    setErrors((p) => ({ ...p, phoneNumber: 'Số điện thoại không hợp lệ (10–11 chữ số, bắt đầu bằng 0)' }));
                  }
                }}
                placeholder="VD: 0912 345 678"
                className={`input ${errors.phoneNumber ? 'is-error' : ''}`}
                {...fieldProps('phoneNumber')}
              />
              {errorOf('phoneNumber')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor="booking-department" className="form-label">Chuyên khoa <span className="required">*</span></label>
              <select
                id="booking-department"
                value={departmentId}
                onChange={(e) => { setDepartmentId(e.target.value); setDoctorId(''); }}
                className={`select ${errors.departmentId ? 'is-error' : ''}`}
                {...fieldProps('departmentId')}
              >
                {DEPARTMENTS.filter((d) => d.canBook !== false).map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {errorOf('departmentId')}
            </div>
            <div className="form-field">
              <label htmlFor="booking-doctor" className="form-label">Bác sĩ mong muốn (không bắt buộc)</label>
              <select id="booking-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="select">
                <option value="">Bệnh viện phân công bác sĩ phù hợp</option>
                {availableDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.name}{doc.title ? ` (${doc.title})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor="booking-date" className="form-label">Ngày khám <span className="required">*</span></label>
              <input
                id="booking-date"
                type="date"
                value={appointmentDate}
                min={todayISO()}
                onChange={(e) => { setAppointmentDate(e.target.value); setErrors((p) => ({ ...p, appointmentDate: undefined, timeSlot: undefined })); }}
                className={`input ${errors.appointmentDate ? 'is-error' : ''}`}
                {...fieldProps('appointmentDate')}
              />
              {errorOf('appointmentDate')}
            </div>
            <div className="form-field">
              <label htmlFor="booking-time-slot" className="form-label">Khung giờ <span className="required">*</span></label>
              <select
                id="booking-time-slot"
                value={selectedSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                disabled={availableSlots.length === 0}
                className={`select ${errors.timeSlot ? 'is-error' : ''}`}
                {...fieldProps('timeSlot')}
              >
                {availableSlots.length === 0 && <option value="">Hết khung giờ trong ngày</option>}
                {availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
              {errorOf('timeSlot')}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="booking-notes" className="form-label">Lý do khám / triệu chứng</label>
            <textarea
              id="booking-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mô tả ngắn gọn triệu chứng để bác sĩ chuẩn bị tốt hơn"
              className="textarea"
            />
          </div>

          {submitError && (
            <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{submitError}</p>
          )}

          <button type="submit" id="btn-confirm-booking" disabled={loading} className="btn btn-primary btn-lg btn-block">
            <span className="material-symbols-outlined" aria-hidden="true">{loading ? 'progress_activity' : 'event_available'}</span>
            {loading ? 'Đang gửi lịch hẹn…' : 'Xác nhận đặt lịch'}
          </button>
        </form>
      )}
    </Modal>
  );
}
