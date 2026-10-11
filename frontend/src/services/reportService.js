import apiClient from './api';
import { toAppError } from './apiError';
import { PAYMENT_METHOD_LABELS } from '../utils/format';

/**
 * Báo cáo & thống kê – CHỈ dùng số liệu thật từ backend (/api/v1/reports/*).
 * Không còn dữ liệu mẫu / dữ liệu sinh ngẫu nhiên khi lỗi: lỗi được ném ra (AppError, thông điệp tiếng Việt)
 * để màn hình hiển thị trạng thái lỗi + nút thử lại. Giá trị backend không trả về được chuẩn hóa thành null
 * (giao diện hiển thị "—"), không thay bằng 0.
 *
 * Quyền backend: kpi-summary & visits-summary: ADMIN; revenue: ADMIN, RECEPTIONIST (Lễ tân - Kế toán); top-diagnoses: ADMIN, DOCTOR.
 */

/** Phương thức thanh toán theo thứ tự hiển thị, khớp enum PaymentMethod của backend. */
export const PAYMENT_METHODS = ['CASH', 'VIETQR', 'BANK_TRANSFER', 'CARD'];

const METHOD_FIELDS = {
  CASH: 'cashRevenue',
  VIETQR: 'vietQrRevenue',
  BANK_TRANSFER: 'bankTransferRevenue',
  CARD: 'cardRevenue'
};

/** Số từ JSON (BigDecimal có thể về dạng chuỗi) → number; thiếu / không hợp lệ → null. */
export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Khoảng thời gian báo cáo (theo giờ máy, định dạng yyyy-MM-dd): '7days' | '30days' | 'this_month'. */
export function getReportRange(rangeKey = '7days', today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start;
  if (rangeKey === 'this_month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else {
    const days = rangeKey === '30days' ? 30 : 7;
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
  }
  return { from: toISODate(start), to: toISODate(end) };
}

function unwrap(res) {
  // apiClient đã bóc response.data → res = ApiResponse { success, data, message }
  if (res === null || res === undefined || res.data === null || res.data === undefined) {
    const err = new Error('Máy chủ không trả về dữ liệu báo cáo.');
    err.status = null;
    throw err;
  }
  return res.data;
}

function normalizeKpi(d = {}) {
  return {
    totalPatients: toNumberOrNull(d.totalPatients),
    todayAppointments: toNumberOrNull(d.todayAppointments),
    todayVisits: toNumberOrNull(d.todayVisits),
    todayRevenue: toNumberOrNull(d.todayRevenue),
    activeStaffCount: toNumberOrNull(d.activeStaffCount),
    lowStockDrugsCount: toNumberOrNull(d.lowStockDrugsCount),
    aiAlertsCount: toNumberOrNull(d.aiAlertsCount)
  };
}

function normalizeVisits(d = {}) {
  return {
    totalVisits: toNumberOrNull(d.totalVisits),
    completedVisits: toNumberOrNull(d.completedVisits),
    inProgressVisits: toNumberOrNull(d.inProgressVisits),
    waitingVisits: toNumberOrNull(d.waitingVisits),
    cancelledAppointments: toNumberOrNull(d.cancelledAppointments),
    dailyStats: (Array.isArray(d.dailyStats) ? d.dailyStats : []).map((row) => ({
      date: row.date,
      total: toNumberOrNull(row.total) ?? 0,
      completed: toNumberOrNull(row.completed) ?? 0
    }))
  };
}

function normalizeRevenue(d = {}) {
  const methods = {};
  PAYMENT_METHODS.forEach((m) => {
    methods[m] = toNumberOrNull(d[METHOD_FIELDS[m]]);
  });
  return {
    totalRevenue: toNumberOrNull(d.totalRevenue),
    insuranceAmount: toNumberOrNull(d.insuranceAmount),
    patientCollected: toNumberOrNull(d.patientCollected),
    totalInvoices: toNumberOrNull(d.totalInvoices),
    paidInvoicesCount: toNumberOrNull(d.paidInvoicesCount),
    pendingInvoicesCount: toNumberOrNull(d.pendingInvoicesCount),
    refundedInvoicesCount: toNumberOrNull(d.refundedInvoicesCount),
    refundedAmount: toNumberOrNull(d.refundedAmount),
    cashRevenue: methods.CASH,
    vietQrRevenue: methods.VIETQR,
    bankTransferRevenue: methods.BANK_TRANSFER,
    cardRevenue: methods.CARD,
    methods,
    dailyRevenues: (Array.isArray(d.dailyRevenues) ? d.dailyRevenues : []).map((row) => ({
      date: row.date,
      amount: toNumberOrNull(row.amount) ?? 0,
      invoiceCount: toNumberOrNull(row.invoiceCount) ?? 0
    }))
  };
}

function normalizeDiagnoses(list) {
  return (Array.isArray(list) ? list : []).map((d) => ({
    icd10Code: d.icd10Code,
    diseaseName: d.diseaseName || d.icd10Code,
    count: toNumberOrNull(d.count) ?? 0,
    percentage: toNumberOrNull(d.percentage)
  }));
}

const percentOf = (part, whole) => {
  if (part === null || part === undefined || !whole) return null;
  return (part / whole) * 100;
};

/**
 * Cơ cấu thu theo phương thức thanh toán. Doanh thu theo phương thức = tiền thực thu từ người bệnh,
 * nên mẫu số tỷ lệ là patientCollected (không phải totalRevenue – vốn gồm cả phần BHYT chi trả).
 */
export function getMethodBreakdown(revenue) {
  const denominator = revenue?.patientCollected;
  return PAYMENT_METHODS.map((method) => {
    const amount = revenue?.methods?.[method] ?? null;
    return {
      method,
      label: PAYMENT_METHOD_LABELS[method] || method,
      amount,
      percent: percentOf(amount, denominator)
    };
  });
}

/** BHYT chi trả vs người bệnh thanh toán, trên tổng chi phí hóa đơn đã thu (totalRevenue). */
export function getPayerSplit(revenue) {
  const total = revenue?.totalRevenue ?? null;
  return {
    total,
    insurance: revenue?.insuranceAmount ?? null,
    patient: revenue?.patientCollected ?? null,
    insurancePercent: percentOf(revenue?.insuranceAmount, total),
    patientPercent: percentOf(revenue?.patientCollected, total)
  };
}

/** 1234 → "1.234"; null / không hợp lệ → "—". */
export const formatCount = (value) =>
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('vi-VN');

/** 62.456 → "62,5%"; null → "—". */
export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

export const reportService = {
  async getKpiSummary() {
    try {
      const res = await apiClient.get('/reports/kpi-summary');
      return normalizeKpi(unwrap(res));
    } catch (err) {
      throw toAppError(err, 'Không tải được chỉ số tổng quan.');
    }
  },

  async getVisitsSummary(from, to) {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await apiClient.get('/reports/visits-summary', { params });
      return normalizeVisits(unwrap(res));
    } catch (err) {
      throw toAppError(err, 'Không tải được thống kê lượt khám.');
    }
  },

  async getRevenueSummary(from, to) {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await apiClient.get('/reports/revenue', { params });
      return normalizeRevenue(unwrap(res));
    } catch (err) {
      throw toAppError(err, 'Không tải được báo cáo doanh thu.');
    }
  },

  async getTopDiagnoses(limit = 5) {
    try {
      const res = await apiClient.get('/reports/top-diagnoses', { params: { limit } });
      return normalizeDiagnoses(unwrap(res));
    } catch (err) {
      throw toAppError(err, 'Không tải được mô hình bệnh tật.');
    }
  }
};

export default reportService;
