import React, { useState, useEffect } from 'react';
import { DEPARTMENTS, DOCTORS, TIME_SLOTS } from '../../services/dataService';
import { appointmentService } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function BookingModal({
  isOpen,
  onClose,
  initialData = {},
  onViewAppointments
}) {
  useEscapeKey(isOpen, onClose);
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null); // When booking succeeds, show ticket view

  // Prefill initial data when opened
  useEffect(() => {
    if (!isOpen) {
      setTicket(null);
      return;
    }

    if (user) {
      setPatientName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
    } else {
      setPatientName('');
      setPhoneNumber('');
    }

    const bookableDepts = DEPARTMENTS.filter((dept) => dept.canBook !== false);
    if (initialData.departmentId && bookableDepts.some((dept) => dept.id === Number(initialData.departmentId))) {
      setDepartmentId(String(initialData.departmentId));
    } else {
      setDepartmentId(String(bookableDepts[0]?.id || '1'));
    }

    if (initialData.doctorId) {
      const targetDoc = DOCTORS.find((d) => d.id === Number(initialData.doctorId));
      if (targetDoc && targetDoc.canBook !== false) {
        setDoctorId(String(initialData.doctorId));
      } else {
        setDoctorId('');
      }
    } else {
      setDoctorId('');
    }

    if (initialData.notes) {
      setNotes(initialData.notes);
    } else {
      setNotes('');
    }

    // Default tomorrow's date or today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setAppointmentDate(dateStr);
  }, [isOpen, initialData, user]);

  if (!isOpen) return null;

  // Filter available doctors for the selected department (only bookable examining doctors)
  const availableDoctors = DOCTORS.filter(
    (d) => (!departmentId || d.departmentId === Number(departmentId)) && d.canBook !== false
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !phoneNumber.trim() || !appointmentDate || !departmentId) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'warning');
      return;
    }

    const selectedDept = DEPARTMENTS.find((d) => d.id === Number(departmentId));
    const selectedDoc = DOCTORS.find((d) => d.id === Number(doctorId));

    setLoading(true);
    try {
      const payload = {
        patientName,
        phoneNumber,
        departmentId: Number(departmentId),
        departmentName: selectedDept ? selectedDept.name : 'Đa khoa',
        doctorId: doctorId ? Number(doctorId) : null,
        doctorName: selectedDoc ? selectedDoc.name : 'Bác sĩ trực chuyên khoa',
        room: selectedDoc ? selectedDoc.room : (selectedDept ? selectedDept.room : 'Phòng tiếp đón Tầng 1'),
        appointmentDate,
        timeSlot,
        notes
      };

      const result = await appointmentService.createAppointment(payload);
      setTicket(result);
      showToast('Đặt lịch khám thành công! Mã số khám của bạn đã được tạo.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể đặt lịch khám lúc này';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src={logoHospital}
                alt="Logo Mỹ Phát Hospital"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {ticket ? 'Phiếu Khám Bệnh Điện Tử' : 'Đăng Ký Đặt Lịch Khám'}
              </h3>
              <p className="text-xs text-slate-500">
                {ticket ? 'Mã phiếu khám hợp lệ tại Mỹ Phát Hospital' : 'Tiết kiệm thời gian, không cần xếp hàng bốc số'}
              </p>
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

        {/* Content Body */}
        {ticket ? (
          /* TICKET CONFIRMATION VIEW */
          <div className="p-6 sm:p-8" id="appointment-ticket-content">
            <div className="border-2 border-dashed border-emerald-500/40 rounded-2xl p-6 bg-emerald-50/30 relative">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-200">
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    MÃ SỐ PHIẾU KHÁM
                  </span>
                  <p className="text-2xl font-black text-slate-900 font-mono tracking-wider">
                    {ticket.ticketCode}
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                  Đã Xác Nhận
                </span>
              </div>

              {/* Ticket Details */}
              <div className="grid grid-cols-2 gap-4 py-4 text-sm border-b border-emerald-100">
                <div>
                  <p className="text-xs text-slate-500">Bệnh nhân:</p>
                  <p className="font-bold text-slate-900">{ticket.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Số điện thoại:</p>
                  <p className="font-bold text-slate-900">{ticket.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chuyên khoa:</p>
                  <p className="font-bold text-primary">{ticket.departmentName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Bác sĩ phụ trách:</p>
                  <p className="font-bold text-slate-900">{ticket.doctorName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày khám (dd/mm/yyyy):</p>
                  <p className="font-bold text-slate-900">
                    {ticket.appointmentDate ? ticket.appointmentDate.split('-').reverse().join('/') : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Khung giờ:</p>
                  <p className="font-bold text-slate-900">{ticket.timeSlot}</p>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Địa điểm / Phòng khám:</p>
                  <p className="text-xs font-bold text-teal-800 mt-0.5">{ticket.room}</p>
                </div>
                <div className="text-xs text-slate-500">
                  <span>Trạng thái: </span>
                  <span className="font-semibold text-emerald-700">Chờ tiếp đón tại quầy Tầng 1</span>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="mt-5 pt-4 border-t border-dashed border-emerald-200 text-center">
                <div className="inline-block bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="h-10 flex items-center justify-center gap-1">
                    {[12, 24, 8, 16, 28, 6, 20, 14, 26, 10, 30, 8, 22, 18, 12, 26, 8, 24, 16].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="bg-slate-900 w-1 rounded-full"
                          style={{ height: `${h + 10}px` }}
                        ></div>
                      )
                    )}
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono font-bold tracking-widest mt-1 block">
                    {ticket.ticketCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 font-medium">
                  Quý khách vui lòng xuất trình mã vé tại Quầy tiếp đón – Mỹ Phát Hospital (1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang). Hotline: 0789 065 493.
                </p>
              </div>
            </div>

            {/* Ticket Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                id="btn-print-ticket"
                onClick={handlePrint}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                In / Lưu Phiếu Khám
              </button>

              <button
                type="button"
                id="btn-view-my-appointments-ticket"
                onClick={() => {
                  onClose();
                  if (onViewAppointments) onViewAppointments();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">list_alt</span>
                Xem Lịch Khám Của Tôi
              </button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM WITH STEPPER */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Visual Stepper */}
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100 text-center">
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center mb-1">
                  1
                </span>
                <span className="text-[11px] font-bold text-teal-800">Chuyên khoa</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center mb-1">
                  2
                </span>
                <span className="text-[11px] font-bold text-teal-800">Thời gian</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center mb-1">
                  3
                </span>
                <span className="text-[11px] font-bold text-teal-800">Người khám</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người khám *
                </label>
                <input
                  type="text"
                  required
                  id="booking-patient-name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  required
                  id="booking-phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chuyên khoa cần khám *
                </label>
                <select
                  id="booking-department"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setDoctorId(''); // Reset doctor when dept changes
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                >
                  {DEPARTMENTS.filter((d) => d.canBook !== false).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bác sĩ mong muốn (Tùy chọn)
                </label>
                <select
                  id="booking-doctor"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                >
                  <option value="">Bệnh viện chỉ định bác sĩ phù hợp</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày hẹn khám *
                </label>
                <input
                  type="date"
                  required
                  id="booking-date"
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khung giờ dự kiến *
                </label>
                <select
                  id="booking-time-slot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                >
                  {TIME_SLOTS.map((slot, idx) => (
                    <option key={idx} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do khám / Triệu chứng bệnh lý
              </label>
              <textarea
                id="booking-notes"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mô tả ngắn gọn triệu chứng để bác sĩ chuẩn bị hồ sơ tốt nhất..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="btn-confirm-booking"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Đang khởi tạo phiếu khám...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">verified</span>
                    <span>Xác Nhận Đặt Lịch Hẹn Khám</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
