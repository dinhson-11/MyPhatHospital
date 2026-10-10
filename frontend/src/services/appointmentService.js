import apiClient from './api';
import { toAppError } from './apiError';

/**
 * Dịch vụ lịch hẹn khám.
 *
 * - Chỉ tạo "phiếu khám" khi máy chủ đã ghi nhận lịch hẹn (không còn vé offline giả).
 * - Phiếu đặt thành công được lưu đệm trên thiết bị (DỮ LIỆU THẬT trả về từ máy chủ) để khách
 *   chưa đăng nhập xem lại; trạng thái mới nhất luôn lấy từ máy chủ khi đã đăng nhập.
 * - Hủy lịch: chỉ BOOKED/CONFIRMED và trước giờ hẹn; thất bại → ném lỗi, không đánh dấu hủy cục bộ.
 */

const DEVICE_BOOKINGS_KEY = 'hms_appointments';

export const CANCELLABLE_STATUSES = ['BOOKED', 'CONFIRMED'];

const pad = (n) => String(n).padStart(2, '0');
const toLocalDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Mã phiếu khám ổn định theo ID lịch hẹn của máy chủ. */
export function ticketCodeOf(item) {
  if (!item?.id) return '';
  const ref = item.createdAt || item.scheduledAt;
  const d = ref ? new Date(ref) : null;
  const year = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
  return `HMS-${year}-${String(item.id).padStart(4, '0')}`;
}

