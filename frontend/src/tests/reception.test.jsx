import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import { receptionService } from '../services/receptionService';
import { ReceptionDashboardModal } from '../components/reception/ReceptionDashboardModal';
import { ToastProvider } from '../context/ToastContext';
import { todayISO } from '../utils/format';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const today = todayISO();

const appointments = [
  {
    id: 101, patientId: 1, patientCode: 'BN-261010-001', patientName: 'Nguyễn Văn An',
    doctorId: 7, doctorName: 'BS. Hùng', departmentName: 'Nội tổng quát',
    scheduledAt: `${today}T08:30:00`, status: 'CONFIRMED', symptom: 'Đau đầu'
  },
  {
    id: 102, patientId: 2, patientCode: 'BN-261010-002', patientName: 'Trần Thị Bình',
    doctorId: 7, doctorName: 'BS. Hùng', departmentName: 'Nội tổng quát',
    scheduledAt: `${today}T09:00:00`, status: 'BOOKED', symptom: 'Ho kéo dài'
  },
  {
    id: 103, patientId: 3, patientCode: 'BN-261010-003', patientName: 'Lê Văn Cường',
    doctorId: 8, doctorName: 'BS. Mai', departmentName: 'Tim mạch',
    scheduledAt: `${today}T07:30:00`, status: 'CONFIRMED', symptom: 'Tức ngực'
  },
  {
    id: 104, patientId: 4, patientCode: 'BN-261001-004', patientName: 'Phạm Thị Dung',
    doctorId: 8, doctorName: 'BS. Mai', departmentName: 'Tim mạch',
    scheduledAt: '2020-01-01T10:00:00', status: 'COMPLETED', symptom: ''
  }
];

// Ca khám đã tạo cho lịch hẹn 103 => hàng đợi hiển thị "Đã vào phòng khám"
const visits = [{ id: 900, appointmentId: 103, patientId: 3, doctorId: 8, status: 'IN_PROGRESS' }];

function routeGet({ appts = appointments, visitList = visits, overrides = {} } = {}) {
  api.get.mockImplementation((url, config) => {
    if (overrides[url]) return overrides[url](config);
    if (url === '/appointments') return ok({ content: appts, totalElements: appts.length });
    if (url === '/visits') return ok({ content: visitList, totalElements: visitList.length });
    return networkError();
  });
}

