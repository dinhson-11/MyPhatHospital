import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import {
  appointmentService,
  canCancelAppointment,
  normalizeBackendAppointment,
  ticketCodeOf
} from '../services/appointmentService';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const bookingData = {
  patientName: 'Lê Thu Hà',
  phoneNumber: '0933 445 566',
  departmentId: 1,
  departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
  doctorId: 1,
  doctorName: 'TS.BS Vi Mai Anh',
  appointmentDate: '2026-10-05',
  timeSlot: '09:00 - 09:30',
  notes: 'Kiểm tra tiền sử rối loạn nhịp tim'
};

// Phản hồi của máy chủ khi đặt lịch thành công
const serverAppointment = {
  id: 42,
  patientId: 9,
  patientName: 'Lê Thu Hà',
  doctorId: 1,
  doctorName: 'TS.BS Vi Mai Anh',
  departmentId: 1,
  departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
  scheduledAt: '2026-10-05T09:00:00',
  status: 'BOOKED',
  createdAt: '2026-10-01T08:00:00'
};

describe('Appointment Booking & Management Service Suite (API thật, không còn dữ liệu mẫu)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getAppointments', () => {
    it('lấy danh sách lịch hẹn từ máy chủ và chuẩn hóa, mã phiếu ổn định theo ID', async () => {
      api.get.mockReturnValue(ok({ content: [serverAppointment], totalElements: 1 }));
      const list = await appointmentService.getAppointments();

      expect(api.get).toHaveBeenCalledWith('/appointments', { params: { size: 100 } });
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: 42,
        ticketCode: 'HMS-2026-0042',
        patientName: 'Lê Thu Hà',
        appointmentDate: '2026-10-05',
        timeSlot: '09:00 - 09:30',
        status: 'BOOKED'
      });
      expect(list[0].ticketCode).toMatch(/^HMS-\d{4}-\d{4}$/);
    });

    it('máy chủ chưa có lịch hẹn nào → danh sách rỗng (không bịa lịch mẫu)', async () => {
      api.get.mockReturnValue(ok({ content: [], totalElements: 0 }));
      expect(await appointmentService.getAppointments()).toEqual([]);
      expect(localStorage.length).toBe(0);
    });

    it('mất mạng → ném lỗi, KHÔNG trả lịch hẹn mẫu', async () => {
      api.get.mockImplementation(networkError);
      await expect(appointmentService.getAppointments()).rejects.toThrow(/Không kết nối được máy chủ/);
    });

    it('getMyAppointments: tài khoản nhân viên (403) chuyển sang danh sách chung, lỗi khác được ném ra', async () => {
      api.get.mockImplementation((url) =>
        (url === '/appointments/me'
          ? backendError(403, 'Forbidden')
          : ok({ content: [serverAppointment] })));
      const list = await appointmentService.getMyAppointments();
      expect(list.map((a) => a.id)).toEqual([42]);

      api.get.mockImplementation(networkError);
      await expect(appointmentService.getMyAppointments()).rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('createAppointment', () => {
    it('đặt lịch gửi đúng dữ liệu lên API công khai và trả phiếu khám từ dữ liệu máy chủ', async () => {
      api.post.mockReturnValue(ok(serverAppointment));
      const ticket = await appointmentService.createAppointment(bookingData);

      expect(api.post).toHaveBeenCalledWith('/public/appointments', {
        fullName: 'Lê Thu Hà',
        phone: '0933445566',
        departmentId: 1,
        doctorId: 1,
        scheduledAt: '2026-10-05T09:00:00',
        symptom: 'Kiểm tra tiền sử rối loạn nhịp tim',
        notes: 'Kiểm tra tiền sử rối loạn nhịp tim'
      }, { skipAuth: true });

      expect(ticket.id).toBe(42);
      expect(ticket.ticketCode).toBe('HMS-2026-0042');
      expect(ticket.patientName).toBe('Lê Thu Hà');
      expect(ticket.departmentName).toBe('Khoa Khám bệnh / Cấp cứu ban đầu');
      expect(ticket.doctorName).toBe('TS.BS Vi Mai Anh');
      expect(ticket.patientPhone).toBe('0933445566');
      // Trạng thái do máy chủ quyết định, không tự gán CONFIRMED
      expect(ticket.status).toBe('BOOKED');
    });

    it('chỉ lưu đệm trên thiết bị phiếu mà máy chủ đã cấp ID', async () => {
      api.post.mockReturnValue(ok(serverAppointment));
      const ticket = await appointmentService.createAppointment(bookingData);

      const saved = appointmentService.getDeviceBookings();
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(ticket.id);
      expect(saved[0].ticketCode).toBe(ticket.ticketCode);
    });

    it('mất mạng khi đặt lịch → ném lỗi, KHÔNG phát hành phiếu offline', async () => {
      api.post.mockImplementation(networkError);
      await expect(appointmentService.createAppointment(bookingData)).rejects.toThrow(/Không kết nối được máy chủ/);
      expect(appointmentService.getDeviceBookings()).toEqual([]);
      expect(localStorage.getItem('hms_appointments')).toBeNull();
    });

    it('lỗi nghiệp vụ (khung giờ đã đầy) được chuyển nguyên văn và không lưu phiếu', async () => {
      api.post.mockImplementation(() => backendError(409, 'Khung giờ này đã có người đặt'));
      await expect(appointmentService.createAppointment(bookingData)).rejects.toThrow('Khung giờ này đã có người đặt');
      expect(appointmentService.getDeviceBookings()).toEqual([]);
    });

    it('máy chủ trả phản hồi không có ID → coi là chưa ghi nhận, không phát phiếu', async () => {
      api.post.mockReturnValue(ok(null));
      await expect(appointmentService.createAppointment(bookingData)).rejects.toThrow(/Máy chủ chưa xác nhận lịch hẹn/);
      expect(appointmentService.getDeviceBookings()).toEqual([]);
    });

    it('thiếu ngày hoặc khung giờ hợp lệ → từ chối ngay, không gọi máy chủ', async () => {
      await expect(appointmentService.createAppointment({ ...bookingData, appointmentDate: '' }))
        .rejects.toThrow(/chọn ngày và khung giờ/);
      await expect(appointmentService.createAppointment({ ...bookingData, timeSlot: 'Cả ngày' }))
        .rejects.toThrow(/chọn ngày và khung giờ/);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('bỏ qua phiếu cũ trong bộ nhớ thiết bị nếu là dữ liệu offline / ID không phải số', () => {
      localStorage.setItem('hms_appointments', JSON.stringify([
        { id: 'HMS-OLD-1', ticketCode: 'HMS-2026-0001', offline: true },
        { id: 5, offline: true },
        { id: 7, ticketCode: 'HMS-2026-0007' }
      ]));
      expect(appointmentService.getDeviceBookings().map((a) => a.id)).toEqual([7]);
    });
  });

  describe('cancelAppointment', () => {
    it('hủy lịch gọi PATCH cancel kèm lý do, trả trạng thái từ máy chủ và cập nhật phiếu đã lưu', async () => {
      api.post.mockReturnValue(ok(serverAppointment));
      const created = await appointmentService.createAppointment(bookingData);

      api.patch.mockReturnValue(ok({ ...serverAppointment, status: 'CANCELLED' }));
      const cancelled = await appointmentService.cancelAppointment(created.id, 'Bận việc đột xuất');

      expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', null, { params: { reason: 'Bận việc đột xuất' } });
      expect(cancelled.status).toBe('CANCELLED');
      expect(appointmentService.getDeviceBookings()[0].status).toBe('CANCELLED');
    });

    it('lý do mặc định khi người dùng không nhập', async () => {
      api.patch.mockReturnValue(ok({ ...serverAppointment, status: 'CANCELLED' }));
      await appointmentService.cancelAppointment(42);
      expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', null, { params: { reason: 'Bệnh nhân yêu cầu hủy' } });
    });

    it('mất mạng khi hủy → ném lỗi và KHÔNG đánh dấu hủy cục bộ', async () => {
      api.post.mockReturnValue(ok(serverAppointment));
      await appointmentService.createAppointment(bookingData);

      api.patch.mockImplementation(networkError);
      await expect(appointmentService.cancelAppointment(42)).rejects.toThrow(/Không kết nối được máy chủ/);
      expect(appointmentService.getDeviceBookings()[0].status).toBe('BOOKED');
    });

    it('ID không tồn tại → thông điệp lỗi của máy chủ được chuyển nguyên văn', async () => {
      api.patch.mockImplementation(() => backendError(404, 'Không tìm thấy lịch hẹn', 'NOT_FOUND'));
      await expect(appointmentService.cancelAppointment('INVALID-ID-9999')).rejects.toThrow('Không tìm thấy lịch hẹn');
    });

    it('lịch đã khám xong không hủy được: lỗi nghiệp vụ được ném ra', async () => {
      api.patch.mockImplementation(() => backendError(400, 'Chỉ có thể hủy lịch hẹn chưa khám'));
      await expect(appointmentService.cancelAppointment(42)).rejects.toThrow(/Chỉ có thể hủy/);
    });
  });

  describe('confirmAppointment', () => {
    it('xác nhận lịch gọi PATCH confirm và trả dữ liệu đã chuẩn hóa', async () => {
      api.patch.mockReturnValue(ok({ ...serverAppointment, status: 'CONFIRMED' }));
      const res = await appointmentService.confirmAppointment(42);
      expect(api.patch).toHaveBeenCalledWith('/appointments/42/confirm');
      expect(res.status).toBe('CONFIRMED');
    });

    it('mất mạng → ném lỗi, không trả kết quả thành công', async () => {
      api.patch.mockImplementation(networkError);
      await expect(appointmentService.confirmAppointment(42)).rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('getAvailableSlots', () => {
    it('trả khung giờ trống từ máy chủ, null khi không tải được (giao diện dùng lịch chuẩn)', async () => {
      api.get.mockReturnValue(ok(['09:00', '09:30']));
      expect(await appointmentService.getAvailableSlots(1, '2026-10-05')).toEqual(['09:00', '09:30']);
      expect(api.get).toHaveBeenCalledWith('/appointments/available-slots', { params: { doctorId: 1, date: '2026-10-05' } });

      api.get.mockImplementation(networkError);
      expect(await appointmentService.getAvailableSlots(1, '2026-10-05')).toBeNull();
    });
  });
});

describe('Quy tắc lịch hẹn (hàm thuần)', () => {
  it('ticketCodeOf: rỗng nếu chưa có ID, đệm 4 chữ số theo ID máy chủ', () => {
    expect(ticketCodeOf({})).toBe('');
    expect(ticketCodeOf({ id: 7, createdAt: '2026-03-01T00:00:00' })).toBe('HMS-2026-0007');
  });

  it('normalizeBackendAppointment: suy ra ngày/khung giờ từ scheduledAt, không bịa phòng hoặc bác sĩ', () => {
    const n = normalizeBackendAppointment({ id: 3, scheduledAt: '2026-10-05T14:00:00', patientName: 'A' });
    expect(n.appointmentDate).toBe('2026-10-05');
    expect(n.timeSlot).toBe('14:00 - 14:30');
    expect(n.status).toBe('BOOKED');
    expect(n.doctorName).toBe('');
    expect(n.room).toBe('');
  });

  it('canCancelAppointment: chỉ BOOKED/CONFIRMED và trước giờ hẹn', () => {
    const now = new Date('2026-10-05T08:00:00');
    expect(canCancelAppointment({ status: 'BOOKED', scheduledAt: '2026-10-05T09:00:00' }, now)).toBe(true);
    expect(canCancelAppointment({ status: 'CONFIRMED', scheduledAt: '2026-10-05T09:00:00' }, now)).toBe(true);
    expect(canCancelAppointment({ status: 'BOOKED', scheduledAt: '2026-10-05T07:00:00' }, now)).toBe(false);
    expect(canCancelAppointment({ status: 'COMPLETED', scheduledAt: '2026-10-05T09:00:00' }, now)).toBe(false);
    expect(canCancelAppointment({ status: 'CANCELLED', scheduledAt: '2026-10-05T09:00:00' }, now)).toBe(false);
    expect(canCancelAppointment(null, now)).toBe(false);
  });
});
