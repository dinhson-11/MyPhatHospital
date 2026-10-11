import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import { receptionService } from '../services/receptionService';
import { nurseService } from '../services/nurseService';
import visitService from '../services/visitService';
import pharmacyService from '../services/pharmacyService';
import invoiceService from '../services/invoiceService';
import { reportService } from '../services/reportService';
import aiAlertService from '../services/aiAlertService';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

/**
 * Máy chủ giả lập tối thiểu (trạng thái nằm trong bài kiểm thử, không nằm trong service).
 * Mục đích: kiểm tra hợp đồng giữa các service ở từng chặng của chu trình khám chữa bệnh
 * (đường dẫn, dữ liệu gửi đi, dữ liệu trả về được dùng ở chặng sau) – KHÔNG phải dữ liệu mẫu của ứng dụng.
 */
function createFakeBackend() {
  const state = {
    patients: [],
    appointments: [{
      id: 700, patientId: null, patientName: 'Vũ Đình Trọng', patientCode: '', doctorId: 1,
      doctorName: 'BS. Nguyễn Văn Hùng', departmentName: 'Khoa Tim mạch',
      scheduledAt: '2026-10-10T08:00:00', status: 'CONFIRMED', symptom: 'Huyết áp tăng cao, đau đầu chóng mặt'
    }],
    visits: [],
    prescriptions: [],
    drugs: [
      { id: 9, code: 'DRUG-AMLO-5', name: 'Amlodipine 5mg', price: 3500, stockQuantity: 1600 },
      { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg', price: 2000, stockQuantity: 900 }
    ],
    invoices: [],
    dispensed: new Set(),
    calls: []
  };
  let seq = 100;

  const visitOf = (id) => state.visits.find((v) => v.id === Number(id));

  api.get.mockImplementation((url) => {
    state.calls.push(['GET', url]);
    if (url === '/appointments') return ok({ content: state.appointments });
    if (url === '/visits') return ok({ content: state.visits });
    if (url === '/drugs/all') return ok(state.drugs.map((d) => ({ ...d })));
    if (url === '/reports/kpi-summary') {
      return ok({
        totalPatients: state.patients.length, todayVisits: state.visits.length,
        todayRevenue: state.invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.patientAmount, 0)
      });
    }
    if (url === '/reports/revenue') {
      const paid = state.invoices.filter((i) => i.status === 'PAID');
      return ok({
        totalRevenue: paid.reduce((s, i) => s + i.totalAmount, 0),
        patientCollected: paid.reduce((s, i) => s + i.patientAmount, 0),
        paidInvoicesCount: paid.length,
        vietQrRevenue: paid.filter((i) => i.paymentMethod === 'VIETQR').reduce((s, i) => s + i.patientAmount, 0)
      });
    }
    return networkError();
  });

  api.post.mockImplementation((url, body) => {
    state.calls.push(['POST', url, body]);
    if (url === '/patients') {
      const patient = { id: 900 + state.patients.length, patientCode: `BN-261010-00${state.patients.length + 1}`, ...body };
      state.patients.push(patient);
      state.appointments[0].patientId = patient.id; // lịch hẹn được gắn với hồ sơ vừa tạo
      state.appointments[0].patientCode = patient.patientCode;
      return ok(patient);
    }
    if (url === '/visits') {
      const patient = state.patients.find((p) => p.id === body.patientId);
      const visit = {
        id: ++seq, status: 'IN_PROGRESS', patientName: patient?.fullName, patientCode: patient?.patientCode,
        vitalSigns: null, prescriptions: [], labOrders: [], ...body
      };
      state.visits.push(visit);
      return ok(visit);
    }
    if (url === '/ai/clinical/suggest-diagnosis' || /^\/ai\/clinical\/visits\/\d+\/suggest-diagnosis$/.test(url)) {
      return ok({ suggestions: [{ code: 'I10', name: 'Tăng huyết áp vô căn', confidence: 0.94 }], total_suggestions: 1 });
    }
    if (/^\/ai\/clinical\/visits\/\d+\/check-safety$/.test(url)) {
      const names = body.map((d) => d.name).join(' ');
      const risky = /Aspirin/.test(names) && /Warfarin/.test(names);
      return ok({
        is_safe: !risky, has_warning: risky,
        interactions: risky ? [{ drug_a_name: 'Aspirin', drug_b_name: 'Warfarin', severity: 'CRITICAL' }] : []
      });
    }
    let m = url.match(/^\/visits\/(\d+)\/prescriptions$/);
    if (m) {
      const visit = visitOf(m[1]);
      const items = body.items.map((it) => {
        const drug = state.drugs.find((d) => d.id === it.drugId);
        return { ...it, drugName: drug.name, unitPrice: drug.price };
      });
      const prescription = {
        id: ++seq, visitId: visit.id, items,
        estimatedTotalAmount: items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
      };
      state.prescriptions.push(prescription);
      visit.prescriptions.push(prescription);
      return ok(prescription);
    }
    m = url.match(/^\/prescriptions\/(\d+)\/dispense$/);
    if (m) {
      const prescription = state.prescriptions.find((p) => p.id === Number(m[1]));
      const visit = visitOf(prescription.visitId);
      if (visit.status !== 'COMPLETED') {
        return backendError(400, 'Ca khám chưa hoàn tất – chưa thể cấp phát thuốc');
      }
      if (state.dispensed.has(prescription.id)) return backendError(409, 'Đơn thuốc đã được cấp phát');
      prescription.items.forEach((it) => {
        state.drugs.find((d) => d.id === it.drugId).stockQuantity -= it.quantity;
      });
      state.dispensed.add(prescription.id);
      return ok({ id: ++seq, prescriptionId: prescription.id, status: 'DISPENSED' });
    }
    m = url.match(/^\/invoices\/generate\/(\d+)$/);
    if (m) {
      const visit = visitOf(m[1]);
      if (visit.status !== 'COMPLETED') return backendError(400, 'Chỉ lập hóa đơn cho ca khám đã hoàn tất');
      const drugTotal = visit.prescriptions.reduce((s, p) => s + p.estimatedTotalAmount, 0);
      const totalAmount = 150000 + drugTotal;
      const invoice = {
        id: ++seq, visitId: visit.id, status: 'PENDING', totalAmount,
        insuranceAmount: 0, patientAmount: totalAmount
      };
      state.invoices.push(invoice);
      return ok(invoice);
    }
    return networkError();
  });

  api.put.mockImplementation((url, body) => {
    state.calls.push(['PUT', url, body]);
    let m = url.match(/^\/visits\/(\d+)$/);
    if (m) {
      const visit = visitOf(m[1]);
      if (visit.status === 'COMPLETED') return backendError(400, 'Ca khám đã hoàn tất, không thể chỉnh sửa');
      Object.assign(visit, body, body.vitalSigns ? { vitalSigns: { ...(visit.vitalSigns || {}), ...body.vitalSigns } } : {});
      return ok(visit);
    }
    m = url.match(/^\/invoices\/(\d+)\/pay$/);
    if (m) {
      const invoice = state.invoices.find((i) => i.id === Number(m[1]));
      if (invoice.status === 'PAID') return backendError(400, 'Hóa đơn đã được thanh toán');
      Object.assign(invoice, {
        status: 'PAID', paymentMethod: body.paymentMethod,
        transactionCode: body.transactionCode || `TXN-${invoice.id}`
      });
      return ok(invoice);
    }
    return networkError();
  });

  api.patch.mockImplementation((url) => {
    state.calls.push(['PATCH', url]);
    const m = url.match(/^\/visits\/(\d+)\/complete$/);
    if (m) {
      const visit = visitOf(m[1]);
      visit.status = 'COMPLETED';
      return ok(visit);
    }
    return networkError();
  });

  return state;
}

