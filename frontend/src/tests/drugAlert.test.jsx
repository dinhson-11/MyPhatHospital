import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import { aiAlertService, getBlockingFindings, AI_DISCLAIMER_TEXT } from '../services/aiAlertService';
import visitService from '../services/visitService';
import DrugInteractionAlert from '../components/clinical/DrugInteractionAlert';
import PrescriptionForm from '../components/clinical/PrescriptionForm';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../components/common/ConfirmDialog';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR', details = []) =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message, details } }
  }));

const ASPIRIN = { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg' };
const WARFARIN = { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg' };
const PARACETAMOL = { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg' };
const AMOXICILLIN = { id: 5, code: 'DRUG-AMOX-500', name: 'Amoxicillin 500mg' };
const CEFTRIAXONE = { id: 12, code: 'DRUG-CEFT-1G', name: 'Ceftriaxone 1g (Lọ tiêm)' };

const serverInteraction = {
  drug_a_name: 'Aspirin 81mg',
  drug_b_name: 'Warfarin 5mg',
  severity: 'CRITICAL',
  mechanism: 'Cộng hưởng tác dụng chống đông.',
  description: 'Tăng nguy cơ xuất huyết tiêu hóa.',
  recommendation: 'Tránh phối hợp. Giám sát INR.'
};

describe('AI Drug Interaction & Allergy Alert Suite (Sprint 5 - FR-11.1, FR-11.2, NFR-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    visitService.clearDrugCatalogCache();
    // Mặc định: AI/máy chủ không phản hồi → dịch vụ phải rơi về quy tắc cục bộ và nói rõ nguồn
    api.get.mockImplementation(networkError);
    api.post.mockImplementation(networkError);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. AI ALERT SERVICE
  // =========================================================================
  describe('aiAlertService – kết quả từ máy chủ', () => {
    it('kiểm tra tương tác: gửi danh sách thuốc chuẩn hóa và trả nguyên kết quả máy chủ', async () => {
      const serverResult = {
        has_interaction: true, has_critical: true, total_interactions: 1,
        interactions: [serverInteraction], disclaimer: AI_DISCLAIMER_TEXT
      };
      api.post.mockReturnValue(ok(serverResult));

      const res = await aiAlertService.checkInteractions([ASPIRIN, { drugId: 4, drugName: 'Warfarin 5mg', code: 'DRUG-WAR-5' }]);

      expect(api.post).toHaveBeenCalledWith('/ai/clinical/check-interaction', {
        drugs: [
          { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg' },
          { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg' }
        ]
      });
      expect(res).toEqual(serverResult);
      expect(res.source).toBeUndefined();
    });

    it('dưới 2 thuốc: không cần gọi máy chủ và không có tương tác', async () => {
      const res = await aiAlertService.checkInteractions([ASPIRIN]);
      expect(api.post).not.toHaveBeenCalled();
      expect(res).toMatchObject({ has_interaction: false, has_critical: false, total_interactions: 0, interactions: [] });
      expect(res.disclaimer).toBe(AI_DISCLAIMER_TEXT);
    });

    it('kiểm tra dị ứng: chỉ gửi các trường backend hiểu và chấp nhận dị ứng dạng chuỗi', async () => {
      api.post.mockReturnValue(ok({ has_allergy_conflict: false, has_critical: false, total_alerts: 0, alerts: [], disclaimer: AI_DISCLAIMER_TEXT }));

      await aiAlertService.checkAllergies(
        [{ id: 7, allergen: 'Penicillin', severity: 'SEVERE', note: 'Sốc phản vệ', createdAt: 'x' }, 'Sulfa', { allergen: '' }],
        [AMOXICILLIN]
      );

      expect(api.post).toHaveBeenCalledWith('/ai/clinical/check-allergy', {
        patient_allergies: [
          { id: 7, allergen: 'Penicillin', severity: 'SEVERE', note: 'Sốc phản vệ' },
          { allergen: 'Sulfa' }
        ],
        drugs: [{ id: 5, name: 'Amoxicillin 500mg' }]
      });
    });

    it('kiểm tra tổng thể theo ca khám: dùng endpoint của ca khám và tính lại has_critical theo bộ từ vựng chung', async () => {
      api.post.mockReturnValue(ok({
        is_safe: false,
        interactions: [{ ...serverInteraction, severity: 'SEVERE' }],
        allergy_alerts: [],
        disclaimer: AI_DISCLAIMER_TEXT
      }));

      const res = await aiAlertService.checkPrescriptionSafety(50, [ASPIRIN, WARFARIN], []);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/ai/clinical/visits/50/check-safety', [
        { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg', dosage: undefined },
        { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg', dosage: undefined }
      ]);
      expect(res.source).toBe('server');
      expect(res.has_critical).toBe(true);
      expect(res.has_warning).toBe(true);
      expect(res.interaction_count).toBe(1);
      expect(res.allergy_count).toBe(0);
    });

    it('kiểm tra tổng thể độc lập (chưa có ca khám): gửi kèm dị ứng của bệnh nhân', async () => {
      api.post.mockReturnValue(ok({ is_safe: true, interactions: [], allergy_alerts: [], disclaimer: AI_DISCLAIMER_TEXT }));

      const res = await aiAlertService.checkPrescriptionSafety(null, [PARACETAMOL], [{ allergen: 'Penicillin', severity: 'SEVERE' }]);

      expect(api.post).toHaveBeenCalledWith('/ai/clinical/check-safety', {
        drugs: [{ id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', dosage: undefined }],
        patient_allergies: [{ id: undefined, allergen: 'Penicillin', severity: 'SEVERE', note: undefined }]
      });
      expect(res.source).toBe('server');
      expect(res.has_warning).toBe(false);
      expect(res.has_critical).toBe(false);
    });

    it('không có thuốc nào: trả kết quả an toàn mà không gọi máy chủ', async () => {
      const res = await aiAlertService.checkPrescriptionSafety(50, [], []);
      expect(api.post).not.toHaveBeenCalled();
      expect(res).toMatchObject({ is_safe: true, has_warning: false, has_critical: false, interaction_count: 0, allergy_count: 0 });
      expect(res.disclaimer).toBe(AI_DISCLAIMER_TEXT);
    });
  });

  describe('aiAlertService – dịch vụ AI không phản hồi (quy tắc cục bộ, luôn gắn nhãn source = local)', () => {
    it('vẫn phát hiện tương tác nghiêm trọng Aspirin + Warfarin', async () => {
      const res = await aiAlertService.checkInteractions([ASPIRIN, WARFARIN]);
      expect(api.post).toHaveBeenCalled();
      expect(res.source).toBe('local');
      expect(res.has_interaction).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.total_interactions).toBe(1);
      expect(res.interactions[0].severity).toBe('CRITICAL');
      expect(res.interactions[0].description).toContain('xuất huyết');
      expect(res.disclaimer).toContain('tham khảo');
    });

    it('cặp thuốc không có quy tắc → không tương tác nhưng vẫn gắn nhãn local', async () => {
      const res = await aiAlertService.checkInteractions([PARACETAMOL, AMOXICILLIN]);
      expect(res.source).toBe('local');
      expect(res.has_interaction).toBe(false);
      expect(res.has_critical).toBe(false);
      expect(res.total_interactions).toBe(0);
      expect(res.disclaimer).toBeDefined();
    });

    it('lỗi 500 từ máy chủ cũng rơi về quy tắc cục bộ', async () => {
      api.post.mockImplementation(() => backendError(500, undefined, 'INTERNAL_ERROR'));
      const res = await aiAlertService.checkInteractions([ASPIRIN, WARFARIN]);
      expect(res.source).toBe('local');
      expect(res.has_critical).toBe(true);
    });

    it('dị ứng trùng trực tiếp (Penicillin & Amoxicillin) → CRITICAL', async () => {
      const res = await aiAlertService.checkAllergies(
        [{ allergen: 'Penicillin', severity: 'SEVERE', note: 'Sốc phản vệ' }],
        [AMOXICILLIN]
      );
      expect(res.source).toBe('local');
      expect(res.has_allergy_conflict).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.total_alerts).toBeGreaterThanOrEqual(1);
      expect(res.alerts[0].reaction_type).toBe('DIRECT_MATCH');
      expect(res.disclaimer).toContain('tham khảo');
    });

    it('dị ứng chéo (dị ứng Penicillin, kê Ceftriaxone) → WARNING, không phải CRITICAL', async () => {
      const res = await aiAlertService.checkAllergies([{ allergen: 'Penicillin', severity: 'MODERATE' }], [CEFTRIAXONE]);
      expect(res.has_allergy_conflict).toBe(true);
      expect(res.alerts[0].reaction_type).toBe('CROSS_REACTIVITY');
      expect(res.alerts[0].severity).toBe('WARNING');
      expect(res.has_critical).toBe(false);
    });

    it('bệnh nhân không có dị ứng → không có xung đột', async () => {
      const res = await aiAlertService.checkAllergies([], [AMOXICILLIN]);
      expect(res.has_allergy_conflict).toBe(false);
      expect(res.total_alerts).toBe(0);
    });

    it('kiểm tra tổng thể kết hợp tương tác và dị ứng; không bao giờ báo an toàn khi có cảnh báo', async () => {
      const res = await aiAlertService.checkPrescriptionSafety(null, [ASPIRIN, WARFARIN], [{ allergen: 'Aspirin', severity: 'SEVERE' }]);
      expect(res.source).toBe('local');
      expect(res.is_safe).toBe(false);
      expect(res.has_warning).toBe(true);
      expect(res.has_critical).toBe(true);
      expect(res.interaction_count).toBe(1);
      expect(res.allergy_count).toBe(1);
      expect(res.disclaimer).toBe(AI_DISCLAIMER_TEXT);
    });

    it('kiểm tra theo ca khám mà máy chủ lỗi → cũng dùng quy tắc cục bộ và gắn nhãn local', async () => {
      const res = await aiAlertService.checkPrescriptionSafety(50, [ASPIRIN, WARFARIN], []);
      expect(res.source).toBe('local');
      expect(res.has_critical).toBe(true);
      expect(res.interaction_count).toBe(1);
    });
  });

  describe('getVisitAuditLogs & getBlockingFindings', () => {
    it('đọc lịch sử phân tích AI của ca khám; không có mã ca khám → mảng rỗng, không gọi API', async () => {
      expect(await aiAlertService.getVisitAuditLogs(null)).toEqual([]);
      expect(api.get).not.toHaveBeenCalled();

      api.get.mockReturnValue(ok([{ id: 1, type: 'SAFETY_CHECK' }]));
      expect(await aiAlertService.getVisitAuditLogs(50)).toEqual([{ id: 1, type: 'SAFETY_CHECK' }]);
      expect(api.get).toHaveBeenCalledWith('/ai/clinical/visits/50/suggestions');
    });

    it('lỗi mạng khi đọc lịch sử → ném lỗi (không trả mảng rỗng gây hiểu nhầm "chưa có bản ghi")', async () => {
      await expect(aiAlertService.getVisitAuditLogs(50)).rejects.toThrow(/Không kết nối được máy chủ/);
    });

    it('chỉ tương tác nghiêm trọng và dị ứng mức SEVERE/MODERATE mới bắt buộc ghi lý do', () => {
      const safety = {
        interactions: [
          { drug_a_name: 'A', drug_b_name: 'B', severity: 'CRITICAL', description: 'Chảy máu' },
          { drug_a_name: 'C', drug_b_name: 'D', severity: 'WARNING' }
        ],
        allergy_alerts: [
          { drug_name: 'Ceftriaxone', allergen: 'Penicillin', severity: 'WARNING' },
          { drug_name: 'Aspirin', allergen: 'Sulfa', severity: 'WARNING' }
        ]
      };
      expect(getBlockingFindings(null)).toEqual([]);
      expect(getBlockingFindings(safety, [])).toHaveLength(1);

      const findings = getBlockingFindings(safety, [{ allergen: 'penicillin', severity: 'MODERATE' }]);
      expect(findings).toHaveLength(2);
      expect(findings[0]).toContain('Tương tác nghiêm trọng: A + B – Chảy máu');
      expect(findings[1]).toContain('Dị ứng: Ceftriaxone');
    });
  });

  // =========================================================================
  // 2. COMPONENT: DrugInteractionAlert.jsx
  // =========================================================================
  describe('DrugInteractionAlert Component Tests', () => {
    it('không render gì khi không có cảnh báo và showSafeStatus = false', () => {
      const { container } = render(<DrugInteractionAlert interactions={[]} allergyAlerts={[]} showSafeStatus={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('hiển thị huy hiệu an toàn khi showSafeStatus = true và không có cảnh báo', () => {
      render(<DrugInteractionAlert interactions={[]} allergyAlerts={[]} showSafeStatus />);
      expect(screen.getByTestId('drug-alert-safe')).toBeInTheDocument();
      expect(screen.getByText('Đơn thuốc an toàn')).toBeInTheDocument();
      expect(screen.getByText('Đã kiểm tra')).toBeInTheDocument();
    });

    it('kết quả từ quy tắc cục bộ được ghi chú rõ là dịch vụ AI không phản hồi', () => {
      render(<DrugInteractionAlert safetyData={{ source: 'local', interactions: [], allergy_alerts: [] }} showSafeStatus />);
      expect(screen.getByText(/Dịch vụ AI không phản hồi – kết quả từ bộ quy tắc cục bộ/)).toBeInTheDocument();
    });

    it('tương tác CRITICAL: hiển thị cơ chế, hậu quả, khuyến cáo và lời tuyên bố miễn trừ bắt buộc', () => {
      render(<DrugInteractionAlert interactions={[serverInteraction]} allergyAlerts={[]} disclaimer={AI_DISCLAIMER_TEXT} />);

      const banner = screen.getByTestId('drug-interaction-alert-banner');
      expect(banner).toHaveAttribute('role', 'alert');
      expect(screen.getByText(/Cảnh báo nguy cơ cao – cần xem xét trước khi kê đơn/)).toBeInTheDocument();
      expect(within(banner).getAllByText('Nghiêm trọng').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Aspirin 81mg')).toBeInTheDocument();
      expect(screen.getByText('Warfarin 5mg')).toBeInTheDocument();
      expect(screen.getByText(/Cộng hưởng tác dụng chống đông/)).toBeInTheDocument();
      expect(screen.getByText(/Tăng nguy cơ xuất huyết tiêu hóa/)).toBeInTheDocument();
      expect(screen.getByText(/Tránh phối hợp. Giám sát INR/)).toBeInTheDocument();

      const disclaimerEl = screen.getByTestId('ai-medical-disclaimer');
      expect(disclaimerEl.textContent).toContain('không thay thế phán đoán lâm sàng của bác sĩ');
    });

    it('cảnh báo dị ứng: tên thuốc, chất gây dị ứng, loại phản ứng và khuyến cáo', () => {
      render(
        <DrugInteractionAlert
          interactions={[]}
          allergyAlerts={[{
            drug_name: 'Amoxicillin 500mg',
            allergen: 'Penicillin',
            reaction_type: 'DIRECT_MATCH',
            severity: 'CRITICAL',
            description: 'Tiền sử sốc phản vệ với kháng sinh nhóm Penicillin.',
            recommendation: 'Chống chỉ định tuyệt đối, đổi sang nhóm Macrolide.'
          }]}
        />
      );

      expect(screen.getByText(/Xung đột tiền sử dị ứng bệnh nhân/)).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText('Dị ứng trực tiếp')).toBeInTheDocument();
      expect(screen.getByText(/Tiền sử sốc phản vệ/)).toBeInTheDocument();
      expect(screen.getByText(/Chống chỉ định tuyệt đối/)).toBeInTheDocument();
    });

    it('cảnh báo mức thận trọng có thể thu gọn / mở rộng', () => {
      render(
        <DrugInteractionAlert
          interactions={[{ drug_a_name: 'Ibuprofen', drug_b_name: 'Aspirin', severity: 'WARNING', description: 'Loét dạ dày.' }]}
          allergyAlerts={[]}
        />
      );
      expect(screen.getByTestId('drug-interaction-alert-banner')).toHaveAttribute('role', 'status');

      fireEvent.click(screen.getByRole('button', { name: /Thu gọn/ }));
      expect(screen.queryByTestId('interaction-item-0')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /Chi tiết/ }));
      expect(screen.getByTestId('interaction-item-0')).toBeInTheDocument();
    });

    it('cảnh báo nghiêm trọng luôn hiển thị chi tiết, không có nút thu gọn', () => {
      render(<DrugInteractionAlert interactions={[serverInteraction]} allergyAlerts={[]} />);
      expect(screen.queryByRole('button', { name: /Thu gọn/ })).toBeNull();
      expect(screen.getByTestId('interaction-item-0')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. INTEGRATION: PrescriptionForm + AI Alert
  // =========================================================================
  describe('PrescriptionForm Integration with AI Alerts', () => {
    const catalog = [
      { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', unit: 'Viên', price: 1500, stockQuantity: 2500, expiryDate: '2099-01-01' },
      { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg', unit: 'Viên', price: 1000, stockQuantity: 800, expiryDate: '2099-01-01' },
      { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg', unit: 'Viên', price: 4000, stockQuantity: 15, expiryDate: '2099-01-01' }
    ];
    const mockVisit = { id: 50, patient: { id: 10, fullName: 'Nguyễn Văn A' }, prescriptions: [] };
    const allergies = [{ allergen: 'Penicillin', severity: 'SEVERE' }];

    const criticalSafety = {
      is_safe: false, has_warning: true, has_critical: true, interaction_count: 1, allergy_count: 0,
      interactions: [serverInteraction], allergy_alerts: [], disclaimer: AI_DISCLAIMER_TEXT
    };
    const safeResult = {
      is_safe: true, has_warning: false, has_critical: false, interaction_count: 0, allergy_count: 0,
      interactions: [], allergy_alerts: [], disclaimer: AI_DISCLAIMER_TEXT
    };

    const renderForm = (props = {}) => render(
      <ToastProvider>
        <ConfirmProvider>
          <PrescriptionForm visit={mockVisit} allergies={allergies} {...props} />
        </ConfirmProvider>
      </ToastProvider>
    );

    const routeApi = ({ safety = safeResult, save } = {}) => {
      api.get.mockImplementation((url) => (url === '/drugs/all' ? ok(catalog) : networkError()));
      api.post.mockImplementation((url, body) => {
        if (url === '/ai/clinical/visits/50/check-safety') return ok(safety);
        if (url === '/visits/50/prescriptions') return save ? save(body) : ok({ id: 900, items: [] });
        return networkError();
      });
    };

    const fillRow = async (index, drugId, dosage = '1 viên/lần', quantity = '10') => {
      await screen.findAllByRole('option', { name: /Aspirin 81mg/ });
      const select = screen.getAllByRole('combobox')[index];
      fireEvent.change(select, { target: { value: String(drugId) } });
      const row = select.closest('li');
      fireEvent.change(within(row).getByLabelText(/Liều dùng/), { target: { value: dosage } });
      fireEvent.change(within(row).getByLabelText(/Số lượng/), { target: { value: quantity } });
    };

    it('hiển thị biểu mẫu kê đơn với nút kiểm tra an toàn và danh mục thuốc tải từ kho', async () => {
      routeApi();
      renderForm();

      expect(screen.getByText('Kê đơn thuốc điện tử')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Kiểm tra an toàn/ })).toBeDisabled(); // chưa chọn thuốc
      expect(screen.getByText(/Thêm loại thuốc/)).toBeInTheDocument();
      expect(await screen.findByRole('option', { name: /Warfarin 5mg \(DRUG-WAR-5\)/ })).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/drugs/all');
    });

    it('không tải được danh mục thuốc → báo lỗi + Thử lại, khóa nút lưu (không dùng danh mục giả)', async () => {
      api.get.mockImplementation(networkError);
      renderForm();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Không kết nối được máy chủ/);
      expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeDisabled();
      expect(screen.queryByRole('option', { name: /Aspirin/ })).not.toBeInTheDocument();

      routeApi();
      fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/ }));
      expect(await screen.findByRole('option', { name: /Aspirin 81mg/ })).toBeInTheDocument();
    });

    it('bấm kiểm tra an toàn thủ công: gọi endpoint theo ca khám và hiển thị cảnh báo nghiêm trọng', async () => {
      routeApi({ safety: criticalSafety });
      renderForm();

      await fillRow(0, 3);
      fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra an toàn/ })); // chờ kiểm tra tự động xong

      expect(await screen.findByTestId('drug-interaction-alert-banner')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith('/ai/clinical/visits/50/check-safety', [
        expect.objectContaining({ id: 3, name: 'Aspirin 81mg' })
      ]);
      expect(await screen.findByText('Phát hiện 1 tương tác thuốc và 0 nguy cơ dị ứng.')).toBeInTheDocument();
      expect(screen.getByTestId('ai-medical-disclaimer')).toBeInTheDocument();
    });

    it('kiểm tra thủ công cho kết quả sạch → hiển thị trạng thái an toàn', async () => {
      routeApi();
      renderForm();

      await fillRow(0, 1);
      fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra an toàn/ })); // chờ kiểm tra tự động xong

      expect(await screen.findByTestId('drug-alert-safe')).toBeInTheDocument();
      expect(await screen.findByText('Không phát hiện tương tác hoặc dị ứng nguy hiểm.')).toBeInTheDocument();
    });

    it('dịch vụ AI không phản hồi: vẫn cảnh báo bằng quy tắc cục bộ và nói rõ nguồn, không báo "an toàn" sai', async () => {
      api.get.mockImplementation((url) => (url === '/drugs/all' ? ok(catalog) : networkError()));
      api.post.mockImplementation(networkError); // mọi endpoint AI đều lỗi
      renderForm();

      await fillRow(0, 3);
      fireEvent.click(screen.getByRole('button', { name: /Thêm loại thuốc/ }));
      await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2));
      await fillRow(1, 4);

      const banner = await screen.findByTestId('drug-interaction-alert-banner');
      expect(banner).toHaveTextContent(/Dịch vụ AI không phản hồi/);
      expect(screen.queryByTestId('drug-alert-safe')).not.toBeInTheDocument();
      expect(within(banner).getByText('Aspirin 81mg')).toBeInTheDocument();
      expect(within(banner).getByText('Warfarin 5mg')).toBeInTheDocument();
    });

    it('lưu đơn khi an toàn: gửi đúng dữ liệu lên máy chủ và báo thành công', async () => {
      const onPrescriptionAdded = vi.fn();
      routeApi({ save: () => ok({ id: 900, items: [{ drugId: 1 }] }) });
      renderForm({ onPrescriptionAdded });

      await fillRow(0, 1, '1 viên/lần', '10');
      await waitFor(() => expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/visits/50/prescriptions', {
        items: [{ drugId: 1, dosage: '1 viên/lần', quantity: 10, instruction: undefined }]
      }));
      expect(await screen.findByText('Đã lưu đơn thuốc điện tử.')).toBeInTheDocument();
      expect(onPrescriptionAdded).toHaveBeenCalledWith({ id: 900, items: [{ drugId: 1 }] });
    });

    it('mất mạng khi lưu đơn: hiển thị lỗi, KHÔNG báo đã lưu, không gọi callback', async () => {
      const onPrescriptionAdded = vi.fn();
      routeApi({ save: networkError });
      renderForm({ onPrescriptionAdded });

      await fillRow(0, 1);
      await waitFor(() => expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      await waitFor(() => expect(screen.getAllByRole('alert').some((a) => /CHƯA được lưu/.test(a.textContent))).toBe(true));
      expect(screen.queryByText(/Đã lưu đơn thuốc/)).not.toBeInTheDocument();
      expect(onPrescriptionAdded).not.toHaveBeenCalled();
    });

    it('đơn chưa hợp lệ bị chặn ngay, không gọi máy chủ', async () => {
      routeApi();
      renderForm();

      await screen.findByRole('option', { name: /Aspirin 81mg/ });
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      expect(await screen.findByText('Chọn thuốc')).toBeInTheDocument();
      expect(screen.getByText('Nhập liều dùng')).toBeInTheDocument();
      expect(screen.getByText('Số lượng là số nguyên ≥ 1')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalledWith('/visits/50/prescriptions', expect.anything());
    });

    it('cảnh báo nghiêm trọng: bắt buộc nhập lý do lâm sàng trước khi lưu, lý do gửi kèm đơn', async () => {
      routeApi({ safety: criticalSafety, save: () => ok({ id: 901, overrideReason: 'Bệnh nhân van tim cơ học cần cả hai thuốc' }) });
      renderForm();

      await fillRow(0, 3);
      await waitFor(() => expect(screen.getByTestId('drug-interaction-alert-banner')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      const dialog = await screen.findByRole('dialog', { name: /cảnh báo an toàn nghiêm trọng/ });
      expect(within(dialog).getByText(/Tương tác nghiêm trọng: Aspirin 81mg \+ Warfarin 5mg/)).toBeInTheDocument();
      const confirmBtn = within(dialog).getByRole('button', { name: 'Vẫn kê đơn' });
      expect(confirmBtn).toBeDisabled();
      expect(api.post).not.toHaveBeenCalledWith('/visits/50/prescriptions', expect.anything());

      fireEvent.change(within(dialog).getByLabelText(/Lý do lâm sàng vẫn kê đơn/), {
        target: { value: 'Bệnh nhân van tim cơ học cần cả hai thuốc' }
      });
      expect(confirmBtn).toBeEnabled();
      fireEvent.click(confirmBtn);

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/visits/50/prescriptions', expect.objectContaining({
        overrideReason: 'Bệnh nhân van tim cơ học cần cả hai thuốc'
      })));
      expect(await screen.findByText('Đã lưu đơn thuốc kèm lý do vượt cảnh báo an toàn.')).toBeInTheDocument();
    });

    it('hủy hộp thoại lý do → đơn thuốc không được lưu', async () => {
      routeApi({ safety: criticalSafety });
      renderForm();

      await fillRow(0, 3);
      await waitFor(() => expect(screen.getByTestId('drug-interaction-alert-banner')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      const dialog = await screen.findByRole('dialog', { name: /cảnh báo an toàn nghiêm trọng/ });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Quay lại sửa đơn' }));

      expect(await screen.findByText('Đơn thuốc chưa được lưu.')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalledWith('/visits/50/prescriptions', expect.anything());
    });

    it('máy chủ chặn đơn (PRESCRIPTION_SAFETY_BLOCK) dù giao diện không thấy cảnh báo → yêu cầu lý do rồi gửi lại', async () => {
      const save = vi.fn()
        .mockImplementationOnce(() => backendError(409, 'Đơn thuốc có tương tác nghiêm trọng', 'PRESCRIPTION_SAFETY_BLOCK', ['Aspirin + Warfarin']))
        .mockImplementationOnce(() => ok({ id: 902, overrideReason: 'Đã cân nhắc nguy cơ và theo dõi INR' }));
      routeApi({ save });
      renderForm();

      await fillRow(0, 1);
      await waitFor(() => expect(screen.getByRole('button', { name: /Lưu đơn thuốc/ })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: /Lưu đơn thuốc/ }));

      const dialog = await screen.findByRole('dialog', { name: /cảnh báo an toàn nghiêm trọng/ });
      expect(within(dialog).getByText('Aspirin + Warfarin')).toBeInTheDocument();
      fireEvent.change(within(dialog).getByLabelText(/Lý do lâm sàng vẫn kê đơn/), { target: { value: 'Đã cân nhắc nguy cơ và theo dõi INR' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Vẫn kê đơn' }));

      await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
      expect(save.mock.calls[1][0]).toMatchObject({ overrideReason: 'Đã cân nhắc nguy cơ và theo dõi INR' });
      expect(await screen.findByText('Đã lưu đơn thuốc kèm lý do vượt cảnh báo an toàn.')).toBeInTheDocument();
    });

    it('chế độ chỉ đọc: không hiển thị biểu mẫu và không tải danh mục thuốc', () => {
      renderForm({ readOnly: true, readOnlyReason: 'Ca khám đã hoàn tất.' });
      expect(screen.getByText('Ca khám đã hoàn tất.')).toBeInTheDocument();
      expect(screen.queryByText('Kê đơn thuốc điện tử')).not.toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
