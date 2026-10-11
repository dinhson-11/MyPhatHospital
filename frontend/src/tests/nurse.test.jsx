import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }) => children
}));

import api from '../services/api';
import { nurseService, isLabValueAbnormal, parseReferenceRange, buildLabResultText } from '../services/nurseService';
import { NurseStationModal } from '../components/nurse/NurseStationModal';
import { NETWORK_ERROR_MESSAGE } from '../services/apiError';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const visitWaiting = {
  id: 101,
  patientId: 1,
  patientCode: 'BN-001',
  patientName: 'Trần Đức Minh',
  patientGender: 'MALE',
  patientDob: '1990-05-01',
  doctorName: 'BS. Hoàng C',
  chiefComplaint: 'Đau đầu',
  vitalSigns: null,
  labOrders: [
    { id: 7, testType: 'Định lượng Glucose máu', status: 'RESULTED', orderedAt: '2026-10-12T08:00:00', results: [{ resultText: 'Kết quả cũ' }] },
    { id: 5, testType: 'Tổng phân tích nước tiểu', status: 'ORDERED', orderedAt: '2026-10-12T09:00:00' }
  ]
};
const visitDone = {
  id: 102,
  patientId: 2,
  patientCode: 'BN-002',
  patientName: 'Lê Thị C',
  vitalSigns: { pulse: 80, weight: 55, height: 160 },
  labOrders: []
};

const routeVisits = (visits = [visitWaiting, visitDone]) => {
  api.get.mockImplementation((url) => {
    if (url === '/visits') return ok({ content: visits, totalElements: visits.length });
    return networkError();
  });
};

