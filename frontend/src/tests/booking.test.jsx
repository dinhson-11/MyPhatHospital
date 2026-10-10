import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appointmentService } from '../services/appointmentService';

// Hermetic: không gọi backend thật (mô phỏng mất kết nối -> luồng offline dev/test)
vi.mock('../services/api', () => {
  const offline = () => Promise.reject(new Error('Network Error'));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: '' };
});

describe('Appointment Booking & Management Service Suite (Enterprise Grade)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should retrieve list of existing appointments including default sample', async () => {
    const list = await appointmentService.getAppointments();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].ticketCode).toMatch(/^HMS-2026-\d{4}$/);
  });

  it('should successfully book a new appointment and generate compliant ticket code', async () => {
    const newBookingData = {
      patientName: 'Lê Thu Hà',
      phoneNumber: '0933445566',
      departmentId: 1,
      departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
      doctorId: 1,
      doctorName: 'TS.BS Vi Mai Anh',
      appointmentDate: '2026-10-05',
      timeSlot: '09:00 - 09:30',
      notes: 'Kiểm tra tiền sử rối loạn nhịp tim'
    };

    const createdTicket = await appointmentService.createAppointment(newBookingData);

    expect(createdTicket).toBeDefined();
    expect(createdTicket.ticketCode).toMatch(/^HMS-2026-\d{4}$/);
    expect(createdTicket.patientName).toBe('Lê Thu Hà');
    expect(createdTicket.departmentName).toBe('Khoa Khám bệnh / Cấp cứu ban đầu');
    expect(createdTicket.doctorName).toBe('TS.BS Vi Mai Anh');
    expect(createdTicket.status).toBe('CONFIRMED');

    // Verify it is saved in the list
    const updatedList = await appointmentService.getAppointments();
    const found = updatedList.find(a => a.ticketCode === createdTicket.ticketCode);
    expect(found).toBeDefined();
    expect(found.patientName).toBe('Lê Thu Hà');
  });

  it('should successfully cancel an existing appointment', async () => {
    const newBookingData = {
      patientName: 'Nguyễn Văn Minh',
      phoneNumber: '0911223344',
      departmentId: 3,
      departmentName: 'Sản - Phụ khoa',
      appointmentDate: '2026-10-10',
      timeSlot: '10:00 - 10:30'
    };

    const created = await appointmentService.createAppointment(newBookingData);
    expect(created.status).toBe('CONFIRMED');

    const cancelled = await appointmentService.cancelAppointment(created.id);
    expect(cancelled.status).toBe('CANCELLED');

    // Confirm persisted list reflects cancellation
    const list = await appointmentService.getAppointments();
    const target = list.find(a => a.id === created.id);
    expect(target.status).toBe('CANCELLED');
  });

  it('should throw an error when attempting to cancel an invalid appointment ID', async () => {
    await expect(appointmentService.cancelAppointment('INVALID-ID-9999')).rejects.toThrow(
      'Không tìm thấy lịch hẹn'
    );
  });
});
