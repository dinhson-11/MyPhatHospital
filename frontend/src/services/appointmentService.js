import apiClient from './api';

const APPOINTMENTS_KEY = 'hms_appointments';

const initialAppointments = [
  {
    id: 'HMS-2026-8812',
    ticketCode: 'HMS-2026-8812',
    patientName: 'Trần Đức Minh',
    phoneNumber: '0912345678',
    patientPhone: '0912345678',
    patientEmail: 'minh.tran@gmail.com',
    doctorId: 1,
    doctorName: 'TS. BS. Nguyễn Văn Hùng',
    departmentId: 5,
    departmentName: 'Khoa Tim mạch',
    appointmentDate: '2026-09-29',
    scheduledDate: '2026-09-29',
    timeSlot: '08:30 - 09:00',
    notes: 'Khám định kỳ huyết áp và kiểm tra nhịp tim',
    symptom: 'Khám định kỳ huyết áp và kiểm tra nhịp tim',
    room: 'Phòng khám 306 (Tầng 3)',
    fee: 350000,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  }
];

const getStoredAppointments = () => {
  const raw = localStorage.getItem(APPOINTMENTS_KEY);
  if (!raw) {
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(initialAppointments));
    return [...initialAppointments];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...initialAppointments];
  }
};

/**
 * Chuẩn hóa dữ liệu lịch hẹn từ API backend sang cấu trúc đồng nhất cho UI.
 */
