import apiClient from './api';

const RECEPTION_QUEUE_KEY = 'hms_reception_queue';

const DEFAULT_TODAY_QUEUE = [
  {
    id: 101,
    patientId: 1,
    patientCode: 'BN-260928-001',
    fullName: 'Trần Đức Minh',
    dob: '1988-05-14',
    phone: '0912345678',
    gender: 'MALE',
    departmentName: 'Khoa Nội tổng quát',
    doctorName: 'BSCKII. Nguyễn Văn Hùng',
    doctorId: 1,
    appointmentTime: '08:30 - 09:00',
    symptoms: 'Ho dai dẳng kèm tức ngực nhẹ khi vận động',
    status: 'CONFIRMED'
  },
  {
    id: 102,
    patientId: 2,
    patientCode: 'BN-260928-002',
    fullName: 'Lê Thị Thu Thủy',
    dob: '1992-11-20',
    phone: '0987654321',
    gender: 'FEMALE',
    departmentName: 'Khoa Tim mạch',
    doctorName: 'ThS. BS. Lê Minh Trí',
    doctorId: 2,
    appointmentTime: '09:00 - 09:30',
    symptoms: 'Hồi hộp, tim đập nhanh sau bữa ăn',
    status: 'BOOKED'
  },
  {
    id: 103,
    patientId: 3,
    patientCode: 'BN-260928-003',
    fullName: 'Nguyễn Văn Bình',
    dob: '1975-02-10',
    phone: '0933221100',
    gender: 'MALE',
    departmentName: 'Khoa Tiêu hóa',
    doctorName: 'BSCKI. Vũ Thị Hà',
    doctorId: 3,
    appointmentTime: '09:30 - 10:00',
    symptoms: 'Đau âm ỉ thượng vị, ợ hơi',
    status: 'CONFIRMED'
  }
];

const getLocalQueue = () => {
  const raw = localStorage.getItem(RECEPTION_QUEUE_KEY);
  if (!raw) {
    localStorage.setItem(RECEPTION_QUEUE_KEY, JSON.stringify(DEFAULT_TODAY_QUEUE));
    return [...DEFAULT_TODAY_QUEUE];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_TODAY_QUEUE];
  }
};

const saveLocalQueue = (list) => {
  localStorage.setItem(RECEPTION_QUEUE_KEY, JSON.stringify(list));
};

export const receptionService = {
  async getTodayQueue() {
    try {
      const res = await apiClient.get('/appointments');
      if (res && res.data) {
        const items = res.data.content || res.data;
        if (Array.isArray(items) && items.length > 0) {
          return items.map((a) => ({
            id: a.id,
            patientId: a.patientId || a.patient?.id || 1,
            patientCode: a.patientCode || a.patient?.patientCode || `BN-${a.id}`,
            fullName: a.patientName || a.patient?.fullName || 'Bệnh nhân',
            dob: a.patient?.dob || '1990-01-01',
            phone: a.patient?.phone || '0900000000',
            gender: a.patient?.gender || 'MALE',
            departmentName: a.departmentName || a.department?.name || 'Khoa Nội tổng quát',
            doctorName: a.doctorName || a.doctor?.user?.fullName || 'BS. Trực lâm sàng',
            doctorId: a.doctorId || a.doctor?.id || 1,
            appointmentTime: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '08:30',
            symptoms: a.symptomNotes || 'Đến khám theo hẹn',
            status: a.status || 'CONFIRMED'
          }));
        }
      }
    } catch {
      // offline fallback
    }
    return getLocalQueue();
  },

  async confirmAppointment(appointmentId) {
    try {
      const res = await apiClient.patch(`/appointments/${appointmentId}/confirm`);
      if (res && res.data) return { success: true };
    } catch {
      // offline fallback
    }
    const queue = getLocalQueue();
    const updated = queue.map((item) =>
      item.id === appointmentId ? { ...item, status: 'CONFIRMED' } : item
    );
    saveLocalQueue(updated);
    return { success: true };
  },

  async checkInPatient(appointmentOrId, assignedRoom) {
    let appointment = appointmentOrId;
    const queue = getLocalQueue();
    if (typeof appointmentOrId === 'number' || typeof appointmentOrId === 'string') {
      const found = queue.find((q) => q.id === Number(appointmentOrId));
      appointment = found || { id: Number(appointmentOrId), patientId: 1, doctorId: 1, symptoms: 'Tiếp nhận khám' };
    }
    try {
      const payload = {
        patientId: appointment.patientId || 1,
        doctorId: appointment.doctorId || 1,
        appointmentId: appointment.id,
        chiefComplaint: appointment.symptoms || 'Tiếp nhận tại quầy lễ tân'
      };
      const res = await apiClient.post('/visits', payload);
      if (res && res.data) {
        return { success: true, visitId: res.data?.id, status: 'CHECKED_IN', assignedRoom: assignedRoom || 'Phòng khám đa khoa' };
      }
    } catch {
      // offline fallback
    }
    const updated = queue.map((item) =>
      item.id === appointment.id ? { ...item, status: 'CHECKED_IN', assignedRoom: assignedRoom || 'Phòng khám Nội 1 - BS. Hùng' } : item
    );
    saveLocalQueue(updated);
    return { success: true, visitId: Date.now(), status: 'CHECKED_IN', assignedRoom: assignedRoom || 'Phòng khám Nội 1 - BS. Hùng' };
  },

  async quickRegisterPatient(patientData) {
    try {
      const res = await apiClient.post('/patients', patientData);
      if (res && res.data) {
        return { success: true, patient: res.data };
      }
    } catch {
      // offline fallback
    }
    const newCode = `BN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient = {
      id: Date.now(),
      patientCode: newCode,
      ...patientData
    };
    // Tự động đưa vào hàng đợi hôm nay
    const queue = getLocalQueue();
    queue.push({
      id: Date.now(),
      patientId: newPatient.id,
      patientCode: newPatient.patientCode,
      fullName: newPatient.fullName,
      patientName: newPatient.fullName,
      ticketNumber: `TN-${queue.length + 1}`,
      dob: newPatient.dob,
      phone: newPatient.phoneNumber || newPatient.phone,
      gender: newPatient.gender,
      departmentName: 'Khoa Tiếp Nhận Ban Đầu',
      doctorName: 'BS. Trực khám',
      doctorId: 1,
      appointmentTime: 'Ngay bây giờ',
      symptoms: 'Bệnh nhân mới đăng ký tại quầy',
      status: 'WAITING'
    });
    saveLocalQueue(queue);
    return { success: true, patient: newPatient };
  },

  async createPatientProfile(patientData) {
    const res = await this.quickRegisterPatient(patientData);
    return res.patient;
  },

  async getWaitingQueue() {
    const items = await this.getTodayQueue();
    return items.map((it, idx) => ({
      ...it,
      patientName: it.fullName || it.patientName,
      ticketNumber: it.ticketNumber || `TN-${idx + 1}`
    }));
  },

  async searchWaitingPatients(query) {
    const queue = await this.getWaitingQueue();
    if (!query) return queue;
    const lower = query.toLowerCase();
    return queue.filter(
      (q) =>
        (q.fullName && q.fullName.toLowerCase().includes(lower)) ||
        (q.patientName && q.patientName.toLowerCase().includes(lower)) ||
        (q.patientCode && q.patientCode.toLowerCase().includes(lower)) ||
        (q.phone && q.phone.includes(lower))
    );
  }
};
