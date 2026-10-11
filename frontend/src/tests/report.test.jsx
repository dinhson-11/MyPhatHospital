import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import apiClient from '../services/api';
import {
  reportService,
  getMethodBreakdown,
  getPayerSplit,
  getReportRange,
  formatPercent
} from '../services/reportService';
import StatisticsDashboardModal from '../components/reporting/StatisticsDashboardModal';
import WorkspaceDashboard from '../components/workspace/WorkspaceDashboard';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

// Hermetic: không gọi backend thật – từng test tự quy định phản hồi của API
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: 'http://localhost:8080/api/v1'
}));

const ok = (data) => Promise.resolve({ success: true, data });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const forbidden = () => Promise.reject(Object.assign(new Error('Request failed with status code 403'), { response: { status: 403, data: {} } }));

const KPI = {
  totalPatients: 1520,
  todayAppointments: 12,
  todayVisits: 9,
  todayRevenue: '3500000.00',
  activeStaffCount: 30,
  lowStockDrugsCount: 0,
  aiAlertsCount: 41
};

// Tổng chi phí 1.000.000 = BHYT 400.000 + người bệnh 600.000; người bệnh trả: tiền mặt 300k, VietQR 150k, CK 90k, thẻ 60k
const REVENUE = {
  totalRevenue: '1000000.00',
  insuranceAmount: '400000.00',
  patientCollected: '600000.00',
  totalInvoices: 6,
  paidInvoicesCount: 4,
  pendingInvoicesCount: 2,
  refundedInvoicesCount: 1,
  refundedAmount: '50000.00',
  cashRevenue: '300000.00',
  vietQrRevenue: '150000.00',
  bankTransferRevenue: '90000.00',
  cardRevenue: '60000.00',
  dailyRevenues: [
    { date: '2026-10-09', amount: '400000.00', invoiceCount: 2 },
    { date: '2026-10-10', amount: '600000.00', invoiceCount: 2 }
  ]
};

const VISITS = {
  totalVisits: 7,
  completedVisits: 5,
  inProgressVisits: 2,
  waitingVisits: 3,
  cancelledAppointments: 1,
  dailyStats: [
    { date: '2026-10-09', total: 3, completed: 2 },
    { date: '2026-10-10', total: 4, completed: 3 }
  ]
};

const DIAGNOSES = [
  { icd10Code: 'I10', diseaseName: 'Tăng huyết áp vô căn', count: 6, percentage: 60.0 },
  { icd10Code: 'J06', diseaseName: 'Nhiễm khuẩn hô hấp trên cấp', count: 4, percentage: 40.0 }
];

/** Định tuyến GET theo URL; overrides: { [url]: () => Promise } */
function mockApi(overrides = {}) {
  apiClient.get.mockImplementation((url) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/reports/kpi-summary') return ok(KPI);
    if (url === '/reports/revenue') return ok(REVENUE);
    if (url === '/reports/visits-summary') return ok(VISITS);
    if (url === '/reports/top-diagnoses') return ok(DIAGNOSES);
    if (url === '/appointments') return ok({ content: [] });
    return networkError();
  });
}

const loginAs = (roles) => {
  localStorage.setItem('hms_token', 'jwt_test_token');
  localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'tester', fullName: 'Người Kiểm Thử', roles }));
};

const renderWithProviders = (ui) =>
  render(
    <AuthProvider>
      <ToastProvider>{ui}</ToastProvider>
    </AuthProvider>
  );

const calledUrls = () => apiClient.get.mock.calls.map(([url]) => url);

