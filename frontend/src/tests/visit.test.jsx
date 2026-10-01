import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { visitService, SEED_DRUGS, COMMON_ICD10_CODES } from '../services/visitService';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import VisitDashboard from '../components/clinical/VisitDashboard';
import PrescriptionForm from '../components/clinical/PrescriptionForm';
import LabOrderPanel from '../components/clinical/LabOrderPanel';

describe('Clinical Visits, Prescriptions & Lab Orders Suite (Sprint 4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should retrieve list of clinical visits including default seeds', async () => {
    const list = await visitService.getVisits();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].patientName).toBeDefined();
    expect(list[0].status).toBe('IN_PROGRESS');
  });

  it('should successfully create a new clinical visit', async () => {
    const newVisitData = {
      patientId: 10,
      patientName: 'Vũ Thị Minh Hạnh',
      patientPhone: '0977889900',
      patientGender: 'FEMALE',
      doctorId: 1,
      doctorName: 'TS. BS. Nguyễn Văn Hùng',
      chiefComplaint: 'Chóng mặt, xây xẩm mặt mày khi đổi tư thế',
      vitalSigns: {
        pulse: 74,
        bloodPressureSystolic: 110,
        bloodPressureDiastolic: 70,
        temperature: 36.7,
        spO2: 99
      }
    };

    const created = await visitService.createVisit(newVisitData);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.patientName).toBe('Vũ Thị Minh Hạnh');
    expect(created.status).toBe('IN_PROGRESS');
    expect(created.vitalSigns.pulse).toBe(74);

    const list = await visitService.getVisits();
    const found = list.find(v => v.id === created.id);
    expect(found).toBeDefined();
  });

  it('should update clinical diagnosis and vital signs of an active visit', async () => {
    const list = await visitService.getVisits();
    const targetVisit = list[0];

    const updated = await visitService.updateVisit(targetVisit.id, {
      diagnosisCode: 'I10',
      diagnosisNote: 'Tăng huyết áp nguyên phát, điều chỉnh liều thuốc',
      chiefComplaint: 'Tái khám định kỳ huyết áp'
    });

    expect(updated.diagnosisCode).toBe('I10');
    expect(updated.diagnosisNote).toContain('Tăng huyết áp');
    expect(updated.chiefComplaint).toBe('Tái khám định kỳ huyết áp');
  });

  it('should successfully create an electronic prescription with estimated cost calculation', async () => {
    const list = await visitService.getVisits();
    const targetVisit = list[0];

    // Kê đơn 2 loại thuốc: Paracetamol (id 1, price 1500, qty 10) + Amoxicillin (id 5, price 3000, qty 14)
    // Tổng = 15000 + 42000 = 57000
    const prescription = await visitService.createPrescription(targetVisit.id, {
      items: [
        { drugId: 1, dosage: '500mg', quantity: 10, instruction: 'Uống sau ăn khi đau' },
        { drugId: 5, dosage: '500mg', quantity: 14, instruction: 'Uống sáng 1 viên, tối 1 viên sau ăn' }
      ]
    });

    expect(prescription).toBeDefined();
    expect(prescription.items.length).toBe(2);
    expect(prescription.estimatedTotalAmount).toBe(57000);
    expect(prescription.items[0].drugName).toContain('Paracetamol');
  });

  it('should create lab order and subsequently submit lab result', async () => {
    const list = await visitService.getVisits();
    const targetVisit = list[0];

    const newOrder = await visitService.createLabOrder(targetVisit.id, {
      testType: 'Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)'
    });

    expect(newOrder).toBeDefined();
    expect(newOrder.status).toBe('ORDERED');
    expect(newOrder.testType).toContain('CBC');

    const result = await visitService.updateLabResult(newOrder.id, {
      resultText: 'Bạch cầu (WBC): 6.8 K/uL (bình thường), Hồng cầu (RBC): 4.5 M/uL, Huyết sắc tố: 14.2 g/dL.'
    });

    expect(result).toBeDefined();
    expect(result.resultText).toContain('Bạch cầu');

    const updatedVisit = await visitService.getVisitById(targetVisit.id);
    const orderInVisit = updatedVisit.labOrders.find(o => o.id === newOrder.id);
    expect(orderInVisit.status).toBe('RESULTED');
  });

  it('should complete visit and lock from further updates', async () => {
    const list = await visitService.getVisits();
    const targetVisit = list[0];

    const completed = await visitService.completeVisit(targetVisit.id);
    expect(completed.status).toBe('COMPLETED');

    await expect(
      visitService.updateVisit(targetVisit.id, { diagnosisCode: 'I10' })
    ).rejects.toThrow('Ca khám đã hoàn tất');
  });

  it('should detect known severe drug interaction between Aspirin and Warfarin', () => {
    // Drug ID 3: Aspirin, Drug ID 4: Warfarin
    const interactions = visitService.checkDrugInteractions([3, 4]);
    expect(interactions.length).toBe(1);
    expect(interactions[0].severity).toBe('SEVERE');
    expect(interactions[0].description).toContain('xuất huyết');
  });

  it('should render VisitDashboard with patient information, vital signs and tab navigation', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <VisitDashboard isOpen={true} onClose={() => {}} />
        </ToastProvider>
      </AuthProvider>
    );

    // Dashboard title
    expect(await screen.findByText(/Phòng Khám Bác Sĩ/i)).toBeInTheDocument();
    expect(screen.getByText(/Sprint 4 Clinical/i)).toBeInTheDocument();

    // Patient queue & details
    const patientNames = await screen.findAllByText('Trần Đức Minh');
    expect(patientNames.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BN-260928-001/i).length).toBeGreaterThan(0);

    // Vital signs widget
    expect(screen.getByText(/Chỉ số sinh hiệu/i)).toBeInTheDocument();
    expect(screen.getByText(/Mạch \(bpm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/HA Tâm thu/i)).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole('button', { name: /Kê đơn thuốc/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chỉ định Cận lâm sàng/i })).toBeInTheDocument();
  });
});
