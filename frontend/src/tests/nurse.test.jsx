import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { nurseService } from '../services/nurseService';
import { NurseStationModal } from '../components/nurse/NurseStationModal';
import { ToastProvider } from '../context/ToastContext';

describe('Nurse & Lab Station Module Suite (Sprint 9 - NURSE Role)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('nurseService Unit Tests', () => {
    it('tính toán chỉ số BMI và phân loại thể trạng chính xác', () => {
      // 1. Bình thường: 60kg, 165cm -> BMI = 60 / (1.65^2) = 22.04
      const normal = nurseService.calculateBmi(60, 165);
      expect(normal.bmi).toBe(22.0);
      expect(normal.category).toBe('Bình thường');

      // 2. Gầy: 45kg, 170cm -> BMI = 45 / 2.89 = 15.57
      const underweight = nurseService.calculateBmi(45, 170);
      expect(underweight.bmi).toBe(15.6);
      expect(underweight.category).toBe('Gầy (Thiếu cân)');

      // 3. Thừa cân: 70kg, 165cm -> BMI = 70 / 2.7225 = 25.71
      const overweight = nurseService.calculateBmi(70, 165);
      expect(overweight.bmi).toBe(25.7);
      expect(overweight.category).toBe('Béo phì');

      // 4. Béo phì độ 1: 85kg, 165cm -> BMI = 85 / 2.7225 = 31.22
      const obese = nurseService.calculateBmi(85, 165);
      expect(obese.bmi).toBe(31.2);
      expect(obese.category).toBe('Béo phì độ I');

      // 5. Chiều cao/cân nặng không hợp lệ -> trả null
      const invalid = nurseService.calculateBmi(0, 165);
      expect(invalid).toBeNull();
    });

    it('lưu số liệu sinh hiệu bệnh nhân thành công', async () => {
      const visitId = 101;
      const vitalsData = {
        pulse: 78,
        bloodPressure: '120/80',
        temperature: 36.8,
        spO2: 98,
        respiratoryRate: 18,
        heightCm: 168,
        weightKg: 62,
        notes: 'Bệnh nhân tỉnh táo, tiếp xúc tốt'
      };

      const result = await nurseService.saveVitals(visitId, vitalsData);
      expect(result).toBeDefined();
      expect(result.visitId).toBe(visitId);
      expect(result.pulse).toBe(78);
      expect(result.bmi).toBe(22.0);
      expect(result.bmiCategory).toBe('Bình thường');

      // Lấy lại sinh hiệu
      const saved = await nurseService.getVitalsByVisit(visitId);
      expect(saved).toBeDefined();
      expect(saved.bloodPressure).toBe('120/80');
    });

    it('lấy danh sách chỉ định cận lâm sàng chờ xét nghiệm', async () => {
      const pendingLabs = await nurseService.getPendingLabOrders();
      expect(pendingLabs).toBeDefined();
      expect(Array.isArray(pendingLabs)).toBe(true);
      expect(pendingLabs.length).toBeGreaterThan(0);
      expect(pendingLabs[0]).toHaveProperty('testName');
      expect(pendingLabs[0]).toHaveProperty('status');
    });

    it('nhập và hoàn tất kết quả xét nghiệm phòng Lab', async () => {
      const labs = await nurseService.getPendingLabOrders();
      const labToSubmit = labs[0];

      const labData = {
        resultSummary: 'Các chỉ số sinh hóa máu trong giới hạn bình thường',
        detailedResult: 'Glucose: 5.2 mmol/L, Ure: 4.8 mmol/L, Creatinin: 75 umol/L',
        performedBy: 'KTV. Đỗ Văn Bình',
        normalRange: 'Tham chiếu tiêu chuẩn'
      };

      const result = await nurseService.submitLabResult(labToSubmit.id, labData);
      expect(result).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.resultSummary).toBe(labData.resultSummary);
    });
  });

  describe('NurseStationModal Component Tests', () => {
    it('render modal trạm điều dưỡng hiển thị 2 tab nghiệp vụ', async () => {
      render(
        <ToastProvider>
          <NurseStationModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText(/Trạm Điều Dưỡng & Phòng Xét Nghiệm/i)).toBeInTheDocument();
      expect(screen.getByText(/Đo Sinh Hiệu Khám Bệnh/i)).toBeInTheDocument();
      expect(screen.getByText(/Kết Quả Cận Lâm Sàng & Lab/i)).toBeInTheDocument();
    });

    it('tính toán và hiển thị BMI tự động khi nhập chiều cao và cân nặng', async () => {
      render(
        <ToastProvider>
          <NurseStationModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      // Chọn bệnh nhân đầu tiên
      const patientCard = screen.getByText('Trần Đức Minh');
      fireEvent.click(patientCard);

      // Điền chiều cao 170cm, cân nặng 65kg
      const heightInput = document.getElementById('heightInput');
      const weightInput = document.getElementById('weightInput');

      fireEvent.change(heightInput, { target: { value: '170' } });
      fireEvent.change(weightInput, { target: { value: '65' } });

      await waitFor(() => {
        expect(screen.getByText(/BMI: 22.5 \(Bình thường\)/i)).toBeInTheDocument();
      });
    });

    it('chuyển sang tab Kết Quả Cận Lâm Sàng & Lab', async () => {
      render(
        <ToastProvider>
          <NurseStationModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      const labTab = screen.getByText(/Kết Quả Cận Lâm Sàng & Lab/i);
      fireEvent.click(labTab);

      await waitFor(() => {
        expect(screen.getByText(/Chỉ Định Cận Lâm Sàng Chờ Trả Kết Quả/i)).toBeInTheDocument();
        expect(screen.getByText(/Nhập Kết Quả Xét Nghiệm & Đánh Giá/i)).toBeInTheDocument();
      });
    });
  });
});