describe('Báo cáo & thống kê – chỉ dùng số liệu thật', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.get.mockReset();
  });

  describe('reportService', () => {
    it('chuẩn hóa KPI (BigDecimal dạng chuỗi → số, thiếu → null)', async () => {
      mockApi({ '/reports/kpi-summary': () => ok({ totalPatients: 10, todayRevenue: '2500000.50' }) });
      const kpi = await reportService.getKpiSummary();
      expect(kpi.totalPatients).toBe(10);
      expect(kpi.todayRevenue).toBe(2500000.5);
      expect(kpi.aiAlertsCount).toBeNull();
      expect(kpi.todayVisits).toBeNull();
    });

    it('truyền khoảng thời gian from/to và chuẩn hóa các trường doanh thu mới', async () => {
      mockApi();
      const rev = await reportService.getRevenueSummary('2026-10-04', '2026-10-10');
      expect(apiClient.get).toHaveBeenCalledWith('/reports/revenue', { params: { from: '2026-10-04', to: '2026-10-10' } });
      expect(rev.totalRevenue).toBe(1000000);
      expect(rev.insuranceAmount).toBe(400000);
      expect(rev.patientCollected).toBe(600000);
      expect(rev.refundedInvoicesCount).toBe(1);
      expect(rev.refundedAmount).toBe(50000);
      expect(rev.methods).toEqual({ CASH: 300000, VIETQR: 150000, BANK_TRANSFER: 90000, CARD: 60000 });
      expect(rev.dailyRevenues[1]).toEqual({ date: '2026-10-10', amount: 600000, invoiceCount: 2 });
    });

    it('mất kết nối → ném lỗi tiếng Việt, KHÔNG trả dữ liệu giả', async () => {
      mockApi({
        '/reports/kpi-summary': networkError,
        '/reports/revenue': networkError,
        '/reports/visits-summary': networkError,
        '/reports/top-diagnoses': networkError
      });
      await expect(reportService.getKpiSummary()).rejects.toThrow(/Không kết nối được máy chủ/);
      await expect(reportService.getRevenueSummary()).rejects.toThrow(/Không kết nối được máy chủ/);
      await expect(reportService.getVisitsSummary()).rejects.toThrow(/Không kết nối được máy chủ/);
      await expect(reportService.getTopDiagnoses(5)).rejects.toThrow(/Không kết nối được máy chủ/);
    });

    it('403 → thông báo không có quyền', async () => {
      mockApi({ '/reports/kpi-summary': forbidden });
      await expect(reportService.getKpiSummary()).rejects.toThrow('Bạn không có quyền thực hiện thao tác này.');
    });

    it('tỷ lệ theo phương thức dùng mẫu số là tiền thực thu từ người bệnh (patientCollected)', async () => {
      mockApi();
      const rev = await reportService.getRevenueSummary();
      const byMethod = Object.fromEntries(getMethodBreakdown(rev).map((m) => [m.method, m]));
      expect(byMethod.CASH.percent).toBeCloseTo(50);
      expect(byMethod.VIETQR.percent).toBeCloseTo(25);
      expect(byMethod.BANK_TRANSFER.percent).toBeCloseTo(15);
      expect(byMethod.CARD.percent).toBeCloseTo(10);
      expect(byMethod.CARD.label).toMatch(/Thẻ/);
      expect(byMethod.BANK_TRANSFER.label).toBe('Chuyển khoản');

      const split = getPayerSplit(rev);
      expect(split.insurancePercent).toBeCloseTo(40);
      expect(split.patientPercent).toBeCloseTo(60);
    });

    it('không có thực thu → tỷ lệ "—" thay vì chia cho 0', () => {
      const breakdown = getMethodBreakdown({ patientCollected: 0, methods: { CASH: 0, VIETQR: 0, BANK_TRANSFER: 0, CARD: 0 } });
      expect(breakdown.every((m) => m.percent === null)).toBe(true);
      expect(formatPercent(null)).toBe('—');
    });

    it('tính khoảng thời gian báo cáo theo giờ máy', () => {
      const today = new Date(2026, 9, 10);
      expect(getReportRange('7days', today)).toEqual({ from: '2026-10-04', to: '2026-10-10' });
      expect(getReportRange('30days', today)).toEqual({ from: '2026-09-11', to: '2026-10-10' });
      expect(getReportRange('this_month', today)).toEqual({ from: '2026-10-01', to: '2026-10-10' });
    });
  });

  describe('StatisticsDashboardModal', () => {
    it('quản trị viên: hộp thoại có tên, KPI lấy từ API và định dạng tiền tệ thống nhất', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      const dialog = screen.getByRole('dialog', { name: /Báo cáo & thống kê bệnh viện/i });
      expect(within(dialog).getAllByRole('tab')).toHaveLength(4);
      expect(await within(dialog).findByText('1.520')).toBeInTheDocument();
      expect(within(dialog).getByText('3.500.000 đ')).toBeInTheDocument();
      // Không còn số liệu bịa sẵn
      expect(within(dialog).queryByText(/28\.450\.000/)).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/\+12 bệnh nhân mới/)).not.toBeInTheDocument();
    });

    it('lỗi tải → hiển thị trạng thái lỗi và nút Thử lại tải lại được', async () => {
      loginAs(['ADMIN']);
      let fail = true;
      mockApi({ '/reports/kpi-summary': () => (fail ? networkError() : ok(KPI)) });
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      const alert = await screen.findByText(/Không kết nối được máy chủ/);
      expect(alert).toBeInTheDocument();
      fail = false;
      fireEvent.click(screen.getAllByRole('button', { name: /Thử lại/i })[0]);
      expect(await screen.findByText('1.520')).toBeInTheDocument();
    });

    it('tab doanh thu: đủ 4 phương thức, BHYT vs người bệnh, hoàn tiền, ngày dd/MM/yyyy', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      fireEvent.click(screen.getByRole('tab', { name: /Doanh thu & viện phí/i }));
      const panel = screen.getByRole('tabpanel');
      expect(await within(panel).findByText('Tiền mặt')).toBeInTheDocument();
      expect(within(panel).getByText('VietQR')).toBeInTheDocument();
      expect(within(panel).getByText('Chuyển khoản')).toBeInTheDocument();
      expect(within(panel).getByText(/Thẻ ngân hàng/)).toBeInTheDocument();
      expect(within(panel).getByText('50%')).toBeInTheDocument(); // 300k / 600k thực thu
      expect(within(panel).getAllByText('BHYT chi trả').length).toBeGreaterThanOrEqual(2); // thẻ KPI + chú thích nguồn chi trả
      expect(within(panel).getByText('Người bệnh thanh toán')).toBeInTheDocument();
      expect(within(panel).getByText('40%')).toBeInTheDocument(); // BHYT 400k / 1.000k
      expect(within(panel).getByText('50.000 đ')).toBeInTheDocument(); // đã hoàn tiền
      expect(within(panel).getByText('10/10/2026')).toBeInTheDocument();
    });

    it('tab lượt khám hiển thị bảng theo ngày với tỷ lệ hoàn thành', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      fireEvent.click(screen.getByRole('tab', { name: /Lượt khám/i }));
      expect(await screen.findByText('Chi tiết lượt khám theo ngày')).toBeInTheDocument();
      expect(screen.getByText('09/10/2026')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument(); // 3/4
    });

    it('tab mô hình bệnh hiển thị mã ICD-10', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      fireEvent.click(screen.getByRole('tab', { name: /Mô hình bệnh/i }));
      expect(await screen.findByText('Bảng mã bệnh ICD-10 thường gặp')).toBeInTheDocument();
      expect(await screen.findByText('I10')).toBeInTheDocument();
    });

    it('đổi khoảng thời gian → tải lại với from/to mới', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);
      await screen.findByText('1.520');

      fireEvent.change(screen.getByLabelText('Khoảng thời gian'), { target: { value: 'this_month' } });
      const { from, to } = getReportRange('this_month');
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/reports/revenue', { params: { from, to } });
      });
    });

    it('lễ tân - kế toán: chỉ thấy tab doanh thu và không gọi API chỉ dành cho quản trị', async () => {
      loginAs(['RECEPTIONIST']);
      mockApi();
      renderWithProviders(<StatisticsDashboardModal isOpen onClose={() => {}} />);

      expect(screen.getAllByRole('tab')).toHaveLength(1);
      expect(screen.getByRole('tab', { name: /Doanh thu/i })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('1.000.000 đ')).toBeInTheDocument();
      expect(calledUrls()).not.toContain('/reports/kpi-summary');
      expect(calledUrls()).not.toContain('/reports/visits-summary');
      expect(calledUrls()).not.toContain('/reports/top-diagnoses');
    });
  });

  describe('WorkspaceDashboard', () => {
    it('quản trị viên: hiện khung chờ rồi số liệu thật, không còn xu hướng bịa', async () => {
      loginAs(['ADMIN']);
      mockApi();
      renderWithProviders(<WorkspaceDashboard />);

      expect(screen.getByLabelText('Đang tải số liệu')).toBeInTheDocument();
      expect(await screen.findByText('1.520')).toBeInTheDocument();
      expect(screen.getByText('1.000.000 đ')).toBeInTheDocument(); // doanh thu hôm nay từ báo cáo doanh thu
      expect(screen.queryByText('+12.4%')).not.toBeInTheDocument();
      expect(screen.queryByText(/VietQR chiếm 62%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/HMS-AI/)).not.toBeInTheDocument();
      expect(screen.queryByText(/BI Report/)).not.toBeInTheDocument();
    });

    it('API lỗi → trạng thái lỗi + Thử lại, không hiển thị số liệu mặc định', async () => {
      loginAs(['ADMIN']);
      mockApi({ '/reports/kpi-summary': networkError, '/reports/top-diagnoses': networkError });
      renderWithProviders(<WorkspaceDashboard />);

      expect((await screen.findAllByRole('button', { name: /Thử lại/i })).length).toBeGreaterThan(0);
      expect(screen.queryByText('1.284')).not.toBeInTheDocument();
      expect(screen.queryByText(/28\.450\.000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Đang nạp/)).not.toBeInTheDocument();
    });

    it('mô hình bệnh rỗng → trạng thái trống thay vì "Đang nạp…" mãi mãi', async () => {
      loginAs(['DOCTOR']);
      mockApi({ '/reports/top-diagnoses': () => ok([]) });
      renderWithProviders(<WorkspaceDashboard />);
      expect(await screen.findByText('Chưa có dữ liệu chẩn đoán')).toBeInTheDocument();
    });

    it('lễ tân - kế toán: chỉ gọi API doanh thu, không gọi các API báo cáo dành riêng cho quản trị/bác sĩ', async () => {
      loginAs(['RECEPTIONIST']);
      mockApi();
      renderWithProviders(<WorkspaceDashboard onOpenReception={() => {}} onOpenSchedule={() => {}} />);
      expect(await screen.findByText('Chưa có bệnh nhân trong hàng đợi')).toBeInTheDocument();
      expect(calledUrls()).toContain('/reports/revenue');
      expect(calledUrls()).not.toContain('/reports/kpi-summary');
      expect(calledUrls()).not.toContain('/reports/visits-summary');
      expect(calledUrls()).not.toContain('/reports/top-diagnoses');
    });

    it('bác sĩ: không gọi API doanh thu (chỉ quản trị và lễ tân - kế toán có quyền)', async () => {
      loginAs(['DOCTOR']);
      mockApi();
      renderWithProviders(<WorkspaceDashboard onOpenSchedule={() => {}} />);
      await waitFor(() => expect(calledUrls()).toContain('/reports/top-diagnoses'));
      expect(calledUrls()).not.toContain('/reports/revenue');
    });
  });
});