function normalizeBackendAppointment(item) {
  let date = '';
  let slot = '08:30 - 09:00';
  if (item.scheduledAt) {
    const d = new Date(item.scheduledAt);
    date = d.toISOString().split('T')[0];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const endM = (d.getMinutes() + 30) % 60;
    const endH = d.getHours() + (d.getMinutes() + 30 >= 60 ? 1 : 0);
    slot = `${h}:${m} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  const numericId = item.id;
  const ticketCode = item.ticketCode || `HMS-${new Date().getFullYear()}-${String(numericId || Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;

  return {
    id: numericId || ticketCode,
    ticketCode,
    patientId: item.patientId,
    patientName: item.patientName || 'Bệnh nhân',
    patientPhone: item.patientPhone || item.phone || '',
    patientCode: item.patientCode || '',
    doctorId: item.doctorId,
    doctorName: item.doctorName || 'Bác sĩ trực chuyên khoa',
    departmentId: item.departmentId,
    departmentName: item.departmentName || 'Khoa Nội tổng quát',
    appointmentDate: date || item.appointmentDate || item.scheduledDate,
    scheduledDate: date || item.appointmentDate || item.scheduledDate,
    timeSlot: item.timeSlot || slot,
    notes: item.notes || item.symptom || 'Khám kiểm tra sức khỏe',
    symptom: item.symptom || item.notes || 'Khám kiểm tra sức khỏe',
    room: item.room || 'Phòng khám 201 (Tầng 2)',
    fee: item.fee || 300000,
    status: item.status || 'CONFIRMED',
    source: item.source || 'PATIENT',
    createdAt: item.createdAt || new Date().toISOString()
  };
}

export const appointmentService = {
  /**
   * Lấy danh sách lịch hẹn từ backend (có fallback local)
   */
  async getAppointments() {
    try {
      const res = await apiClient.get('/appointments');
      if (res && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data.content || []);
        if (rawList.length > 0) {
          return rawList.map(normalizeBackendAppointment);
        }
      }
    } catch {
      // Backend offline hoặc lỗi -> Fallback local
    }
    return getStoredAppointments();
  },

  /**
   * Lấy lịch hẹn của bệnh nhân hiện tại
   */
  async getMyAppointments() {
    try {
      const res = await apiClient.get('/appointments/me');
      if (res && res.data) {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data.content || []);
        if (rawList.length > 0) {
          return rawList.map(normalizeBackendAppointment);
        }
      }
    } catch {
      // Fallback
    }
    return this.getAppointments();
  },

  /**
   * Đặt lịch hẹn mới. Kết nối POST /api/v1/appointments.
   * Tự động đồng bộ vào local cache để phục vụ hiển thị phiếu khám ngay lập tức.
   */
  async createAppointment(bookingData) {
    const {
      patientName,
      phoneNumber,
      patientPhone,
      patientEmail,
      departmentId,
      departmentName,
      doctorId,
      doctorName,
      appointmentDate,
      scheduledDate,
      timeSlot,
      notes,
      symptom,
      room,
      fee
    } = bookingData;

    const dateStr = appointmentDate || scheduledDate || new Date().toISOString().split('T')[0];
    const slotStr = timeSlot || '08:30 - 09:00';
    const startHourMin = slotStr.split('-')[0].trim();
    const scheduledAt = `${dateStr}T${startHourMin.length === 5 ? startHourMin : '08:30'}:00`;

    const code = `HMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment = {
      id: code,
      ticketCode: code,
      patientName,
      phoneNumber: phoneNumber || patientPhone,
      patientPhone: phoneNumber || patientPhone,
      patientEmail: patientEmail || '',
      departmentId: departmentId ? Number(departmentId) : 1,
      departmentName: departmentName || 'Khoa Nội tổng quát',
      doctorId: doctorId ? Number(doctorId) : 1,
      doctorName: doctorName || 'TS. BS. Nguyễn Văn Hùng',
      appointmentDate: dateStr,
      scheduledDate: dateStr,
      timeSlot: slotStr,
      notes: notes || symptom || 'Khám kiểm tra sức khỏe',
      symptom: symptom || notes || 'Khám kiểm tra sức khỏe',
      room: room || 'Phòng khám chuyên khoa',
      fee: fee || 300000,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    try {
      const backendPayload = {
        patientId: bookingData.patientId || 1,
        doctorId: newAppointment.doctorId,
        departmentId: newAppointment.departmentId,
        scheduledAt,
        symptom: newAppointment.symptom,
        notes: newAppointment.notes,
        source: 'PATIENT'
      };

      const res = await apiClient.post('/appointments', backendPayload);
      if (res && res.data) {
        const backendData = res.data;
        if (backendData.id) {
          newAppointment.id = backendData.id;
          newAppointment.ticketCode = `HMS-${new Date().getFullYear()}-${String(backendData.id).padStart(4, '0')}`;
        }
        if (backendData.status) {
          newAppointment.status = backendData.status;
        }
      }
    } catch {
      // Backend offline hoặc lỗi -> Lưu local fallback
    }

    const currentList = getStoredAppointments();
    currentList.unshift(newAppointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(currentList));

    return newAppointment;
  },

  async bookAppointment(bookingData) {
    return this.createAppointment(bookingData);
  },

  /**
   * Hủy lịch hẹn: gửi PATCH /api/v1/appointments/{id}/cancel
   */
  async cancelAppointment(appointmentId, reason = 'Bệnh nhân yêu cầu hủy') {
    try {
      await apiClient.patch(`/appointments/${appointmentId}/cancel`, null, {
        params: { reason }
      });
    } catch {
      // Fallback
    }

    const currentList = getStoredAppointments();
    const index = currentList.findIndex(a =>
      a.id === appointmentId ||
      a.ticketCode === appointmentId ||
      String(a.id) === String(appointmentId)
    );

    if (index !== -1) {
      currentList[index].status = 'CANCELLED';
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(currentList));
      return currentList[index];
    }
    throw new Error('Không tìm thấy lịch hẹn');
  },

  /**
   * Xác nhận lịch hẹn: gửi PATCH /api/v1/appointments/{id}/confirm
   */
  async confirmAppointment(appointmentId) {
    try {
      await apiClient.patch(`/appointments/${appointmentId}/confirm`);
    } catch {
      // Fallback
    }

    const currentList = getStoredAppointments();
    const target = currentList.find(a =>
      a.id === appointmentId ||
      a.ticketCode === appointmentId ||
      String(a.id) === String(appointmentId)
    );

    if (target) {
      target.status = 'CONFIRMED';
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(currentList));
      return target;
    }
    return null;
  },

  /**
   * Lấy khung giờ trống của bác sĩ theo ngày: GET /api/v1/appointments/available-slots
   */
  async getAvailableSlots(doctorId, date) {
    try {
      const res = await apiClient.get('/appointments/available-slots', {
        params: { doctorId, date }
      });
      if (res && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('Không thể tải khung giờ từ backend:', err);
    }
    return null;
  }
};
