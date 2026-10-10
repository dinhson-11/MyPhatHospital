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
    doctorName: 'TS.BS Vi Mai Anh',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    appointmentDate: '2026-09-29',
    scheduledDate: '2026-09-29',
    timeSlot: '08:30 - 09:00',
    notes: 'Khám sức khỏe tổng quát định kỳ',
    symptom: 'Khám sức khỏe tổng quát định kỳ',
    room: 'Phòng khám ban đầu 101 (Tầng 1)',
    fee: 350000,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  }
];

// Định dạng ngày theo giờ địa phương (toISOString dùng UTC làm lệch ngày)
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    date = toLocalDateStr(d);
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
    departmentName: item.departmentName || '',
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

    const dateStr = appointmentDate || scheduledDate || toLocalDateStr(new Date());
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
      departmentId: Number(departmentId),
      departmentName: departmentName || '',
      doctorId: doctorId ? Number(doctorId) : null,
      doctorName: doctorName || 'Bác sĩ trực chuyên khoa',
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
      // Đặt lịch công khai: hệ thống tự tạo/tái sử dụng hồ sơ bệnh nhân theo họ tên + SĐT
      const backendPayload = {
        fullName: (patientName || '').trim(),
        phone: (phoneNumber || patientPhone || '').trim(),
        departmentId: Number(departmentId),
        doctorId: doctorId ? Number(doctorId) : null,
        scheduledAt,
        symptom: symptom || notes || undefined,
        notes: notes || undefined
      };

      const res = await apiClient.post('/public/appointments', backendPayload, { skipAuth: true });
      const backendData = res?.data;
      if (backendData?.id) {
        newAppointment.id = backendData.id;
        newAppointment.ticketCode = `HMS-${new Date().getFullYear()}-${String(backendData.id).padStart(4, '0')}`;
        newAppointment.status = backendData.status || newAppointment.status;
        // Thông tin bác sĩ/khoa lấy từ backend để vé khớp với dữ liệu thật
        if (backendData.doctorName) newAppointment.doctorName = backendData.doctorName;
        if (backendData.doctorId) newAppointment.doctorId = backendData.doctorId;
        if (backendData.departmentName) newAppointment.departmentName = backendData.departmentName;
      }
    } catch (err) {
      // Server đã phản hồi lỗi (validation, trùng lịch, sai bác sĩ...): báo lỗi thật, KHÔNG tạo vé giả
      if (err?.response) {
        throw new Error(err.response.data?.message || 'Không thể đặt lịch khám lúc này');
      }
      // Không kết nối được máy chủ: chỉ cho phép lưu cục bộ ở môi trường dev/test
      if (!import.meta.env.DEV) {
        throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
      }
      newAppointment.offline = true;
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
