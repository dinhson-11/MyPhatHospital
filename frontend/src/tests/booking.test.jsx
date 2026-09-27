import { describe, it, expect, beforeEach } from 'vitest';
import { appointmentService } from '../services/appointmentService';

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
      departmentId: 5,
      departmentName: 'Khoa Tim mạch',
      doctorId: 1,
      doctorName: 'TS. BS. Nguyễn Văn Hùng',
      appointmentDate: '2026-10-05',
      timeSlot: '09:00 - 09:30',
      notes: 'Kiểm tra tiền sử rối loạn nhịp tim'
    };

    const createdTicket = await appointmentService.createAppointment(newBookingData);

    expect(createdTicket).toBeDefined();
    expect(createdTicket.ticketCode).toMatch(/^HMS-2026-\d{4}$/);
    expect(createdTicket.patientName).toBe('Lê Thu Hà');
    expect(createdTicket.departmentName).toBe('Khoa Tim mạch');
    expect(createdTicket.doctorName).toBe('TS. BS. Nguyễn Văn Hùng');
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
      departmentId: 4,
      departmentName: 'Khoa Nhi',
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
