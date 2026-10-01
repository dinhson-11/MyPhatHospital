import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { aiAlertService, AI_DISCLAIMER_TEXT } from '../services/aiAlertService';
import DrugInteractionAlert from '../components/clinical/DrugInteractionAlert';
import PrescriptionForm from '../components/clinical/PrescriptionForm';
import { ToastProvider } from '../context/ToastContext';

describe('AI Drug Interaction & Allergy Alert Suite (Sprint 5 - FR-11.1, FR-11.2, NFR-8)', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. AI ALERT SERVICE TESTS
  // =========================================================================
  describe('aiAlertService Engine Tests', () => {
    it('should detect critical drug interaction between Aspirin and Warfarin', async () => {
      const drugs = [
        { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg' },
        { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg' }
      ];

      const res = await aiAlertService.checkInteractions(drugs);
      expect(res.has_interaction).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.total_interactions).toBe(1);
      expect(res.interactions[0].severity).toBe('CRITICAL');
      expect(res.interactions[0].description).toContain('xuất huyết');
      expect(res.disclaimer).toContain('tham khảo');
    });

    it('should confirm safe drugs with no interaction', async () => {
      const drugs = [
        { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg' },
        { id: 5, code: 'DRUG-AMOX-500', name: 'Amoxicillin 500mg' }
      ];

      const res = await aiAlertService.checkInteractions(drugs);
      expect(res.has_interaction).toBe(false);
      expect(res.has_critical).toBe(false);
      expect(res.total_interactions).toBe(0);
      expect(res.disclaimer).toBeDefined();
    });

    it('should detect direct match allergy conflict (Penicillin & Amoxicillin)', async () => {
      const allergies = [
        { allergen: 'Penicillin', severity: 'SEVERE', note: 'Sốc phản vệ' }
      ];
      const drugs = [
        { id: 5, code: 'DRUG-AMOX-500', name: 'Amoxicillin 500mg' }
      ];

      const res = await aiAlertService.checkAllergies(allergies, drugs);
      expect(res.has_allergy_conflict).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.total_alerts).toBeGreaterThanOrEqual(1);
      expect(res.alerts[0].reaction_type).toBe('DIRECT_MATCH');
      expect(res.disclaimer).toContain('tham khảo');
    });

    it('should detect cross-reactivity allergy (Penicillin allergy & Ceftriaxone prescription)', async () => {
      const allergies = [
        { allergen: 'Penicillin', severity: 'MODERATE' }
      ];
      const drugs = [
        { id: 12, code: 'DRUG-CEFT-1G', name: 'Ceftriaxone 1g (Lọ tiêm)' }
      ];

      const res = await aiAlertService.checkAllergies(allergies, drugs);
      expect(res.has_allergy_conflict).toBe(true);
      expect(res.alerts[0].reaction_type).toBe('CROSS_REACTIVITY');
      expect(res.alerts[0].severity).toBe('WARNING');
    });

    it('should perform combined safety check with both interactions and allergy conflicts', async () => {
      const allergies = [
        { allergen: 'Aspirin', severity: 'SEVERE' }
      ];
      const drugs = [
        { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg' },
        { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg' }
      ];

      const res = await aiAlertService.checkPrescriptionSafety(null, drugs, allergies);
      expect(res.is_safe).toBe(false);
      expect(res.has_warning).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.interaction_count).toBe(1);
      expect(res.allergy_count).toBe(1);
      expect(res.disclaimer).toBe(AI_DISCLAIMER_TEXT);
    });
  });

  // =========================================================================
  // 2. COMPONENT TESTS: DrugInteractionAlert.jsx
  // =========================================================================
  describe('DrugInteractionAlert Component Tests', () => {
    it('should render nothing when there are no warnings and showSafeStatus is false', () => {
      const { container } = render(
        <DrugInteractionAlert
          interactions={[]}
          allergyAlerts={[]}
          showSafeStatus={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render verified safe badge when showSafeStatus is true and no warnings exist', () => {
      render(
        <DrugInteractionAlert
          interactions={[]}
          allergyAlerts={[]}
          showSafeStatus={true}
        />
      );

      expect(screen.getByTestId('drug-alert-safe')).toBeInTheDocument();
      expect(screen.getByText('Đơn thuốc an toàn')).toBeInTheDocument();
      expect(screen.getByText('AI Verified')).toBeInTheDocument();
    });

    it('should render CRITICAL interaction alert with mechanism, recommendation and mandatory disclaimer', () => {
      const mockInteractions = [
        {
          drug_a_name: 'Aspirin 81mg',
          drug_b_name: 'Warfarin 5mg',
          severity: 'CRITICAL',
          mechanism: 'Cộng hưởng tác dụng chống ngưng tập tiểu cầu và chống đông máu.',
          description: 'Tăng vọt nguy cơ xuất huyết tiêu hóa.',
          recommendation: 'Tránh phối hợp. Giám sát chỉ số INR thường xuyên.'
        }
      ];

      render(
        <DrugInteractionAlert
          interactions={mockInteractions}
          allergyAlerts={[]}
          disclaimer={AI_DISCLAIMER_TEXT}
        />
      );

      // Banner should be present
      expect(screen.getByTestId('drug-interaction-alert-banner')).toBeInTheDocument();
      expect(screen.getByText(/Cảnh báo lâm sàng nguy cơ cao \(CRITICAL\)/i)).toBeInTheDocument();
      expect(screen.getByText('NGHIÊM TRỌNG')).toBeInTheDocument();

      // Drug names and details
      expect(screen.getByText('Aspirin 81mg')).toBeInTheDocument();
      expect(screen.getByText('Warfarin 5mg')).toBeInTheDocument();
      expect(screen.getByText(/Tăng vọt nguy cơ xuất huyết tiêu hóa/i)).toBeInTheDocument();
      expect(screen.getByText(/Tránh phối hợp. Giám sát chỉ số INR thường xuyên/i)).toBeInTheDocument();

      // Mandatory Medical Disclaimer (NFR-8)
      const disclaimerEl = screen.getByTestId('ai-medical-disclaimer');
      expect(disclaimerEl).toBeInTheDocument();
      expect(disclaimerEl.textContent).toContain('không thay thế phán đoán lâm sàng của bác sĩ');
    });

    it('should render allergy alert with direct match / cross-reactivity and recommendation', () => {
      const mockAllergies = [
        {
          drug_name: 'Amoxicillin 500mg',
          allergen: 'Penicillin',
          reaction_type: 'DIRECT_MATCH',
          severity: 'CRITICAL',
          description: 'Tiền sử sốc phản vệ với kháng sinh nhóm Penicillin.',
          recommendation: 'Chống chỉ định tuyệt đối, đổi sang nhóm Macrolide.'
        }
      ];

      render(
        <DrugInteractionAlert
          interactions={[]}
          allergyAlerts={mockAllergies}
        />
      );

      expect(screen.getByText(/Xung đột tiền sử dị ứng bệnh nhân/i)).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText('DỊ ỨNG TRỰC TIẾP')).toBeInTheDocument();
      expect(screen.getByText(/Tiền sử sốc phản vệ/i)).toBeInTheDocument();
      expect(screen.getByText(/Chống chỉ định tuyệt đối/i)).toBeInTheDocument();
    });

    it('should toggle collapse/expand when clicking the button', () => {
      const mockInteractions = [
        {
          drug_a_name: 'Aspirin 81mg',
          drug_b_name: 'Warfarin 5mg',
          severity: 'CRITICAL',
          description: 'Nguy cơ xuất huyết.'
        }
      ];

      render(
        <DrugInteractionAlert
          interactions={mockInteractions}
          allergyAlerts={[]}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /Thu gọn/i });
      expect(toggleBtn).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('interaction-item-0')).toBeNull();

      // Click to expand again
      const expandBtn = screen.getByRole('button', { name: /Chi tiết/i });
      fireEvent.click(expandBtn);
      expect(screen.getByTestId('interaction-item-0')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. INTEGRATION TESTS: PrescriptionForm + AI Alert
  // =========================================================================
  describe('PrescriptionForm Integration with AI Alerts', () => {
    const mockVisit = {
      id: 50,
      patient: {
        id: 10,
        fullName: 'Nguyễn Văn A',
        allergies: [
          { allergen: 'Penicillin', severity: 'SEVERE' }
        ]
      },
      prescriptions: []
    };

    it('should render prescription form with AI safety check button', () => {
      render(
        <ToastProvider>
          <PrescriptionForm visit={mockVisit} />
        </ToastProvider>
      );

      expect(screen.getByText('Kê đơn thuốc điện tử')).toBeInTheDocument();
      expect(screen.getByText(/Kiểm tra an toàn \(AI\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Thêm loại thuốc/i)).toBeInTheDocument();
    });

    it('should trigger AI safety check when clicking manual check button', async () => {
      render(
        <ToastProvider>
          <PrescriptionForm visit={mockVisit} />
        </ToastProvider>
      );

      // Select Aspirin for row 1
      const selectElements = screen.getAllByRole('combobox');
      fireEvent.change(selectElements[0], { target: { value: '3' } }); // Aspirin

      const checkBtn = screen.getByText(/Kiểm tra an toàn \(AI\)/i);
      fireEvent.click(checkBtn);

      await waitFor(() => {
        // Safe status or alert should be shown
        const alertOrSafe = screen.queryByTestId('drug-alert-safe') || screen.queryByTestId('drug-interaction-alert-banner');
        expect(alertOrSafe).toBeInTheDocument();
      });
    });
  });

});
