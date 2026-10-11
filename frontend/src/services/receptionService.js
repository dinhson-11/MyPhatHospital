import apiClient from './api';
import { toAppError } from './apiError';
import { patientService } from './patientService';
import { visitService } from './visitService';

/**
 * Dịch vụ quầy tiếp đón.
 *  - Hàng đợi = lịch hẹn thật (GET /appointments) + đánh dấu "đã vào phòng khám" nếu đã có ca khám
 *    gắn với lịch hẹn (GET /visits).
 *  - Xác nhận lịch, check-in (tạo ca khám), tạo/cập nhật hồ sơ: chỉ báo thành công khi máy chủ đã lưu.
 *  - Không còn hàng đợi mẫu hay hồ sơ/ca khám giả khi mất kết nối.
 */

const pad = (n) => String(n).padStart(2, '0');
const localDateOf = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeOf = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const pageContent = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

function toQueueItem(a, visitByAppointment) {
  const visit = visitByAppointment.get(a.id);
  return {
    id: a.id,
    patientId: a.patientId ?? null,
    patientCode: a.patientCode || '',
    fullName: a.patientName || '',
    patientName: a.patientName || '',
    departmentName: a.departmentName || '',
    doctorName: a.doctorName || '',
    doctorId: a.doctorId ?? null,
    scheduledAt: a.scheduledAt || null,
    date: localDateOf(a.scheduledAt),
    appointmentTime: timeOf(a.scheduledAt),
    symptoms: a.symptom || a.notes || '',
    appointmentStatus: a.status,
    // Trạng thái hàng đợi: CHECKED_IN khi đã có ca khám gắn với lịch hẹn
    status: visit ? 'CHECKED_IN' : a.status,
    visitId: visit?.id ?? null
  };
}

export const receptionService = {
  /**
   * Danh sách lịch hẹn cho quầy tiếp đón.
   * @param {{ date?: string }} options date dạng yyyy-MM-dd để lọc theo ngày (giờ địa phương)
   */
  async getTodayQueue({ date } = {}) {
    let appointments;
    try {
      const res = await apiClient.get('/appointments', { params: { size: 200, sort: 'scheduledAt,asc' } });
      appointments = pageContent(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách lịch hẹn.');
    }

    // Trạng thái check-in lấy từ ca khám thật; nếu không tải được thì vẫn hiển thị lịch hẹn.
    const visitByAppointment = new Map();
    try {
      const visits = await visitService.getVisits({ size: 200 });
      visits.forEach((v) => { if (v.appointmentId) visitByAppointment.set(v.appointmentId, v); });
    } catch {
      // bỏ qua – chỉ mất thông tin "đã vào phòng khám"
    }

    const items = appointments.map((a) => toQueueItem(a, visitByAppointment));
    const filtered = date ? items.filter((i) => i.date === date) : items;
    return filtered.sort((x, y) => String(x.scheduledAt || '').localeCompare(String(y.scheduledAt || '')));
  },

  /** Lễ tân xác nhận lịch BOOKED → CONFIRMED. */
  async confirmAppointment(appointmentId) {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/confirm`);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không xác nhận được lịch hẹn.');
    }
  },

  /** Lễ tân hủy lịch BOOKED/CONFIRMED kèm lý do (PATCH /appointments/{id}/cancel). */
  async cancelAppointment(appointmentId, reason) {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/cancel`, null, { params: { reason } });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không hủy được lịch hẹn.');
    }
  },

  /** Đánh dấu bệnh nhân không đến (PATCH /appointments/{id}/status → NO_SHOW). */
  async markNoShow(appointmentId) {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/status`, { status: 'NO_SHOW' });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không cập nhật được trạng thái lịch hẹn.');
    }
  },

  /**
   * Check-in: tạo ca khám từ lịch hẹn đã xác nhận.
   * Bắt buộc lịch hẹn có bệnh nhân và bác sĩ phụ trách thật (không gán mặc định).
   */
  async checkInPatient(appointment) {
    if (!appointment || typeof appointment !== 'object') {
      throw new Error('Thiếu thông tin lịch hẹn để check-in.');
    }
    if (!appointment.patientId) {
      throw new Error('Lịch hẹn chưa gắn với hồ sơ bệnh nhân – vui lòng kiểm tra lại hồ sơ.');
    }
    if (!appointment.doctorId) {
      throw new Error('Lịch hẹn chưa có bác sĩ phụ trách – vui lòng phân công bác sĩ trước khi check-in.');
    }
    const visit = await visitService.createVisit({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      chiefComplaint: appointment.symptoms || undefined
    });
    return { visitId: visit?.id ?? null, visit, status: 'CHECKED_IN' };
  },

  /** Tạo hồ sơ bệnh nhân tại quầy (kèm thẻ BHYT nếu có). */
  async quickRegisterPatient(patientData) {
    const patient = await patientService.createPatient(patientData);
    return { success: true, patient };
  },

  async createPatientProfile(patientData) {
    return patientService.createPatient(patientData);
  },

  async updatePatientProfile(patientId, patientData) {
    return patientService.updatePatient(patientId, patientData);
  },

  async searchPatients(keyword) {
    return patientService.searchPatients(keyword);
  },

  async getWaitingQueue(options) {
    const items = await this.getTodayQueue(options);
    return items.map((it, idx) => ({ ...it, ticketNumber: `STT-${idx + 1}` }));
  },

  async searchWaitingPatients(query, options) {
    const queue = await this.getWaitingQueue(options);
    if (!query) return queue;
    const lower = query.toLowerCase();
    return queue.filter((q) =>
      (q.fullName || '').toLowerCase().includes(lower)
      || (q.patientCode || '').toLowerCase().includes(lower));
  }
};

export default receptionService;
