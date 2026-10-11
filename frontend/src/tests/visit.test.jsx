import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { fullName: 'BS. Nguyễn Văn Hùng' }, isDoctor: true })
}));

import api from '../services/api';
import {
  visitService,
  calculateBmi,
  validateVitalSigns,
  getVitalWarnings,
  toVitalSignsPayload,
  parseVitalValue,
  findIcd10,
  isHttpUrl,
  isDrugExpired
} from '../services/visitService';
import aiAlertService from '../services/aiAlertService';
import { ToastProvider } from '../context/ToastContext';
import VisitDashboard from '../components/clinical/VisitDashboard';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR', details) =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message, details } }
  }));

const activeVisit = {
  id: 50,
  patientId: 7,
  patientCode: 'BN-260928-001',
  patientName: 'Trần Đức Minh',
  patientGender: 'MALE',
  patientDob: '1980-03-12',
  patientPhone: '0912345678',
  doctorId: 1,
  doctorName: 'BS. Nguyễn Văn Hùng',
  visitTime: '2026-10-10T08:30:00',
  status: 'IN_PROGRESS',
  chiefComplaint: 'Tái khám huyết áp',
  diagnosisCode: '',
  diagnosisNote: '',
  vitalSigns: { pulse: 88, bloodPressureSystolic: 150, bloodPressureDiastolic: 95 },
  prescriptions: [],
  labOrders: []
};

