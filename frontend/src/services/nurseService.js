import { visitService, calculateBmi as sharedCalculateBmi } from './visitService';

/**
 * Dịch vụ trạm điều dưỡng & phòng xét nghiệm.
 *
 * - Hàng đợi đo sinh hiệu = các ca khám đang diễn ra (GET /visits?status=IN_PROGRESS).
 * - Sinh hiệu được gửi lên PUT /visits/{id} dưới dạng ĐỐI TƯỢNG VitalSignsDto
 *   (pulse, bloodPressureSystolic, bloodPressureDiastolic, temperature, respiratoryRate, spO2, weight, height).
 * - Chỉ định cận lâm sàng chờ kết quả được lấy từ các ca khám đang diễn ra.
 * - Mọi lỗi được ném ra để giao diện hiển thị – không lưu giả vào localStorage.
 */

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

const hasAnyVital = (vs) => Boolean(vs) && Object.values(vs).some((v) => v !== null && v !== undefined && v !== '');

function toQueueItem(visit) {
  return {
    visitId: visit.id,
    patientId: visit.patientId,
    patientCode: visit.patientCode || '',
    fullName: visit.patientName || '',
    gender: visit.patientGender || null,
    dob: visit.patientDob || null,
    age: ageFromDob(visit.patientDob),
    doctorName: visit.doctorName || '',
    visitTime: visit.visitTime || null,
    reason: visit.chiefComplaint || '',
    vitals: visit.vitalSigns || null,
    status: hasAnyVital(visit.vitalSigns) ? 'VITALS_COMPLETED' : 'WAITING_VITALS'
  };
}

/** Chuỗi số "3,9" → 3.9; không phải số → null. */
const toNumber = (text) => {
  if (text === null || text === undefined) return null;
  const cleaned = String(text).trim().replace(',', '.');
  if (cleaned === '' || !/^[-+]?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/**
 * Phân tích khoảng tham chiếu: "3.9 - 6.4", "3,9–6,4", "< 5.2", "≤ 200", "> 60", "≥ 1.0".
 * @returns {{min: number|null, max: number|null} | null}
 */
export function parseReferenceRange(range) {
  if (!range) return null;
  const text = String(range).replace(/,/g, '.').replace(/\s+/g, ' ').trim();
  const between = text.match(/^(-?\d*\.?\d+)\s*(?:-|–|—|đến)\s*(-?\d*\.?\d+)/i);
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const upper = text.match(/^(?:<|≤|<=)\s*(-?\d*\.?\d+)/);
  if (upper) return { min: null, max: Number(upper[1]) };
  const lower = text.match(/^(?:>|≥|>=)\s*(-?\d*\.?\d+)/);
  if (lower) return { min: Number(lower[1]), max: null };
  return null;
}

/**
 * Tự đánh giá bất thường khi cả giá trị và khoảng tham chiếu đều là số.
 * @returns {boolean|null} null = không xác định được (người dùng tự đánh dấu)
 */
export function isLabValueAbnormal(value, referenceRange) {
  const v = toNumber(value);
  const range = parseReferenceRange(referenceRange);
  if (v === null || !range) return null;
  if (range.min !== null && v < range.min) return true;
  if (range.max !== null && v > range.max) return true;
  return false;
}

/** Ghép kết quả có cấu trúc thành resultText gửi backend (UpdateLabResultRequest.resultText). */
export function buildLabResultText({ value, unit, referenceRange, isAbnormal, conclusion } = {}) {
  const lines = [];
  const v = String(value ?? '').trim();
  if (v) {
    let line = `Kết quả: ${v}${unit ? ` ${String(unit).trim()}` : ''}`;
    if (referenceRange && String(referenceRange).trim()) line += ` (khoảng tham chiếu: ${String(referenceRange).trim()})`;
    lines.push(line);
    lines.push(`Đánh giá: ${isAbnormal ? 'BẤT THƯỜNG' : 'Trong giới hạn tham chiếu'}`);
  }
  const c = String(conclusion ?? '').trim();
  if (c) lines.push(`Kết luận: ${c}`);
  return lines.join('\n');
}

export const nurseService = {
  /** Danh sách bệnh nhân đang khám cần đo sinh hiệu. */
  async getVitalsQueue() {
    const visits = await visitService.getVisits({ status: 'IN_PROGRESS', size: 100 });
    return visits.map(toQueueItem);
  },

  /**
   * Lưu sinh hiệu cho ca khám.
   * @param {number} visitId
   * @param {object} vitalSigns VitalSignsDto (chỉ các chỉ số đã đo)
   * @returns ca khám sau cập nhật (VisitResponse)
   */
  async saveVitals(visitId, vitalSigns) {
    return visitService.updateVitalSigns(visitId, vitalSigns);
  },

  /** Chỉ định cận lâm sàng của các ca khám đang diễn ra (chờ kết quả xếp trước). */
  async getPendingLabOrders() {
    const visits = await visitService.getVisits({ status: 'IN_PROGRESS', size: 100 });
    const orders = visits.flatMap((v) => (v.labOrders || []).map((o) => ({
      ...o,
      visitId: o.visitId ?? v.id,
      patientName: v.patientName || '',
      patientCode: v.patientCode || '',
      testName: o.testType
    })));
    return orders.sort((a, b) => {
      const pa = a.status === 'RESULTED' ? 1 : 0;
      const pb = b.status === 'RESULTED' ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return String(a.orderedAt || '').localeCompare(String(b.orderedAt || ''));
    });
  },

  /** Nhập kết quả cận lâm sàng: { resultText, resultFileUrl }. */
  async submitLabResult(orderId, { resultText, resultFileUrl } = {}) {
    if (!resultText || !String(resultText).trim()) {
      throw new Error('Vui lòng nhập kết quả hoặc kết luận xét nghiệm.');
    }
    return visitService.updateLabResult(orderId, { resultText, resultFileUrl });
  },

  /** Dùng chung hàm BMI chuẩn châu Á với phòng khám bác sĩ. */
  calculateBmi(weightKg, heightCm) {
    return sharedCalculateBmi(weightKg, heightCm);
  }
};

export default nurseService;