describe('receptionService – hàng đợi lịch hẹn thật', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('lấy hàng đợi từ API, lọc theo ngày, sắp xếp theo giờ hẹn và đánh số thứ tự', async () => {
    routeGet();
    const queue = await receptionService.getWaitingQueue({ date: today });

    expect(api.get).toHaveBeenCalledWith('/appointments', { params: { size: 200, sort: 'scheduledAt,asc' } });
    // 104 bị loại vì khác ngày; còn lại sắp xếp tăng dần theo giờ
    expect(queue.map((q) => q.id)).toEqual([103, 101, 102]);
    expect(queue.map((q) => q.ticketNumber)).toEqual(['STT-1', 'STT-2', 'STT-3']);
    expect(queue[1]).toMatchObject({
      patientName: 'Nguyễn Văn An', fullName: 'Nguyễn Văn An', patientCode: 'BN-261010-001',
      appointmentTime: '08:30', date: today, symptoms: 'Đau đầu', status: 'CONFIRMED', visitId: null
    });
  });

  it('lịch hẹn đã có ca khám gắn kèm được đánh dấu CHECKED_IN kèm mã ca khám', async () => {
    routeGet();
    const queue = await receptionService.getTodayQueue({ date: today });
    const checkedIn = queue.find((q) => q.id === 103);
    expect(checkedIn.status).toBe('CHECKED_IN');
    expect(checkedIn.appointmentStatus).toBe('CONFIRMED');
    expect(checkedIn.visitId).toBe(900);
    expect(queue.find((q) => q.id === 101).status).toBe('CONFIRMED');
  });

  it('không tải được ca khám vẫn hiển thị lịch hẹn (chỉ mất thông tin check-in)', async () => {
    routeGet({ overrides: { '/visits': networkError } });
    const queue = await receptionService.getTodayQueue({ date: today });
    expect(queue).toHaveLength(3);
    expect(queue.every((q) => q.visitId === null)).toBe(true);
  });

  it('mất mạng khi tải lịch hẹn → báo lỗi, KHÔNG trả hàng đợi mẫu', async () => {
    routeGet({ overrides: { '/appointments': networkError } });
    await expect(receptionService.getWaitingQueue()).rejects.toThrow(/Không kết nối được máy chủ/);
    await expect(receptionService.getTodayQueue()).rejects.toMatchObject({ isNetworkError: true });
    expect(localStorage.length).toBe(0);
  });

  it('tìm bệnh nhân trong hàng đợi theo tên hoặc mã hồ sơ (không phân biệt hoa thường)', async () => {
    routeGet();
    const byName = await receptionService.searchWaitingPatients('trần thị', { date: today });
    expect(byName.map((q) => q.id)).toEqual([102]);

    const byCode = await receptionService.searchWaitingPatients('bn-261010-003', { date: today });
    expect(byCode.map((q) => q.id)).toEqual([103]);

    const none = await receptionService.searchWaitingPatients('không tồn tại', { date: today });
    expect(none).toEqual([]);

    const all = await receptionService.searchWaitingPatients('', { date: today });
    expect(all).toHaveLength(3);
  });

  it('xác nhận lịch hẹn gọi PATCH /appointments/{id}/confirm và trả dữ liệu máy chủ', async () => {
    api.patch.mockReturnValue(ok({ id: 102, status: 'CONFIRMED' }));
    const res = await receptionService.confirmAppointment(102);
    expect(api.patch).toHaveBeenCalledWith('/appointments/102/confirm');
    expect(res).toEqual({ id: 102, status: 'CONFIRMED' });
  });

  it('xác nhận lịch hẹn thất bại (mạng / nghiệp vụ) → ném lỗi, không báo thành công', async () => {
    api.patch.mockImplementation(networkError);
    await expect(receptionService.confirmAppointment(102)).rejects.toThrow(/Không kết nối được máy chủ/);

    api.patch.mockImplementation(() => backendError(400, 'Lịch hẹn đã bị hủy, không thể xác nhận'));
    await expect(receptionService.confirmAppointment(102)).rejects.toThrow(/không thể xác nhận/);
  });

  describe('check-in', () => {
    const appointment = { id: 101, patientId: 1, doctorId: 7, symptoms: 'Đau đầu' };

    it('tạo ca khám từ lịch hẹn qua POST /visits và trả CHECKED_IN kèm visitId', async () => {
      api.post.mockReturnValue(ok({ id: 901, status: 'IN_PROGRESS' }));
      const res = await receptionService.checkInPatient(appointment);
      expect(api.post).toHaveBeenCalledWith('/visits', {
        patientId: 1, doctorId: 7, appointmentId: 101, chiefComplaint: 'Đau đầu'
      });
      expect(res).toMatchObject({ status: 'CHECKED_IN', visitId: 901 });
    });

    it('thiếu hồ sơ bệnh nhân hoặc bác sĩ → từ chối và KHÔNG gọi máy chủ', async () => {
      await expect(receptionService.checkInPatient({ id: 1, doctorId: 7 })).rejects.toThrow(/chưa gắn với hồ sơ bệnh nhân/);
      await expect(receptionService.checkInPatient({ id: 1, patientId: 1 })).rejects.toThrow(/chưa có bác sĩ phụ trách/);
      await expect(receptionService.checkInPatient(101)).rejects.toThrow(/Thiếu thông tin lịch hẹn/);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('mất mạng khi check-in → báo lỗi, không trả CHECKED_IN', async () => {
      api.post.mockImplementation(networkError);
      await expect(receptionService.checkInPatient(appointment)).rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('hồ sơ bệnh nhân', () => {
    const newPatientData = {
      fullName: ' Trần Thị Mỹ Duyên ', phone: '0988 776 655', dob: '1995-08-20', gender: 'FEMALE',
      nationalId: '001195000123', address: 'Huyện Lục Ngạn, Bắc Giang', bloodType: 'B+',
      insuranceNumber: 'dn4 010123456789', insuranceValidFrom: '', insuranceValidTo: ''
    };

    it('tạo hồ sơ gửi dữ liệu đã chuẩn hóa lên máy chủ và trả mã hồ sơ do máy chủ cấp', async () => {
      api.post.mockReturnValue(ok({ id: 55, patientCode: 'BN-261010-055', fullName: 'Trần Thị Mỹ Duyên', bloodType: 'B+' }));
      const result = await receptionService.createPatientProfile(newPatientData);

      expect(api.post).toHaveBeenCalledWith('/patients', expect.objectContaining({
        fullName: 'Trần Thị Mỹ Duyên',
        phone: '0988776655',
        insuranceNumber: 'DN4010123456789',
        insuranceValidFrom: null,
        insuranceValidTo: null,
        bloodType: 'B+'
      }));
      expect(result.patientCode).toBe('BN-261010-055');
      expect(result.bloodType).toBe('B+');
    });

    it('quickRegisterPatient trả success chỉ khi máy chủ đã lưu', async () => {
      api.post.mockReturnValue(ok({ id: 56, patientCode: 'BN-261010-056', fullName: 'A' }));
      const res = await receptionService.quickRegisterPatient(newPatientData);
      expect(res.success).toBe(true);
      expect(res.patient.id).toBe(56);
    });

    it('mất mạng khi tạo hồ sơ → ném lỗi, không báo đã tạo', async () => {
      api.post.mockImplementation(networkError);
      await expect(receptionService.createPatientProfile(newPatientData)).rejects.toThrow(/Không kết nối được máy chủ/);
      await expect(receptionService.quickRegisterPatient(newPatientData)).rejects.toThrow(/CHƯA được lưu/);
    });

    it('lỗi nghiệp vụ (trùng CCCD) được chuyển nguyên văn', async () => {
      api.post.mockImplementation(() => backendError(409, 'Số CCCD đã tồn tại trong hệ thống'));
      await expect(receptionService.createPatientProfile(newPatientData)).rejects.toThrow('Số CCCD đã tồn tại trong hệ thống');
    });

    it('cập nhật hồ sơ gọi PUT /patients/{id}', async () => {
      api.put.mockReturnValue(ok({ id: 55, fullName: 'Trần Thị Mỹ Duyên' }));
      await receptionService.updatePatientProfile(55, newPatientData);
      expect(api.put).toHaveBeenCalledWith('/patients/55', expect.objectContaining({ phone: '0988776655' }));
    });

    it('tìm hồ sơ gọi GET /patients với từ khóa đã cắt khoảng trắng', async () => {
      api.get.mockReturnValue(ok({ content: [{ id: 1, fullName: 'Nguyễn Văn An' }] }));
      const res = await receptionService.searchPatients('  An ');
      expect(api.get).toHaveBeenCalledWith('/patients', { params: { size: 20, keyword: 'An' } });
      expect(res).toHaveLength(1);
    });
  });
});

describe('ReceptionDashboardModal – giao diện quầy tiếp đón', () => {
  const renderModal = () => render(
    <ToastProvider>
      <ReceptionDashboardModal isOpen onClose={() => {}} />
    </ToastProvider>
  );

  let confirmSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Không có ConfirmProvider trong test → useConfirm dùng window.confirm
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('hiển thị tiêu đề và hàng đợi lịch hẹn lấy từ máy chủ', async () => {
    routeGet();
    renderModal();

    expect(screen.getByText('Quầy tiếp đón')).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
    // Lịch hẹn khác ngày không hiển thị
    expect(screen.queryByText('Phạm Thị Dung')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Hàng đợi tiếp nhận \(3\)/ })).toBeInTheDocument();
  });

  it('chuyển sang tab hồ sơ bệnh nhân hiển thị biểu mẫu tạo hồ sơ', async () => {
    routeGet();
    renderModal();
    await screen.findByText('Nguyễn Văn An');

    fireEvent.click(screen.getByRole('tab', { name: /Hồ sơ bệnh nhân/ }));

    expect(screen.getByText('Tạo hồ sơ bệnh nhân mới')).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo hồ sơ bệnh nhân/ })).toBeInTheDocument();
  });

  it('check-in từ giao diện: tạo ca khám qua API rồi tải lại hàng đợi', async () => {
    routeGet();
    api.post.mockImplementation(() => ok({ id: 901, status: 'IN_PROGRESS' }));
    renderModal();
    await screen.findByText('Nguyễn Văn An');

    // Chỉ lịch CONFIRMED chưa có ca khám mới có nút Check-in (103 đã vào phòng khám, 102 chưa xác nhận)
    expect(screen.getAllByRole('button', { name: /^Check-in / })).toHaveLength(1);
    expect(screen.getByText('Ca khám #900')).toBeInTheDocument();
    expect(screen.getAllByText('Đã vào phòng khám').length).toBeGreaterThan(0);

    // Sau check-in, máy chủ trả thêm ca khám gắn với lịch hẹn 101
    routeGet({ visitList: [...visits, { id: 901, appointmentId: 101, patientId: 1, doctorId: 7 }] });
    fireEvent.click(screen.getByRole('button', { name: 'Check-in Nguyễn Văn An' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/visits', {
      patientId: 1, doctorId: 7, appointmentId: 101, chiefComplaint: 'Đau đầu'
    }));
    expect(await screen.findByText(/Đã check-in Nguyễn Văn An – ca khám #901/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ca khám #901')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /^Check-in / })).not.toBeInTheDocument();
  });

  it('người dùng từ chối hộp thoại check-in → không gọi máy chủ', async () => {
    routeGet();
    confirmSpy.mockReturnValue(false);
    renderModal();
    await screen.findByText('Nguyễn Văn An');

    fireEvent.click(screen.getByRole('button', { name: 'Check-in Nguyễn Văn An' }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('lỗi mạng khi check-in → hiện thông báo lỗi, KHÔNG báo đã check-in', async () => {
    routeGet();
    api.post.mockImplementation(networkError);
    renderModal();
    await screen.findByText('Nguyễn Văn An');

    fireEvent.click(screen.getByRole('button', { name: 'Check-in Nguyễn Văn An' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(screen.queryByText(/Đã check-in/)).not.toBeInTheDocument();
    // Lịch hẹn 101 vẫn chờ check-in
    expect(screen.getByRole('button', { name: 'Check-in Nguyễn Văn An' })).toBeInTheDocument();
  });

  it('xác nhận lịch hẹn BOOKED từ giao diện gọi API xác nhận', async () => {
    routeGet();
    api.patch.mockImplementation(() => ok({ id: 102, status: 'CONFIRMED' }));
    renderModal();
    await screen.findByText('Trần Thị Bình');

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/appointments/102/confirm'));
    expect(await screen.findByText(/Đã xác nhận lịch hẹn của Trần Thị Bình/)).toBeInTheDocument();
  });

  it('hủy lịch hẹn: nhập lý do rồi gọi PATCH /appointments/{id}/cancel kèm lý do', async () => {
    routeGet();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Bệnh nhân gọi báo bận');
    api.patch.mockImplementation(() => ok({ id: 102, status: 'CANCELLED' }));
    renderModal();
    await screen.findByText('Trần Thị Bình');

    fireEvent.click(screen.getByRole('button', { name: 'Hủy lịch hẹn của Trần Thị Bình' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      '/appointments/102/cancel', null, { params: { reason: 'Bệnh nhân gọi báo bận' } }
    ));
    expect(await screen.findByText(/Đã hủy lịch hẹn của Trần Thị Bình/)).toBeInTheDocument();
    promptSpy.mockRestore();
  });

  it('hủy lịch hẹn mà không nhập lý do → không gọi máy chủ', async () => {
    routeGet();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    renderModal();
    await screen.findByText('Trần Thị Bình');

    fireEvent.click(screen.getByRole('button', { name: 'Hủy lịch hẹn của Trần Thị Bình' }));
    await waitFor(() => expect(promptSpy).toHaveBeenCalled());
    expect(api.patch).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('ghi nhận vắng mặt (sau giờ hẹn): PATCH /appointments/{id}/status với NO_SHOW', async () => {
    routeGet();
    api.patch.mockImplementation(() => ok({ id: 102, status: 'NO_SHOW' }));
    // Chỉ giả lập đồng hồ (Date) = 23:00 hôm nay để lịch hẹn 09:00 đã quá giờ, không phụ thuộc giờ chạy test
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${today}T23:00:00`));
    try {
      renderModal();
      await screen.findByText('Trần Thị Bình');

      fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận Trần Thị Bình không đến' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/appointments/102/status', { status: 'NO_SHOW' }));
      expect(await screen.findByText(/Đã ghi nhận Trần Thị Bình không đến khám/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('trước giờ hẹn: nút Vắng mặt bị khóa (máy chủ chỉ cho ghi nhận sau giờ hẹn)', async () => {
    routeGet();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${today}T00:01:00`));
    try {
      renderModal();
      await screen.findByText('Trần Thị Bình');
      expect(screen.getByRole('button', { name: 'Ghi nhận Trần Thị Bình không đến' })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lịch hẹn thiếu bác sĩ → nút Check-in bị khóa và nêu rõ lý do', async () => {
    routeGet({ appts: [{ ...appointments[0], doctorId: null, doctorName: '' }], visitList: [] });
    renderModal();
    await screen.findByText('Nguyễn Văn An');

    expect(screen.getByRole('button', { name: 'Check-in Nguyễn Văn An' })).toBeDisabled();
    expect(screen.getByText('Chưa phân công bác sĩ', { selector: 'span.text-xs' })).toBeInTheDocument();
  });

  it('không tải được hàng đợi → hiển thị lỗi và nút Thử lại thay vì dữ liệu giả', async () => {
    routeGet({ overrides: { '/appointments': networkError } });
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();

    // Thử lại thành công khi máy chủ hoạt động trở lại
    routeGet();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
  });

  it('tạo hồ sơ mới từ giao diện: lưu qua API và báo mã hồ sơ do máy chủ cấp', async () => {
    routeGet();
    api.post.mockImplementation(() => ok({ id: 77, patientCode: 'BN-261010-077', fullName: 'Hoàng Văn Em' }));
    renderModal();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('tab', { name: /Hồ sơ bệnh nhân/ }));

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Hoàng Văn Em' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '0912345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ bệnh nhân/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/patients', expect.objectContaining({
      fullName: 'Hoàng Văn Em', phone: '0912345678'
    })));
    expect(await screen.findByText(/Đã tạo hồ sơ BN-261010-077 – Hoàng Văn Em/)).toBeInTheDocument();
  });

  it('tạo hồ sơ thiếu số điện thoại → báo lỗi tại ô nhập, không gọi máy chủ', async () => {
    routeGet();
    renderModal();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('tab', { name: /Hồ sơ bệnh nhân/ }));

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Hoàng Văn Em' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ bệnh nhân/ }));

    expect(await screen.findByText('Vui lòng nhập số điện thoại')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('mất mạng khi tạo hồ sơ → hiển thị lỗi, giữ nguyên dữ liệu đã nhập, không báo đã tạo', async () => {
    routeGet();
    api.post.mockImplementation(networkError);
    renderModal();
    await screen.findByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('tab', { name: /Hồ sơ bệnh nhân/ }));

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Hoàng Văn Em' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '0912345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ bệnh nhân/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /CHƯA được lưu/.test(a.textContent))).toBe(true);
    expect(screen.queryByText(/Đã tạo hồ sơ/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('Hoàng Văn Em');
  });
});
