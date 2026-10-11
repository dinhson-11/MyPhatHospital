import api from './api';
import { toAppError } from './apiError';

/**
 * Dịch vụ lịch trực & danh bạ nhân sự. Mọi dữ liệu lấy từ máy chủ: khi không tải/ghi được thì ném
 * AppError để giao diện báo lỗi (có nút "Thử lại"), KHÔNG dùng lịch trực mẫu lưu cục bộ.
 */

/** Nhãn ca trực tiếng Việt + khung giờ (dùng chung cho giao diện và thông báo lỗi). */
export const SHIFT_INFO = {
  MORNING: { label: 'Sáng', time: '07:30 – 11:30' },
  AFTERNOON: { label: 'Chiều', time: '13:30 – 17:00' },
  NIGHT: { label: 'Đêm', time: '17:00 – 07:30' },
  FULL_DAY: { label: 'Cả ngày', time: '07:30 – 17:00' }
};
export const SHIFT_ORDER = ['MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY'];
export const getShiftInfo = (shift) => SHIFT_INFO[shift] || SHIFT_INFO.FULL_DAY;

const listOf = (res) => (Array.isArray(res?.data) ? res.data : []);

export const scheduleService = {
  /** Danh bạ nhân sự y tế (GET /staff). */
  async getStaffList(departmentId) {
    try {
      const params = departmentId ? { departmentId } : {};
      return listOf(await api.get('/staff', { params }));
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách nhân viên y tế.');
    }
  },

  /** Tra cứu lịch trực theo tuần/tháng (GET /schedules). Danh sách rỗng là kết quả hợp lệ. */
  async getSchedules(params = {}) {
    try {
      return listOf(await api.get('/schedules', { params }));
    } catch (err) {
      throw toAppError(err, 'Không tải được lịch trực.');
    }
  },

  /** Xếp lịch trực mới (Admin). Trùng ca do máy chủ từ chối (409) và được báo nguyên văn. */
  async createSchedule(data) {
    try {
      const res = await api.post('/schedules', data);
      if (!res?.data) throw new Error('Máy chủ không trả về ca trực vừa tạo.');
      return res.data;
    } catch (err) {
      throw toAppError(err, 'Không xếp được lịch trực.');
    }
  },

  /** Xóa lịch trực (Admin). */
  async deleteSchedule(id) {
    try {
      await api.delete(`/schedules/${id}`);
      return true;
    } catch (err) {
      throw toAppError(err, 'Không xóa được ca trực.');
    }
  }
};

export default scheduleService;
