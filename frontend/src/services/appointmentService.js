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

export const appointmentService = {
  async getAppointments() {
    try {
      const res = await apiClient.get('/appointments');
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return getStoredAppointments();
  },

  async getMyAppointments() {
    return this.getAppointments();
  },

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

    const code = `HMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment = {
      id: code,
      ticketCode: code,
      patientName,
      phoneNumber: phoneNumber || patientPhone,
      patientPhone: phoneNumber || patientPhone,
      patientEmail: patientEmail || '',
      departmentId,
      departmentName: departmentName || 'Khoa Nội tổng quát',
      doctorId: doctorId || null,
      doctorName: doctorName || 'Bác sĩ trực chuyên khoa',
      appointmentDate: appointmentDate || scheduledDate,
      scheduledDate: appointmentDate || scheduledDate,
      timeSlot: timeSlot || '08:30 - 09:00',
      notes: notes || symptom || 'Khám kiểm tra sức khỏe',
      symptom: notes || symptom || 'Khám kiểm tra sức khỏe',
      room: room || 'Phòng khám đa khoa (Tầng 1)',
      fee: fee || 300000,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    try {
      await apiClient.post('/appointments', newAppointment);
    } catch {
      // Fallback lưu local
    }

    const currentList = getStoredAppointments();
    currentList.unshift(newAppointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(currentList));

    return newAppointment;
  },

  async bookAppointment(bookingData) {
    return this.createAppointment(bookingData);
  },

  async cancelAppointment(appointmentId) {
    try {
      await apiClient.patch(`/appointments/${appointmentId}/cancel`);
    } catch {
      // Fallback
    }

    const currentList = getStoredAppointments();
    const index = currentList.findIndex(a => a.id === appointmentId || a.ticketCode === appointmentId);
    if (index !== -1) {
      currentList[index].status = 'CANCELLED';
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(currentList));
      return currentList[index];
    }
    throw new Error('Không tìm thấy lịch hẹn');
  }
};