describe('nurseService (gọi API thật, không còn dữ liệu giả)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('tính BMI theo ngưỡng người châu Á và trả null khi dữ liệu không hợp lệ', () => {
    expect(nurseService.calculateBmi(60, 165)).toMatchObject({ bmi: 22, category: 'Bình thường' });
    expect(nurseService.calculateBmi(45, 170)).toMatchObject({ bmi: 15.6, category: 'Thiếu cân' });
    expect(nurseService.calculateBmi(65, 165)).toMatchObject({ bmi: 23.9, category: 'Thừa cân' });
    expect(nurseService.calculateBmi(70, 165)).toMatchObject({ bmi: 25.7, category: 'Béo phì độ I' });
    expect(nurseService.calculateBmi(90, 165)).toMatchObject({ bmi: 33.1, category: 'Béo phì độ II' });
    expect(nurseService.calculateBmi(0, 165)).toBeNull();
    expect(nurseService.calculateBmi(60, 0)).toBeNull();
    expect(nurseService.calculateBmi('abc', 165)).toBeNull();
  });

  it('hàng đợi sinh hiệu lấy từ ca khám IN_PROGRESS và suy ra trạng thái đã đo/chờ đo', async () => {
    routeVisits();
    const queue = await nurseService.getVitalsQueue();
    expect(api.get).toHaveBeenCalledWith('/visits', { params: { size: 100, status: 'IN_PROGRESS' } });
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ visitId: 101, fullName: 'Trần Đức Minh', status: 'WAITING_VITALS', reason: 'Đau đầu' });
    expect(queue[1]).toMatchObject({ visitId: 102, status: 'VITALS_COMPLETED' });
  });

  it('lưu sinh hiệu: PUT /visits/{id} với đối tượng vitalSigns và trả dữ liệu máy chủ', async () => {
    const vitals = { pulse: 78, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 36.8 };
    api.put.mockReturnValue(ok({ ...visitWaiting, vitalSigns: vitals }));
    const result = await nurseService.saveVitals(101, vitals);
    expect(api.put).toHaveBeenCalledWith('/visits/101', { vitalSigns: vitals });
    expect(result.vitalSigns.pulse).toBe(78);
  });

  it('lưu sinh hiệu rỗng → báo lỗi, không gọi máy chủ', async () => {
    await expect(nurseService.saveVitals(101, {})).rejects.toThrow(/Chưa nhập chỉ số sinh hiệu/);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('mất mạng khi lưu sinh hiệu → ném lỗi, KHÔNG báo thành công, không ghi localStorage', async () => {
    api.put.mockImplementation(networkError);
    await expect(nurseService.saveVitals(101, { pulse: 78 })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    expect(localStorage.length).toBe(0);
  });

  it('lỗi nghiệp vụ từ máy chủ được chuyển nguyên văn', async () => {
    api.put.mockImplementation(() => backendError(400, 'Ca khám đã kết thúc, không thể sửa sinh hiệu'));
    await expect(nurseService.saveVitals(101, { pulse: 78 })).rejects.toThrow(/Ca khám đã kết thúc/);
  });

  it('chỉ định cận lâm sàng: gộp từ ca khám, đưa chỉ định chờ kết quả lên trước', async () => {
    routeVisits();
    const orders = await nurseService.getPendingLabOrders();
    expect(orders.map((o) => o.id)).toEqual([5, 7]);
    expect(orders[0]).toMatchObject({
      visitId: 101, patientName: 'Trần Đức Minh', patientCode: 'BN-001', testName: 'Tổng phân tích nước tiểu', status: 'ORDERED'
    });
  });

  it('không tải được chỉ định/hàng đợi → ném lỗi thay vì trả danh sách giả', async () => {
    api.get.mockImplementation(networkError);
    await expect(nurseService.getPendingLabOrders()).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    await expect(nurseService.getVitalsQueue()).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });

  it('nhập kết quả xét nghiệm: PUT /lab-orders/{id}/result', async () => {
    api.put.mockReturnValue(ok({ id: 5, status: 'RESULTED' }));
    const res = await nurseService.submitLabResult(5, { resultText: ' Glucose 5.2 mmol/L ', resultFileUrl: 'https://lab.example/r.pdf' });
    expect(api.put).toHaveBeenCalledWith('/lab-orders/5/result', { resultText: 'Glucose 5.2 mmol/L', resultFileUrl: 'https://lab.example/r.pdf' });
    expect(res.status).toBe('RESULTED');
  });

  it('kết quả xét nghiệm rỗng hoặc đường dẫn không phải http(s) → bị chặn trước khi gọi máy chủ', async () => {
    await expect(nurseService.submitLabResult(5, { resultText: '   ' })).rejects.toThrow(/Vui lòng nhập kết quả/);
    await expect(nurseService.submitLabResult(5, { resultText: 'ok', resultFileUrl: 'javascript:alert(1)' }))
      .rejects.toThrow(/http/);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('mất mạng khi lưu kết quả xét nghiệm → ném lỗi, KHÔNG báo đã lưu', async () => {
    api.put.mockImplementation(networkError);
    await expect(nurseService.submitLabResult(5, { resultText: 'Glucose 5.2' })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });
});

describe('Đánh giá kết quả xét nghiệm', () => {
  it('phân tích khoảng tham chiếu', () => {
    expect(parseReferenceRange('3,9 - 6,4')).toEqual({ min: 3.9, max: 6.4 });
    expect(parseReferenceRange('< 5.2')).toEqual({ min: null, max: 5.2 });
    expect(parseReferenceRange('≥ 1.0')).toEqual({ min: 1, max: null });
    expect(parseReferenceRange('âm tính')).toBeNull();
    expect(parseReferenceRange('')).toBeNull();
  });

  it('tự đánh giá bất thường khi giá trị và khoảng đều là số, ngược lại trả null', () => {
    expect(isLabValueAbnormal('7,2', '3.9 - 6.4')).toBe(true);
    expect(isLabValueAbnormal('5.0', '3.9 - 6.4')).toBe(false);
    expect(isLabValueAbnormal('6.0', '< 5.2')).toBe(true);
    expect(isLabValueAbnormal('dương tính', '3.9 - 6.4')).toBeNull();
    expect(isLabValueAbnormal('5.0', 'âm tính')).toBeNull();
  });

  it('ghép resultText gửi backend', () => {
    expect(buildLabResultText({ value: '7.2', unit: 'mmol/L', referenceRange: '3.9 - 6.4', isAbnormal: true, conclusion: 'Tăng đường huyết' }))
      .toBe('Kết quả: 7.2 mmol/L (khoảng tham chiếu: 3.9 - 6.4)\nĐánh giá: BẤT THƯỜNG\nKết luận: Tăng đường huyết');
    expect(buildLabResultText({ conclusion: 'Âm tính' })).toBe('Kết luận: Âm tính');
    expect(buildLabResultText({})).toBe('');
  });
});

describe('NurseStationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    routeVisits();
  });

  const renderModal = () => render(<NurseStationModal isOpen onClose={() => {}} />);

  it('hiển thị hai tab nghiệp vụ và hàng đợi bệnh nhân lấy từ máy chủ', async () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /Trạm điều dưỡng & xét nghiệm/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Đo sinh hiệu/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Kết quả cận lâm sàng/ })).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Bệnh nhân chờ đo sinh hiệu' });
    expect(within(list).getByText('Trần Đức Minh')).toBeInTheDocument();
    expect(within(list).getByText('Chờ đo')).toBeInTheDocument();
    expect(within(list).getByText('Đã đo')).toBeInTheDocument();
  });

  it('chọn bệnh nhân, nhập chiều cao/cân nặng → BMI tự tính theo ngưỡng châu Á', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /Trần Đức Minh/ }));

    fireEvent.change(await screen.findByLabelText('Chiều cao'), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText('Cân nặng'), { target: { value: '65' } });

    await waitFor(() => {
      expect(screen.getByTestId('nurse-vs-bmi')).toHaveTextContent('BMI 22,5 kg/m² · Bình thường');
    });
  });

  it('lưu sinh hiệu: gửi đúng chỉ số đã nhập lên máy chủ rồi mới báo thành công', async () => {
    api.put.mockReturnValue(ok({ ...visitWaiting, vitalSigns: { pulse: 78 } }));
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /Trần Đức Minh/ }));
    fireEvent.change(await screen.findByLabelText('Mạch'), { target: { value: '78' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu sinh hiệu/ }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/visits/101', { vitalSigns: { pulse: 78 } }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Đã lưu sinh hiệu cho Trần Đức Minh.', 'success'));
  });

  it('chỉ số sinh hiệu không hợp lệ → báo lỗi, không gọi máy chủ', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /Trần Đức Minh/ }));
    fireEvent.change(await screen.findByLabelText('Mạch'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu sinh hiệu/ }));

    expect(await screen.findByText(/Mạch phải từ 20 đến 300/)).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/chưa hợp lệ/), 'error');
  });

  it('lỗi mạng khi lưu sinh hiệu: báo lỗi rõ ràng, KHÔNG báo đã lưu, giữ nguyên biểu mẫu', async () => {
    api.put.mockImplementation(networkError);
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /Trần Đức Minh/ }));
    fireEvent.change(await screen.findByLabelText('Mạch'), { target: { value: '78' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu sinh hiệu/ }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE, 'error'));
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(screen.getByLabelText('Mạch')).toHaveValue(78);
  });

  it('không tải được hàng đợi → hiển thị lỗi + nút Thử lại, không có bệnh nhân giả', async () => {
    api.get.mockImplementation(networkError);
    renderModal();
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Trần Đức Minh')).not.toBeInTheDocument();

    routeVisits();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Trần Đức Minh')).toBeInTheDocument();
  });

  it('chuyển sang tab cận lâm sàng: hiển thị chỉ định lấy từ ca khám', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kết quả cận lâm sàng/ }));

    const list = await screen.findByRole('list', { name: 'Chỉ định cận lâm sàng' });
    expect(within(list).getByText('Tổng phân tích nước tiểu')).toBeInTheDocument();
    expect(within(list).getByText('Định lượng Glucose máu')).toBeInTheDocument();
    expect(screen.getByText('Chọn chỉ định ở danh sách bên trái.')).toBeInTheDocument();
  });

  it('nhập kết quả xét nghiệm: tự đánh giá bất thường và gửi resultText lên máy chủ', async () => {
    api.put.mockReturnValue(ok({ id: 5, status: 'RESULTED' }));
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kết quả cận lâm sàng/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tổng phân tích nước tiểu/ }));

    fireEvent.change(await screen.findByLabelText('Chỉ số đo được'), { target: { value: '7.2' } });
    fireEvent.change(screen.getByLabelText('Khoảng tham chiếu'), { target: { value: '3.9 - 6.4' } });
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: 'mmol/L' } });
    expect(screen.getByLabelText(/Chỉ số bất thường/)).toBeChecked();
    expect(screen.getByText(/NGOÀI khoảng tham chiếu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lưu kết quả/ }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/lab-orders/5/result', {
      resultText: 'Kết quả: 7.2 mmol/L (khoảng tham chiếu: 3.9 - 6.4)\nĐánh giá: BẤT THƯỜNG'
    }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Đã lưu kết quả "Tổng phân tích nước tiểu"/), 'success'));
  });

  it('để trống kết quả → báo lỗi, không gọi máy chủ', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kết quả cận lâm sàng/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tổng phân tích nước tiểu/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Lưu kết quả/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nhập chỉ số đo được hoặc kết luận/);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('lỗi mạng khi lưu kết quả xét nghiệm: hiển thị lỗi trong biểu mẫu, KHÔNG báo đã lưu', async () => {
    api.put.mockImplementation(networkError);
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kết quả cận lâm sàng/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tổng phân tích nước tiểu/ }));
    fireEvent.change(await screen.findByLabelText('Kết luận xét nghiệm'), { target: { value: 'Âm tính' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu kết quả/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(showToast).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE, 'error');
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(screen.getByLabelText('Kết luận xét nghiệm')).toHaveValue('Âm tính');
  });
});
