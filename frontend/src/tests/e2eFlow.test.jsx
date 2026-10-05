import { describe, it, expect, beforeEach } from 'vitest';
import { receptionService } from '../services/receptionService';
import { nurseService } from '../services/nurseService';
import visitService from '../services/visitService';
import pharmacyService from '../services/pharmacyService';
import invoiceService from '../services/invoiceService';
import { reportService } from '../services/reportService';
import aiAlertService from '../services/aiAlertService';

describe('Hospital End-to-End Workflow Integration Test (Sprint 9 - 7 Roles Flow)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hoàn thành trọn vẹn chu trình khám chữa bệnh 7 vai trò: Tiếp đón -> Điều dưỡng -> Bác sĩ + AI -> Nhà thuốc -> Kế toán -> Báo cáo', async () => {
    // ==========================================
    // BƯỚC 1: LỄ TÂN (RECEPTIONIST) TIẾP ĐÓN & CHECK-IN
    // ==========================================
    const newPatient = await receptionService.createPatientProfile({
      fullName: 'Vũ Đình Trọng',
      phoneNumber: '0912999888',
      dob: '1985-05-15',
      gender: 'MALE',
      identityNumber: '001085009999',
      address: 'Thị trấn Chũ, Huyện Lục Ngạn, Bắc Giang',
      bloodType: 'O+'
    });
    expect(newPatient).toBeDefined();
    expect(newPatient.fullName).toBe('Vũ Đình Trọng');

    const queue = await receptionService.getWaitingQueue();
    const patientInQueue = queue.find((q) => q.patientName === 'Vũ Đình Trọng');
    expect(patientInQueue).toBeDefined();

    const checkedIn = await receptionService.checkInPatient(patientInQueue.id, 'Phòng khám Nội 1 - BS. Hùng');
    expect(checkedIn.status).toBe('CHECKED_IN');

    // Bác sĩ/Lễ tân mở ca khám mới
    const visit = await visitService.createVisit({
      patientId: newPatient.id,
      patientCode: newPatient.patientCode,
      patientName: newPatient.fullName,
      doctorId: 1,
      departmentName: 'Khoa Tim mạch',
      chiefComplaint: 'Huyết áp tăng cao, đau đầu chóng mặt'
    });
    const visitId = visit.id;

    // ==========================================
    // BƯỚC 2: ĐIỀU DƯỠNG (NURSE) ĐO SINH HIỆU & TÍNH BMI
    // ==========================================
    const bmiCalculated = nurseService.calculateBmi(68, 172);
    expect(bmiCalculated.bmi).toBe(23.0);
    expect(bmiCalculated.category).toBe('Tiền béo phì (Thừa cân)');

    const vitalsResult = await nurseService.saveVitals(visitId, {
      pulse: 82,
      bloodPressure: '135/85',
      temperature: 36.6,
      spO2: 99,
      respiratoryRate: 18,
      heightCm: 172,
      weightKg: 68
    });
    expect(vitalsResult.pulse).toBe(82);
    expect(vitalsResult.bmi).toBe(23.0);

    // ==========================================
    // BƯỚC 3: BÁC SĨ (DOCTOR) KHÁM, CHẨN ĐOÁN & KÊ ĐƠN + AI CẢNH BÁO
    // ==========================================
    // Bác sĩ tham vấn AI gợi ý chẩn đoán dựa trên triệu chứng
    const aiDiag = await aiAlertService.suggestDiagnosis('Huyết áp tăng cao, đau đầu chóng mặt');
    expect(aiDiag.suggestions.length).toBeGreaterThan(0);
    expect(aiDiag.suggestions[0].code).toBe('I10');

    // Bác sĩ kê đơn 2 thuốc và kiểm tra tương tác thuốc bằng AI
    const prescriptionDrugs = [
      { id: 9, drugId: 9, code: 'DRUG-AMLO-5', drugCode: 'DRUG-AMLO-5', name: 'Amlodipine 5mg', quantity: 30, price: 3500 },
      { id: 3, drugId: 3, code: 'DRUG-ASP-81', drugCode: 'DRUG-ASP-81', name: 'Aspirin 81mg', quantity: 30, price: 2000 }
    ];

    const aiCheck = await aiAlertService.checkPrescriptionSafety(visitId, prescriptionDrugs);
    expect(aiCheck).toBeDefined();
    expect(aiCheck).toHaveProperty('has_warning');

    // Tạo đơn thuốc
    const prescriptionResult = await visitService.createPrescription(visitId, {
      doctorName: 'BSCKII. Nguyễn Văn Hùng',
      diagnosisCode: 'I10 - Tăng huyết áp vô căn',
      items: prescriptionDrugs
    });
    expect(prescriptionResult).toBeDefined();
    expect(prescriptionResult.items.length).toBe(2);

    // ==========================================
    // BƯỚC 4: NHÀ THUỐC (PHARMACIST) CẤP PHÁT THUỐC & TRỪ KHO
    // ==========================================
    const allDrugsBefore = await pharmacyService.getDrugs();
    const amloDrug = allDrugsBefore.find((d) => d.code === 'DRUG-AMLO-5');
    const amloStockBefore = amloDrug ? amloDrug.stockQuantity : 1600;

    const dispenseRes = await pharmacyService.dispensePrescription(prescriptionResult.id, {
      visitId,
      patientName: 'Vũ Đình Trọng',
      patientCode: newPatient.patientCode,
      items: prescriptionDrugs
    });
    expect(dispenseRes).toBeDefined();
    expect(dispenseRes.prescriptionId).toBe(prescriptionResult.id);

    // Kiểm tra kho đã trừ 30 viên Amlodipine
    const allDrugsAfter = await pharmacyService.getDrugs();
    const amloAfter = allDrugsAfter.find((d) => d.code === 'DRUG-AMLO-5');
    expect(amloAfter.stockQuantity).toBe(amloStockBefore - 30);

    // ==========================================
    // BƯỚC 5: KẾ TOÁN (ACCOUNTANT) SINH HÓA ĐƠN & THU VIỆN PHÍ
    // ==========================================
    const invoice = await invoiceService.generateInvoice(visitId, {
      patientId: 9901,
      patientName: 'Vũ Đình Trọng',
      patientCode: newPatient.patientCode,
      serviceFee: 150000,
      prescriptions: prescriptionDrugs,
      labOrders: []
    });
    expect(invoice).toBeDefined();
    // 150,000 + (30 * 3,500 = 105,000) + (30 * 2,000 = 60,000) = 315,000 VNĐ
    expect(invoice.totalAmount).toBe(315000);
    expect(invoice.status).toBe('PENDING');

    // Thanh toán qua VietQR
    const paidInvoice = await invoiceService.payInvoice(invoice.id, {
      paymentMethod: 'VIETQR',
      method: 'VIETQR',
      notes: 'Bệnh nhân quét mã VietQR ngân hàng BIDV'
    });
    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.paymentMethod).toBe('VIETQR');
    expect(paidInvoice.transactionCode).toMatch(/^TXN-/);

    // ==========================================
    // BƯỚC 6: BÁO CÁO & THỐNG KÊ (ADMIN / ACCOUNTANT)
    // ==========================================
    const kpiSummary = await reportService.getKpiSummary();
    expect(kpiSummary.totalPatients).toBeGreaterThan(0);
    expect(kpiSummary.todayRevenue).toBeGreaterThan(0);

    const revenueSummary = await reportService.getRevenueSummary();
    expect(revenueSummary.vietQrRevenue).toBeGreaterThan(0);
    expect(revenueSummary.paidInvoicesCount).toBeGreaterThan(0);
  });
});