describe('Chu trình khám chữa bệnh theo vai trò (qua API, không còn dữ liệu giả)', () => {
  let backend;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    backend = createFakeBackend();
  });

  const registerAndCheckIn = async () => {
    const patient = await receptionService.createPatientProfile({
      fullName: 'Vũ Đình Trọng', dob: '1985-05-15', gender: 'MALE',
      address: 'Thị trấn Chũ, Huyện Lục Ngạn, Bắc Giang', bloodType: 'O+'
    });
    const queue = await receptionService.getWaitingQueue();
    const appointment = queue.find((q) => q.patientName === 'Vũ Đình Trọng');
    const checkedIn = await receptionService.checkInPatient(appointment);
    return { patient, appointment, checkedIn };
  };

  it('Tiếp đón -> Điều dưỡng -> Bác sĩ + AI -> Hoàn tất -> Nhà thuốc -> Thu viện phí (Lễ tân - Kế toán) -> Báo cáo', async () => {
    // 1. LỄ TÂN: tạo hồ sơ, xem hàng đợi, check-in (tạo ca khám)
    const { patient, appointment, checkedIn } = await registerAndCheckIn();
    expect(patient.fullName).toBe('Vũ Đình Trọng');
    expect(patient.patientCode).toMatch(/^BN-/);
    expect(appointment.ticketNumber).toBe('STT-1');
    expect(appointment.status).toBe('CONFIRMED');
    expect(checkedIn.status).toBe('CHECKED_IN');
    const visitId = checkedIn.visitId;
    expect(visitId).toBeTruthy();
    expect(backend.visits[0]).toMatchObject({ patientId: patient.id, doctorId: 1, appointmentId: 700 });

    // Sau check-in, hàng đợi đánh dấu đã vào phòng khám (dựa trên ca khám thật)
    const queueAfter = await receptionService.getWaitingQueue();
    expect(queueAfter[0].status).toBe('CHECKED_IN');

    // 2. ĐIỀU DƯỠNG: BMI + lưu sinh hiệu dạng đối tượng VitalSignsDto
    expect(nurseService.calculateBmi(68, 172)).toMatchObject({ bmi: 23, category: 'Thừa cân' });
    const vitals = await nurseService.saveVitals(visitId, {
      pulse: 82, bloodPressureSystolic: 135, bloodPressureDiastolic: 85, temperature: 36.6, spO2: 99, weight: 68, height: 172
    });
    expect(vitals.vitalSigns.pulse).toBe(82);
    const nurseQueue = await nurseService.getVitalsQueue();
    expect(nurseQueue).toHaveLength(1);
    expect(nurseQueue[0]).toMatchObject({ visitId, fullName: 'Vũ Đình Trọng', status: 'VITALS_COMPLETED' });
    expect(api.get).toHaveBeenCalledWith('/visits', { params: { size: 100, status: 'IN_PROGRESS' } });

    // 3. BÁC SĨ + AI: gợi ý chẩn đoán, kê đơn, kiểm tra an toàn, chẩn đoán, hoàn tất
    const aiDiag = await aiAlertService.suggestDiagnosis('Huyết áp tăng cao, đau đầu chóng mặt', { visitId });
    expect(aiDiag.source).toBe('server');
    expect(aiDiag.suggestions[0].code).toBe('I10');

    const drugs = (await visitService.getDrugCatalog()).filter((d) => [9, 3].includes(d.id));
    expect(drugs).toHaveLength(2);
    const safety = await aiAlertService.checkPrescriptionSafety(visitId, drugs);
    expect(safety.source).toBe('server');
    expect(safety.has_warning).toBe(false);

    const prescription = await visitService.createPrescription(visitId, {
      items: [
        { drugId: 9, dosage: '5mg', quantity: 30, instruction: 'Uống sáng 1 viên' },
        { drugId: 3, dosage: '81mg', quantity: 30 }
      ]
    });
    expect(prescription.items).toHaveLength(2);
    expect(prescription.estimatedTotalAmount).toBe(30 * 3500 + 30 * 2000);

    await visitService.updateVisit(visitId, { diagnosisCode: 'I10', diagnosisNote: 'Tăng huyết áp vô căn' });
    const completed = await visitService.completeVisit(visitId);
    expect(completed.status).toBe('COMPLETED');
    // hồ sơ đã khóa
    await expect(visitService.updateVisit(visitId, { diagnosisCode: 'I11' })).rejects.toThrow('Ca khám đã hoàn tất');

    // 4. NHÀ THUỐC: cấp phát → máy chủ trừ kho
    const stockBefore = (await pharmacyService.getDrugs()).find((d) => d.code === 'DRUG-AMLO-5').stockQuantity;
    const dispense = await pharmacyService.dispensePrescription(prescription.id);
    expect(dispense.prescriptionId).toBe(prescription.id);
    expect(api.post).toHaveBeenCalledWith(`/prescriptions/${prescription.id}/dispense`, {});
    const stockAfter = (await pharmacyService.getDrugs()).find((d) => d.code === 'DRUG-AMLO-5').stockQuantity;
    expect(stockAfter).toBe(stockBefore - 30);

    // 5. KẾ TOÁN: lập hóa đơn (số tiền do máy chủ tính) và thu qua VietQR
    const invoice = await invoiceService.generateInvoice(visitId);
    expect(api.post).toHaveBeenCalledWith(`/invoices/generate/${visitId}`);
    expect(invoice.totalAmount).toBe(150000 + 105000 + 60000); // = 315.000 đ
    expect(invoice.status).toBe('PENDING');

    const paid = await invoiceService.payInvoice(invoice.id, { paymentMethod: 'VIETQR', transactionCode: ' FT26283123456 ' });
    expect(api.put).toHaveBeenCalledWith(`/invoices/${invoice.id}/pay`, { paymentMethod: 'VIETQR', transactionCode: 'FT26283123456' });
    expect(paid.status).toBe('PAID');
    expect(paid.paymentMethod).toBe('VIETQR');

    // 6. BÁO CÁO: số liệu đọc lại từ máy chủ
    const kpi = await reportService.getKpiSummary();
    expect(kpi.totalPatients).toBe(1);
    expect(kpi.todayRevenue).toBe(315000);
    const revenue = await reportService.getRevenueSummary();
    expect(revenue.vietQrRevenue).toBe(315000);
    expect(revenue.paidInvoicesCount).toBe(1);
  });

  describe('Đường lỗi – không bao giờ báo thành công khi máy chủ chưa ghi nhận', () => {
    it('lễ tân không đủ quyền tạo hồ sơ (403) → lỗi, không có hồ sơ nào được tạo', async () => {
      api.post.mockImplementation(() => backendError(403, undefined));
      await expect(receptionService.createPatientProfile({ fullName: 'Vũ Đình Trọng' }))
        .rejects.toThrow('Bạn không có quyền thực hiện thao tác này.');
      expect(localStorage.length).toBe(0);
    });

    it('mất mạng khi tải hàng đợi → ném lỗi thay vì hiển thị hàng đợi mẫu', async () => {
      api.get.mockImplementation(networkError);
      await expect(receptionService.getWaitingQueue()).rejects.toThrow(/Không kết nối được máy chủ/);
    });

    it('check-in thiếu bác sĩ phụ trách hoặc hồ sơ bệnh nhân → từ chối, không tạo ca khám', async () => {
      await expect(receptionService.checkInPatient({ id: 1, patientId: 5, doctorId: null })).rejects.toThrow(/chưa có bác sĩ phụ trách/);
      await expect(receptionService.checkInPatient({ id: 1, patientId: null, doctorId: 1 })).rejects.toThrow(/chưa gắn với hồ sơ bệnh nhân/);
      await expect(receptionService.checkInPatient(undefined)).rejects.toThrow(/Thiếu thông tin lịch hẹn/);
      expect(backend.visits).toHaveLength(0);
    });

    it('mất mạng khi lưu sinh hiệu → ném lỗi, sinh hiệu trên máy chủ không đổi', async () => {
      const { checkedIn } = await registerAndCheckIn();
      api.put.mockImplementation(networkError);
      await expect(nurseService.saveVitals(checkedIn.visitId, { pulse: 82 })).rejects.toThrow(/CHƯA được lưu/);
      expect(backend.visits[0].vitalSigns).toBeNull();
    });

    it('nhà thuốc không cấp phát được khi ca khám chưa hoàn tất → lỗi nghiệp vụ, kho giữ nguyên', async () => {
      const { checkedIn } = await registerAndCheckIn();
      const prescription = await visitService.createPrescription(checkedIn.visitId, {
        items: [{ drugId: 9, dosage: '5mg', quantity: 30 }]
      });
      await expect(pharmacyService.dispensePrescription(prescription.id)).rejects.toThrow(/Ca khám chưa hoàn tất/);
      expect(backend.drugs.find((d) => d.id === 9).stockQuantity).toBe(1600);
      expect(backend.dispensed.size).toBe(0);
    });

    it('cấp phát lần hai bị máy chủ từ chối, kho chỉ bị trừ một lần', async () => {
      const { checkedIn } = await registerAndCheckIn();
      const prescription = await visitService.createPrescription(checkedIn.visitId, {
        items: [{ drugId: 9, dosage: '5mg', quantity: 30 }]
      });
      await visitService.completeVisit(checkedIn.visitId);
      await pharmacyService.dispensePrescription(prescription.id);
      await expect(pharmacyService.dispensePrescription(prescription.id)).rejects.toThrow(/đã được cấp phát/);
      expect(backend.drugs.find((d) => d.id === 9).stockQuantity).toBe(1570);
    });

    it('không lập được hóa đơn cho ca khám chưa hoàn tất', async () => {
      const { checkedIn } = await registerAndCheckIn();
      await expect(invoiceService.generateInvoice(checkedIn.visitId)).rejects.toThrow(/ca khám đã hoàn tất/);
      expect(backend.invoices).toHaveLength(0);
    });

    it('mất mạng khi thu tiền → hóa đơn vẫn PENDING và báo lỗi rõ ràng', async () => {
      const { checkedIn } = await registerAndCheckIn();
      await visitService.completeVisit(checkedIn.visitId);
      const invoice = await invoiceService.generateInvoice(checkedIn.visitId);

      api.put.mockImplementation(networkError);
      await expect(invoiceService.payInvoice(invoice.id, { paymentMethod: 'CASH', amountReceived: 150000 }))
        .rejects.toThrow(/Không kết nối được máy chủ.*CHƯA được lưu/);
      expect(backend.invoices[0].status).toBe('PENDING');
    });

    it('báo cáo không tải được → ném lỗi, không trả số 0 hay số liệu mẫu', async () => {
      api.get.mockImplementation(networkError);
      await expect(reportService.getKpiSummary()).rejects.toThrow(/Không kết nối được máy chủ/);
      await expect(reportService.getRevenueSummary()).rejects.toThrow(/Không kết nối được máy chủ/);
    });

    it('dịch vụ AI gợi ý chẩn đoán mất kết nối → gợi ý cục bộ được gắn nhãn "local"', async () => {
      api.post.mockImplementation(networkError);
      const res = await aiAlertService.suggestDiagnosis('Huyết áp tăng cao, đau đầu chóng mặt');
      expect(res.source).toBe('local');
      expect(res.suggestions[0].code).toBe('I10');
    });
  });
});