/** Chuẩn hóa dữ liệu lịch hẹn từ backend (AppointmentResponse) – không bịa thêm phòng/giá/bác sĩ. */
export function normalizeBackendAppointment(item = {}) {
  let date = item.appointmentDate || item.scheduledDate || '';
  let slot = item.timeSlot || '';
  if (item.scheduledAt) {
    const d = new Date(item.scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      date = toLocalDateStr(d);
      if (!slot) {
        const end = new Date(d.getTime() + 30 * 60000);
        slot = `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
      }
    }
  }
  return {
    id: item.id,
    ticketCode: item.ticketCode || ticketCodeOf(item),
    patientId: item.patientId ?? null,
    patientName: item.patientName || '',
    patientPhone: item.patientPhone || item.phoneNumber || item.phone || '',
    patientCode: item.patientCode || '',
    doctorId: item.doctorId ?? null,
    doctorName: item.doctorName || '',
    departmentId: item.departmentId ?? null,
    departmentName: item.departmentName || '',
    scheduledAt: item.scheduledAt || null,
    appointmentDate: date,
    scheduledDate: date,
    timeSlot: slot,
    symptom: item.symptom || '',
    notes: item.notes || '',
    room: item.room || '',
    status: item.status || 'BOOKED',
    source: item.source || null,
    createdAt: item.createdAt || null
  };
}

/** Thời điểm khám (Date) của lịch hẹn – dùng để kiểm tra còn được hủy hay không. */
export function appointmentStartTime(apt) {
  if (apt?.scheduledAt) {
    const d = new Date(apt.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (apt?.appointmentDate) {
    const start = String(apt.timeSlot || '').split('-')[0].trim() || '00:00';
    const d = new Date(`${apt.appointmentDate}T${start.length === 5 ? start : '00:00'}:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Bệnh nhân chỉ được hủy lịch BOOKED/CONFIRMED chưa tới giờ khám. */
export function canCancelAppointment(apt, now = new Date()) {
  if (!apt || !CANCELLABLE_STATUSES.includes(apt.status)) return false;
  const start = appointmentStartTime(apt);
  return Boolean(start) && start > now;
}

const readDeviceBookings = () => {
  try {
    const raw = localStorage.getItem(DEVICE_BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Chỉ giữ phiếu đã được máy chủ cấp (có ID số) – loại bỏ dữ liệu mẫu/offline cũ
    return Array.isArray(list) ? list.filter((a) => typeof a?.id === 'number' && !a.offline) : [];
  } catch {
    return [];
  }
};

const writeDeviceBookings = (list) => {
  try {
    localStorage.setItem(DEVICE_BOOKINGS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // bộ nhớ đầy / bị chặn – không ảnh hưởng nghiệp vụ
  }
};

const rememberBooking = (apt) => {
  const list = readDeviceBookings().filter((a) => a.id !== apt.id);
  list.unshift(apt);
  writeDeviceBookings(list);
};

const updateRememberedStatus = (id, status) => {
  const list = readDeviceBookings();
  const idx = list.findIndex((a) => String(a.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], status };
    writeDeviceBookings(list);
  }
};

const pageContent = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

export const appointmentService = {
  /** Tất cả lịch hẹn (nhân viên) – GET /appointments. */
  async getAppointments() {
    try {
      const res = await apiClient.get('/appointments', { params: { size: 100 } });
      return pageContent(res).map(normalizeBackendAppointment);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách lịch hẹn.');
    }
  },

  /**
   * Lịch hẹn của bệnh nhân đang đăng nhập – GET /appointments/me.
   * Tài khoản nhân viên (403 với /me) được chuyển sang danh sách chung để giữ tương thích màn quản trị.
   */
  async getMyAppointments() {
    try {
      const res = await apiClient.get('/appointments/me', { params: { size: 50 } });
      return pageContent(res).map(normalizeBackendAppointment);
    } catch (err) {
      if (err?.response?.status === 403) return this.getAppointments();
      throw toAppError(err, 'Không tải được lịch khám của bạn.');
    }
  },

  /** Phiếu đặt thành công trên thiết bị này (dữ liệu từ máy chủ, có thể chưa cập nhật trạng thái). */
  getDeviceBookings() {
    return readDeviceBookings();
  },

  /**
   * Đặt lịch khám (POST /public/appointments). Chỉ trả phiếu khi máy chủ đã lưu.
   */
  async createAppointment(bookingData = {}) {
    const {
      patientName, phoneNumber, patientPhone, departmentId, departmentName, doctorId, doctorName,
      appointmentDate, scheduledDate, timeSlot, notes, symptom, room
    } = bookingData;

    const dateStr = appointmentDate || scheduledDate;
    const startHourMin = String(timeSlot || '').split('-')[0].trim();
    if (!dateStr || !/^\d{2}:\d{2}$/.test(startHourMin)) {
      throw new Error('Vui lòng chọn ngày và khung giờ khám hợp lệ.');
    }
    const phone = String(phoneNumber || patientPhone || '').replace(/[\s.]/g, '');
    const payload = {
      fullName: String(patientName || '').trim(),
      phone,
      departmentId: Number(departmentId),
      doctorId: doctorId ? Number(doctorId) : null,
      scheduledAt: `${dateStr}T${startHourMin}:00`,
      symptom: symptom || notes || undefined,
      notes: notes || undefined
    };

    let data;
    try {
      const res = await apiClient.post('/public/appointments', payload, { skipAuth: true });
      data = res?.data;
    } catch (err) {
      throw toAppError(err, 'Không thể đặt lịch khám lúc này.');
    }
    if (!data?.id) {
      throw new Error('Máy chủ chưa xác nhận lịch hẹn. Vui lòng thử lại hoặc gọi tổng đài.');
    }

    const ticket = normalizeBackendAppointment({
      ...data,
      patientName: data.patientName || payload.fullName,
      patientPhone: phone,
      departmentName: data.departmentName || departmentName || '',
      doctorName: data.doctorName || (data.doctorId ? doctorName : '') || '',
      timeSlot,
      room: room || ''
    });
    rememberBooking(ticket);
    return ticket;
  },

  async bookAppointment(bookingData) {
    return this.createAppointment(bookingData);
  },

  /** Hủy lịch hẹn: PATCH /appointments/{id}/cancel. */
  async cancelAppointment(appointmentId, reason = 'Bệnh nhân yêu cầu hủy') {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/cancel`, null, { params: { reason } });
      updateRememberedStatus(appointmentId, 'CANCELLED');
      return res?.data ? normalizeBackendAppointment(res.data) : { id: appointmentId, status: 'CANCELLED' };
    } catch (err) {
      throw toAppError(err, 'Hủy lịch khám không thành công.');
    }
  },

  /** Xác nhận lịch hẹn: PATCH /appointments/{id}/confirm. */
  async confirmAppointment(appointmentId) {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/confirm`);
      updateRememberedStatus(appointmentId, 'CONFIRMED');
      return res?.data ? normalizeBackendAppointment(res.data) : null;
    } catch (err) {
      throw toAppError(err, 'Không xác nhận được lịch hẹn.');
    }
  },

  /** Khung giờ trống của bác sĩ theo ngày – null nếu không tải được (giao diện dùng lịch chuẩn). */
  async getAvailableSlots(doctorId, date) {
    try {
      const res = await apiClient.get('/appointments/available-slots', { params: { doctorId, date } });
      return res?.data ?? null;
    } catch {
      return null;
    }
  }
};

export default appointmentService;