describe('Khám bệnh – visitService (gọi API thật, không còn dữ liệu giả)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    visitService.clearDrugCatalogCache();
  });

  describe('Danh sách & chi tiết ca khám', () => {
    it('lấy danh sách ca khám từ máy chủ, hỗ trợ cả dạng phân trang và mảng', async () => {
      api.get.mockReturnValueOnce(ok({ content: [activeVisit], totalElements: 1 }));
      const list = await visitService.getVisits();
      expect(api.get).toHaveBeenCalledWith('/visits', { params: { size: 50 } });
      expect(list).toHaveLength(1);
      expect(list[0].patientName).toBe('Trần Đức Minh');

      api.get.mockReturnValueOnce(ok([activeVisit]));
      expect(await visitService.getVisits({ doctorId: 1, status: 'IN_PROGRESS', size: 10 })).toHaveLength(1);
      expect(api.get).toHaveBeenLastCalledWith('/visits', { params: { size: 10, doctorId: 1, status: 'IN_PROGRESS' } });
    });

    it('mất mạng khi tải danh sách → ném lỗi, KHÔNG trả danh sách mẫu', async () => {
      api.get.mockImplementation(networkError);
      await expect(visitService.getVisits()).rejects.toMatchObject({
        message: expect.stringMatching(/Không kết nối được máy chủ/),
        isNetworkError: true
      });
      expect(localStorage.length).toBe(0);
    });

    it('lỗi 403 được chuyển thành thông điệp thiếu quyền', async () => {
      api.get.mockImplementation(() => Promise.reject(Object.assign(new Error('Request failed with status code 403'), { response: { status: 403, data: {} } })));
      await expect(visitService.getVisits()).rejects.toThrow('Bạn không có quyền thực hiện thao tác này.');
    });

    it('lấy chi tiết ca khám theo id; lỗi 404 báo rõ không tìm thấy', async () => {
      api.get.mockReturnValueOnce(ok(activeVisit));
      expect((await visitService.getVisitById(50)).id).toBe(50);
      expect(api.get).toHaveBeenCalledWith('/visits/50');

      api.get.mockImplementationOnce(() => backendError(404, undefined));
      await expect(visitService.getVisitById(999)).rejects.toThrow('Không tìm thấy dữ liệu yêu cầu.');
    });
  });

  describe('Tạo & cập nhật ca khám', () => {
    it('tạo ca khám chỉ gửi các trường backend hiểu và trả về dữ liệu máy chủ', async () => {
      api.post.mockReturnValue(ok({ ...activeVisit, id: 51 }));
      const created = await visitService.createVisit({
        patientId: 10,
        patientName: 'không gửi trường này',
        doctorId: 1,
        chiefComplaint: 'Chóng mặt',
        vitalSigns: { pulse: 74 }
      });
      expect(api.post).toHaveBeenCalledWith('/visits', {
        patientId: 10, doctorId: 1, chiefComplaint: 'Chóng mặt', vitalSigns: { pulse: 74 }
      });
      expect(created.id).toBe(51);
    });

    it('thiếu bệnh nhân hoặc bác sĩ → từ chối ngay, không gọi máy chủ', async () => {
      await expect(visitService.createVisit({ patientId: 10 })).rejects.toThrow(/Thiếu thông tin bệnh nhân hoặc bác sĩ/);
      await expect(visitService.createVisit({ doctorId: 1 })).rejects.toThrow(/Thiếu thông tin/);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('tạo ca khám lỗi mạng → ném lỗi (không báo đã tạo)', async () => {
      api.post.mockImplementation(networkError);
      await expect(visitService.createVisit({ patientId: 10, doctorId: 1 })).rejects.toThrow(/CHƯA được lưu/);
    });

    it('cập nhật chẩn đoán chỉ gửi trường đã cung cấp (không ghi đè trường khác)', async () => {
      api.put.mockReturnValue(ok({ ...activeVisit, diagnosisCode: 'I10', diagnosisNote: 'Tăng huyết áp nguyên phát' }));
      const updated = await visitService.updateVisit(50, { diagnosisCode: 'I10', diagnosisNote: 'Tăng huyết áp nguyên phát' });
      expect(api.put).toHaveBeenCalledWith('/visits/50', { diagnosisCode: 'I10', diagnosisNote: 'Tăng huyết áp nguyên phát' });
      expect(updated.diagnosisCode).toBe('I10');
    });

    it('ca khám đã hoàn tất bị khóa: lỗi nghiệp vụ của máy chủ được chuyển nguyên văn', async () => {
      api.put.mockImplementation(() => backendError(400, 'Ca khám đã hoàn tất, không thể chỉnh sửa'));
      await expect(visitService.updateVisit(50, { diagnosisCode: 'I10' })).rejects.toThrow('Ca khám đã hoàn tất');
    });

    it('cập nhật sinh hiệu gửi đối tượng VitalSignsDto; rỗng → từ chối ngay', async () => {
      api.put.mockReturnValue(ok(activeVisit));
      await visitService.updateVitalSigns(50, { pulse: 82, temperature: 36.6 });
      expect(api.put).toHaveBeenCalledWith('/visits/50', { vitalSigns: { pulse: 82, temperature: 36.6 } });

      api.put.mockClear();
      await expect(visitService.updateVitalSigns(50, {})).rejects.toThrow(/Chưa nhập chỉ số sinh hiệu/);
      await expect(visitService.updateVitalSigns(50, '135/85')).rejects.toThrow(/Chưa nhập chỉ số sinh hiệu/);
      expect(api.put).not.toHaveBeenCalled();
    });

    it('hoàn tất ca khám qua PATCH; lỗi mạng → ném lỗi, không báo hoàn tất', async () => {
      api.patch.mockReturnValueOnce(ok({ ...activeVisit, status: 'COMPLETED' }));
      expect((await visitService.completeVisit(50)).status).toBe('COMPLETED');
      expect(api.patch).toHaveBeenCalledWith('/visits/50/complete');

      api.patch.mockImplementationOnce(networkError);
      await expect(visitService.completeVisit(50)).rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('Kê đơn thuốc', () => {
    it('chuẩn hóa dòng thuốc và gửi đúng dữ liệu; tổng tiền do máy chủ tính', async () => {
      api.post.mockReturnValue(ok({
        id: 90, items: [{ drugId: 1, drugName: 'Paracetamol 500mg' }, { drugId: 5, drugName: 'Amoxicillin 500mg' }],
        estimatedTotalAmount: 57000
      }));
      const prescription = await visitService.createPrescription(50, {
        items: [
          { drugId: '1', dosage: ' 500mg ', quantity: '10', instruction: ' Uống sau ăn khi đau ' },
          { drugId: 5, dosage: '500mg', quantity: 14 }
        ]
      });
      expect(api.post).toHaveBeenCalledWith('/visits/50/prescriptions', {
        items: [
          { drugId: 1, dosage: '500mg', quantity: 10, instruction: 'Uống sau ăn khi đau' },
          { drugId: 5, dosage: '500mg', quantity: 14, instruction: undefined }
        ]
      });
      expect(prescription.estimatedTotalAmount).toBe(57000);
      expect(prescription.items[0].drugName).toContain('Paracetamol');
    });

    it('lý do vẫn kê đơn (overrideReason) được cắt tối đa 500 ký tự', async () => {
      api.post.mockReturnValue(ok({ id: 91, items: [] }));
      await visitService.createPrescription(50, {
        items: [{ drugId: 3, dosage: '81mg', quantity: 30 }],
        overrideReason: ` ${'x'.repeat(600)} `
      });
      const body = api.post.mock.calls[0][1];
      expect(body.overrideReason).toHaveLength(500);
    });

    it('tương tác thuốc nghiêm trọng: máy chủ chặn → lỗi mang errorCode và chi tiết cảnh báo', async () => {
      api.post.mockImplementation(() => backendError(
        400, 'Đơn thuốc có cảnh báo an toàn nghiêm trọng', 'PRESCRIPTION_SAFETY_BLOCK',
        ['Aspirin + Warfarin: nguy cơ xuất huyết']
      ));
      const err = await visitService
        .createPrescription(50, { items: [{ drugId: 3, dosage: '81mg', quantity: 30 }, { drugId: 4, dosage: '5mg', quantity: 30 }] })
        .catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.errorCode).toBe('PRESCRIPTION_SAFETY_BLOCK');
      expect(err.details).toEqual(['Aspirin + Warfarin: nguy cơ xuất huyết']);
      expect(err.message).toBe('Đơn thuốc có cảnh báo an toàn nghiêm trọng');
    });

    it('kê đơn lỗi mạng → ném lỗi, không trả đơn thuốc giả', async () => {
      api.post.mockImplementation(networkError);
      await expect(visitService.createPrescription(50, { items: [{ drugId: 1, dosage: '500mg', quantity: 10 }] }))
        .rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('Cận lâm sàng', () => {
    it('chỉ định xét nghiệm rồi nhập kết quả qua API', async () => {
      api.post.mockReturnValue(ok({ id: 300, status: 'ORDERED', testType: 'Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)' }));
      const order = await visitService.createLabOrder(50, { testType: ' Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số) ' });
      expect(api.post).toHaveBeenCalledWith('/visits/50/lab-orders', { testType: 'Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)' });
      expect(order.status).toBe('ORDERED');

      api.put.mockReturnValue(ok({ id: 300, status: 'RESULTED', resultText: 'Bạch cầu (WBC): 6.8 K/uL' }));
      const result = await visitService.updateLabResult(300, { resultText: ' Bạch cầu (WBC): 6.8 K/uL ' });
      expect(api.put).toHaveBeenCalledWith('/lab-orders/300/result', { resultText: 'Bạch cầu (WBC): 6.8 K/uL' });
      expect(result.status).toBe('RESULTED');
    });

    it('đường dẫn tệp kết quả không phải http(s) bị từ chối trước khi gọi máy chủ', async () => {
      await expect(visitService.updateLabResult(300, { resultText: 'ok', resultFileUrl: 'javascript:alert(1)' }))
        .rejects.toThrow(/http:\/\/ hoặc https:\/\//);
      expect(api.put).not.toHaveBeenCalled();

      api.put.mockReturnValue(ok({ id: 300 }));
      await visitService.updateLabResult(300, { resultText: 'ok', resultFileUrl: 'https://lab.example.com/r.pdf' });
      expect(api.put).toHaveBeenCalledWith('/lab-orders/300/result', { resultText: 'ok', resultFileUrl: 'https://lab.example.com/r.pdf' });
    });

    it('lỗi mạng khi chỉ định hoặc nhập kết quả → ném lỗi', async () => {
      api.post.mockImplementation(networkError);
      await expect(visitService.createLabOrder(50, { testType: 'CBC' })).rejects.toThrow(/Không kết nối được máy chủ/);
      api.put.mockImplementation(networkError);
      await expect(visitService.updateLabResult(300, { resultText: 'x' })).rejects.toThrow(/Không kết nối được máy chủ/);
    });
  });

  describe('Danh mục thuốc', () => {
    it('lấy từ kho dược thật và lưu đệm; xóa đệm thì tải lại', async () => {
      api.get.mockReturnValue(ok([{ id: 1, name: 'Paracetamol 500mg', stockQuantity: 100 }]));
      expect(await visitService.getDrugCatalog()).toHaveLength(1);
      await visitService.getDrugCatalog();
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/drugs/all');

      visitService.clearDrugCatalogCache();
      await visitService.getDrugCatalog();
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('lỗi mạng → ném lỗi và không lưu đệm kết quả lỗi', async () => {
      api.get.mockImplementationOnce(networkError);
      await expect(visitService.getDrugCatalog()).rejects.toThrow(/Không kết nối được máy chủ/);
      api.get.mockReturnValueOnce(ok([{ id: 2, name: 'Amoxicillin' }]));
      expect(await visitService.getDrugCatalog()).toHaveLength(1);
    });
  });
});

describe('Khám bệnh – kiểm tra tương tác thuốc (AI)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dùng kết quả của máy chủ khi có, gắn nhãn nguồn "server"', async () => {
    api.post.mockReturnValue(ok({
      is_safe: false,
      interactions: [{ drug_a_name: 'Aspirin 81mg', drug_b_name: 'Warfarin 5mg', severity: 'CRITICAL', description: 'Nguy cơ xuất huyết' }]
    }));
    const res = await aiAlertService.checkPrescriptionSafety(50, [
      { id: 3, name: 'Aspirin 81mg' }, { id: 4, name: 'Warfarin 5mg' }
    ]);
    expect(api.post).toHaveBeenCalledWith('/ai/clinical/visits/50/check-safety', expect.any(Array));
    expect(res.source).toBe('server');
    expect(res.has_critical).toBe(true);
  });

  it('dịch vụ AI mất kết nối → quy tắc cục bộ vẫn phát hiện Aspirin + Warfarin và gắn nhãn "local"', async () => {
    api.post.mockImplementation(networkError);
    const res = await aiAlertService.checkPrescriptionSafety(50, [
      { id: 3, name: 'Aspirin 81mg' }, { id: 4, name: 'Warfarin 5mg' }
    ]);
    expect(res.source).toBe('local');
    expect(res.has_warning).toBe(true);
    expect(res.has_critical).toBe(true);
    expect(res.interactions).toHaveLength(1);
    expect(res.interactions[0].description).toContain('xuất huyết');
  });
});

describe('Khám bệnh – tiện ích sinh hiệu & mã bệnh', () => {
  it('BMI theo ngưỡng người châu Á', () => {
    expect(calculateBmi(68, 172)).toMatchObject({ bmi: 23, category: 'Thừa cân' });
    expect(calculateBmi(50, 175).category).toBe('Thiếu cân');
    expect(calculateBmi(60, 170).category).toBe('Bình thường');
    expect(calculateBmi(80, 170).category).toBe('Béo phì độ I');
    expect(calculateBmi(0, 170)).toBeNull();
    expect(calculateBmi('abc', 170)).toBeNull();
  });

  it('ô sinh hiệu để trống là "chưa đo" (null), không bị hiểu thành 0', () => {
    expect(parseVitalValue('')).toBeNull();
    expect(parseVitalValue('36,8')).toBe(36.8);
    const { values, isEmpty, errors } = validateVitalSigns({ pulse: '', temperature: '' });
    expect(isEmpty).toBe(true);
    expect(errors).toEqual({});
    expect(toVitalSignsPayload(values)).toBeNull();
  });

  it('kiểm tra hợp lệ sinh hiệu theo ràng buộc backend', () => {
    const { errors } = validateVitalSigns({
      pulse: '500', bloodPressureSystolic: '80', bloodPressureDiastolic: '90', temperature: 'abc', spO2: '97.5'
    });
    expect(errors.pulse).toMatch(/phải từ 20 đến 300/);
    expect(errors.bloodPressureDiastolic).toMatch(/nhỏ hơn tâm thu/);
    expect(errors.temperature).toMatch(/phải là số/);
    expect(errors.spO2).toMatch(/số nguyên/);
  });

  it('cảnh báo sinh hiệu bất thường chỉ xét giá trị đã nhập', () => {
    const w = getVitalWarnings({ pulse: 120, bloodPressureSystolic: 150, bloodPressureDiastolic: null, temperature: 38.5, spO2: 92 });
    expect(w).toEqual(expect.arrayContaining([
      expect.stringMatching(/Mạch nhanh/), expect.stringMatching(/Huyết áp cao/),
      expect.stringMatching(/Sốt/), expect.stringMatching(/SpO₂ thấp/)
    ]));
    expect(getVitalWarnings({})).toEqual([]);
  });

  it('tra cứu ICD-10, chặn URL không an toàn, kiểm tra hạn dùng thuốc', () => {
    expect(findIcd10(' i10 ').name).toContain('Tăng huyết áp');
    expect(findIcd10('ZZZ')).toBeNull();
    expect(isHttpUrl('https://lab.example.com/a.pdf')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,hi')).toBe(false);
    expect(isDrugExpired({ expiryDate: '2020-01-01' })).toBe(true);
    expect(isDrugExpired({ expiryDate: '2999-01-01' })).toBe(false);
    expect(isDrugExpired({})).toBe(false);
  });
});

describe('Khám bệnh – giao diện Phòng khám bác sĩ (VisitDashboard)', () => {
  const routeGet = (overrides = {}) => {
    api.get.mockImplementation((url) => {
      if (overrides[url]) return overrides[url]();
      if (url === '/visits') return ok({ content: [activeVisit], totalElements: 1 });
      if (url === '/patients/7/allergies') return ok([]);
      return networkError();
    });
  };

  const renderDashboard = () => render(
    <ToastProvider>
      <VisitDashboard isOpen onClose={() => {}} />
    </ToastProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.confirm = vi.fn(() => true);
    routeGet();
  });

  it('hiển thị ca khám, thông tin bệnh nhân, sinh hiệu và các tab lấy từ máy chủ', async () => {
    renderDashboard();

    expect(await screen.findByText(/Phòng khám bác sĩ/i)).toBeInTheDocument();
    expect(screen.getByText(/Bác sĩ: BS\. Nguyễn Văn Hùng/)).toBeInTheDocument();
    expect((await screen.findAllByText('Trần Đức Minh')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BN-260928-001/).length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledWith('/visits', { params: { size: 50 } });

    expect(screen.getByText(/Chỉ số sinh hiệu/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Mạch')).toHaveValue(88);
    expect(screen.getByLabelText('Huyết áp tâm thu')).toHaveValue(150);
    // Sinh hiệu bất thường được cảnh báo
    expect(screen.getAllByText(/Huyết áp cao/).length).toBeGreaterThan(0);

    expect(screen.getByRole('tab', { name: /Kê đơn thuốc/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Cận lâm sàng/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Lịch sử phân tích AI/i })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/patients/7/allergies'));
  });

  it('không tải được danh sách → hiển thị lỗi + nút Thử lại, không có bệnh nhân mẫu', async () => {
    routeGet({ '/visits': networkError });
    renderDashboard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Trần Đức Minh')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Kê đơn thuốc/i })).not.toBeInTheDocument();

    // Thử lại thành công khi máy chủ phục hồi
    routeGet();
    fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect((await screen.findAllByText('Trần Đức Minh')).length).toBeGreaterThan(0);
  });

  it('không tải được dị ứng → báo "chưa xác định", không coi là an toàn', async () => {
    routeGet({ '/patients/7/allergies': networkError });
    renderDashboard();
    expect(await screen.findByText(/Chưa xác định được tiền sử dị ứng/)).toBeInTheDocument();
  });

  it('lưu ca khám: gửi chẩn đoán lên máy chủ và chỉ báo thành công sau khi máy chủ phản hồi', async () => {
    api.put.mockReturnValue(ok({ ...activeVisit, diagnosisCode: 'I10' }));
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    fireEvent.change(await screen.findByLabelText(/Mã chẩn đoán ICD-10/), { target: { value: 'i10' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu ca khám/ }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [url, body] = api.put.mock.calls[0];
    expect(url).toBe('/visits/50');
    expect(body).toMatchObject({ diagnosisCode: 'I10', chiefComplaint: 'Tái khám huyết áp' });
    expect(body.vitalSigns).toMatchObject({ pulse: 88, bloodPressureSystolic: 150, bloodPressureDiastolic: 95 });
    expect(await screen.findByText('Đã lưu sinh hiệu và chẩn đoán.')).toBeInTheDocument();
  });

  it('lưu ca khám lỗi mạng: báo lỗi, KHÔNG hiển thị đã lưu', async () => {
    api.put.mockImplementation(networkError);
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    fireEvent.change(await screen.findByLabelText(/Mã chẩn đoán ICD-10/), { target: { value: 'I10' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu ca khám/ }));

    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    expect(screen.queryByText('Đã lưu sinh hiệu và chẩn đoán.')).not.toBeInTheDocument();
    expect(screen.getByText(/Có thay đổi chưa lưu/)).toBeInTheDocument();
  });

  it('hoàn tất ca khám bắt buộc có mã ICD-10 và không gọi máy chủ khi thiếu', async () => {
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    fireEvent.click(await screen.findByRole('button', { name: /Hoàn tất ca khám/ }));
    expect(await screen.findByText(/Bắt buộc nhập mã chẩn đoán ICD-10/)).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('hoàn tất ca khám: cập nhật rồi PATCH complete, sau đó khóa hồ sơ', async () => {
    api.put.mockReturnValue(ok({ ...activeVisit, diagnosisCode: 'I10' }));
    api.patch.mockReturnValue(ok({ ...activeVisit, diagnosisCode: 'I10', status: 'COMPLETED' }));
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    fireEvent.change(await screen.findByLabelText(/Mã chẩn đoán ICD-10/), { target: { value: 'I10' } });
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất ca khám/ }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/visits/50/complete'));
    expect(await screen.findByText(/Đã hoàn tất ca khám của Trần Đức Minh/)).toBeInTheDocument();
    expect(screen.getByText(/hồ sơ đã khóa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu ca khám/ })).not.toBeInTheDocument();
  });

  it('hoàn tất ca khám lỗi: giữ nguyên trạng thái đang khám và báo lỗi từ máy chủ', async () => {
    api.put.mockReturnValue(ok({ ...activeVisit, diagnosisCode: 'I10' }));
    api.patch.mockImplementation(() => backendError(400, 'Còn chỉ định cận lâm sàng chưa có kết quả'));
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    fireEvent.change(await screen.findByLabelText(/Mã chẩn đoán ICD-10/), { target: { value: 'I10' } });
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất ca khám/ }));

    expect(await screen.findByText('Còn chỉ định cận lâm sàng chưa có kết quả')).toBeInTheDocument();
    expect(screen.queryByText(/Đã hoàn tất ca khám của/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hoàn tất ca khám/ })).toBeInTheDocument();
  });

  it('ca khám đã hoàn tất được mở ở chế độ chỉ đọc', async () => {
    routeGet({ '/visits': () => ok({ content: [{ ...activeVisit, status: 'COMPLETED', diagnosisCode: 'I10' }] }) });
    renderDashboard();
    await screen.findAllByText('Trần Đức Minh');

    expect(await screen.findByLabelText(/Mã chẩn đoán ICD-10/)).toBeDisabled();
    expect(screen.getByText(/Ca khám đã hoàn tất – hồ sơ đã khóa/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu ca khám/ })).not.toBeInTheDocument();
  });
});
