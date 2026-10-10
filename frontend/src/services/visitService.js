import apiClient from './api';
import { toAppError } from './apiError';

/**
 * Dịch vụ khám bệnh lâm sàng (ca khám, sinh hiệu, chẩn đoán, kê đơn, cận lâm sàng).
 *
 * Nguyên tắc an toàn dữ liệu lâm sàng:
 *  - Mọi thao tác GHI (lưu sinh hiệu, chẩn đoán, kê đơn, chỉ định, hoàn tất ca khám) chỉ báo thành công
 *    khi máy chủ đã lưu. Lỗi được ném ra dưới dạng toAppError để giao diện hiển thị đúng thông điệp.
 *  - Không còn dữ liệu bệnh nhân/ca khám giả lập cục bộ: khi không tải được dữ liệu, giao diện hiển thị
 *    trạng thái lỗi kèm nút "Thử lại".
 */

// Danh mục mã bệnh ICD-10 phổ biến tại phòng khám (dữ liệu tham chiếu, không phải dữ liệu người bệnh)
export const COMMON_ICD10_CODES = [
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)', departmentId: 5 },
  { code: 'I20.9', name: 'Cơn đau thắt ngực không đặc hiệu', departmentId: 5 },
  { code: 'E11.9', name: 'Đái tháo đường typ 2 không có biến chứng', departmentId: 1 },
  { code: 'J06.9', name: 'Nhiễm khuẩn đường hô hấp trên cấp', departmentId: 1 },
  { code: 'J20.9', name: 'Viêm phế quản cấp không đặc hiệu', departmentId: 1 },
  { code: 'K29.7', name: 'Viêm dạ dày không đặc hiệu', departmentId: 6 },
  { code: 'K21.9', name: 'Trào ngược dạ dày thực quản (GERD)', departmentId: 6 },
  { code: 'A09', name: 'Viêm dạ dày ruột và tiêu chảy nhiễm khuẩn', departmentId: 6 },
  { code: 'J45.9', name: 'Hen phế quản (Suyễn) không đặc hiệu', departmentId: 4 },
  { code: 'L20.9', name: 'Viêm da cơ địa dị ứng', departmentId: 8 },
  { code: 'H10.9', name: 'Viêm kết mạc không đặc hiệu (Đau mắt đỏ)', departmentId: 9 },
  { code: 'J01.9', name: 'Viêm xoang cấp không đặc hiệu', departmentId: 10 },
  { code: 'M54.5', name: 'Đau thắt lưng cấp tính', departmentId: 2 },
  { code: 'R50.9', name: 'Sốt không rõ căn nguyên', departmentId: 1 }
];

export const findIcd10 = (code) => {
  const key = String(code || '').trim().toUpperCase();
  return COMMON_ICD10_CODES.find((c) => c.code.toUpperCase() === key) || null;
};

// Danh mục xét nghiệm cận lâm sàng chuẩn (dữ liệu tham chiếu)
export const STANDARD_LAB_TESTS = [
  { code: 'LAB-CBC', name: 'Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)', category: 'Huyết học' },
  { code: 'LAB-GLU', name: 'Định lượng Glucose máu lúc đói', category: 'Sinh hóa' },
  { code: 'LAB-LIPID', name: 'Bộ mỡ máu toàn phần (Cholesterol, Triglycerid, HDL, LDL)', category: 'Sinh hóa' },
  { code: 'LAB-LIVER', name: 'Men gan (AST, ALT, GGT)', category: 'Sinh hóa' },
  { code: 'LAB-KIDNEY', name: 'Chức năng thận (Ure, Creatinin huyết thanh)', category: 'Sinh hóa' },
  { code: 'LAB-UA', name: 'Tổng phân tích nước tiểu 10 thông số', category: 'Nước tiểu' },
  { code: 'IMG-XRAY-CHEST', name: 'X-quang ngực thẳng kỹ thuật số (CR/DR)', category: 'Chẩn đoán hình ảnh' },
  { code: 'IMG-US-ABDOMEN', name: 'Siêu âm ổ bụng tổng quát', category: 'Chẩn đoán hình ảnh' },
  { code: 'IMG-ECG', name: 'Điện tâm đồ 12 chuyển đạo (ECG)', category: 'Thăm dò chức năng' }
];

export const LAB_ORDER_STATUS_LABELS = {
  ORDERED: 'Chờ kết quả',
  RESULTED: 'Đã có kết quả'
};

// =====================================================================
// SINH HIỆU (khớp VitalSignsDto phía backend và ràng buộc kiểm tra hợp lệ)
// =====================================================================

/** Định nghĩa các chỉ số sinh hiệu: tên trường = tên trường của VitalSignsDto. */
export const VITAL_SIGN_FIELDS = [
  { key: 'pulse', label: 'Mạch', unit: 'lần/phút', min: 20, max: 300, step: 1, integer: true, normal: '60–100' },
  { key: 'bloodPressureSystolic', label: 'Huyết áp tâm thu', unit: 'mmHg', min: 50, max: 300, step: 1, integer: true, normal: '90–139' },
  { key: 'bloodPressureDiastolic', label: 'Huyết áp tâm trương', unit: 'mmHg', min: 20, max: 200, step: 1, integer: true, normal: '60–89' },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', min: 30, max: 45, step: 0.1, normal: '36,5–37,5' },
  { key: 'respiratoryRate', label: 'Nhịp thở', unit: 'lần/phút', min: 4, max: 80, step: 1, integer: true, normal: '12–20' },
  { key: 'spO2', label: 'SpO₂', unit: '%', min: 50, max: 100, step: 1, integer: true, normal: '≥ 95' },
  { key: 'weight', label: 'Cân nặng', unit: 'kg', min: 0.3, max: 400, step: 0.1 },
  { key: 'height', label: 'Chiều cao', unit: 'cm', min: 20, max: 280, step: 0.5 }
];

const VITAL_KEYS = VITAL_SIGN_FIELDS.map((f) => f.key);

/** Biểu mẫu sinh hiệu rỗng (giá trị chuỗi để gắn vào input). */
export const createEmptyVitalsForm = () => Object.fromEntries(VITAL_KEYS.map((k) => [k, '']));

/** Chuyển VitalSignsDto từ backend → giá trị biểu mẫu (null → ''). */
export function vitalsToForm(vitalSigns) {
  const form = createEmptyVitalsForm();
  if (!vitalSigns || typeof vitalSigns !== 'object') return form;
  for (const key of VITAL_KEYS) {
    const v = vitalSigns[key];
    form[key] = v === null || v === undefined ? '' : String(v);
  }
  return form;
}

/** '' / null / chữ → null; "36,8" → 36.8. Ô trống KHÔNG được hiểu là 0. */
export function parseVitalValue(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

const fmt = (n) => String(n).replace('.', ',');

/**
 * Kiểm tra hợp lệ biểu mẫu sinh hiệu theo ràng buộc của backend.
 * @returns {{ errors: Object<string,string>, values: Object<string, number|null>, isEmpty: boolean }}
 */
export function validateVitalSigns(form = {}) {
  const errors = {};
  const values = {};
  for (const field of VITAL_SIGN_FIELDS) {
    const n = parseVitalValue(form[field.key]);
    if (n === null) {
      values[field.key] = null;
      continue;
    }
    if (Number.isNaN(n)) {
      errors[field.key] = `${field.label} phải là số`;
    } else if (field.integer && !Number.isInteger(n)) {
      errors[field.key] = `${field.label} phải là số nguyên`;
    } else if (n < field.min || n > field.max) {
      errors[field.key] = `${field.label} phải từ ${fmt(field.min)} đến ${fmt(field.max)} ${field.unit}`;
    }
    values[field.key] = errors[field.key] ? null : n;
  }
  const sys = values.bloodPressureSystolic;
  const dia = values.bloodPressureDiastolic;
  if (sys !== null && dia !== null && sys <= dia) {
    errors.bloodPressureDiastolic = 'Huyết áp tâm trương phải nhỏ hơn tâm thu';
  }
  const isEmpty = VITAL_KEYS.every((k) => parseVitalValue(form[k]) === null);
  return { errors, values, isEmpty };
}

/** Chỉ gửi các chỉ số đã nhập (backend gộp phần cập nhật với dữ liệu sẵn có). */
export function toVitalSignsPayload(values = {}) {
  const payload = {};
  for (const key of VITAL_KEYS) {
    if (values[key] !== null && values[key] !== undefined && Number.isFinite(values[key])) {
      payload[key] = values[key];
    }
  }
  return Object.keys(payload).length > 0 ? payload : null;
}

/** Cảnh báo sinh hiệu bất thường – chỉ xét các giá trị đã nhập và hợp lệ. */
export function getVitalWarnings(values = {}) {
  const w = [];
  const has = (k) => values[k] !== null && values[k] !== undefined && Number.isFinite(values[k]);
  if (has('pulse') && values.pulse > 100) w.push('Mạch nhanh (> 100 lần/phút)');
  if (has('pulse') && values.pulse < 60) w.push('Mạch chậm (< 60 lần/phút)');
  if ((has('bloodPressureSystolic') && values.bloodPressureSystolic >= 140)
    || (has('bloodPressureDiastolic') && values.bloodPressureDiastolic >= 90)) {
    w.push('Huyết áp cao (≥ 140/90 mmHg)');
  }
  if (has('bloodPressureSystolic') && values.bloodPressureSystolic < 90) w.push('Huyết áp thấp (tâm thu < 90 mmHg)');
  if (has('temperature') && values.temperature >= 38) w.push('Sốt (≥ 38 °C)');
  if (has('temperature') && values.temperature < 35) w.push('Hạ thân nhiệt (< 35 °C)');
  if (has('respiratoryRate') && values.respiratoryRate > 20) w.push('Thở nhanh (> 20 lần/phút)');
  if (has('respiratoryRate') && values.respiratoryRate < 12) w.push('Thở chậm (< 12 lần/phút)');
  if (has('spO2') && values.spO2 < 95) w.push('SpO₂ thấp (< 95%)');
  return w;
}

/**
 * Chỉ số BMI theo ngưỡng dành cho người châu Á (WHO 2000 – Bộ Y tế áp dụng):
 * < 18,5 Thiếu cân · 18,5–22,9 Bình thường · 23–24,9 Thừa cân · 25–29,9 Béo phì độ I · ≥ 30 Béo phì độ II.
 * Phân loại theo giá trị đã làm tròn 1 chữ số thập phân (đúng với số hiển thị).
 * @returns {{ bmi: number, category: string, tone: 'normal'|'warning'|'danger' } | null}
 */
export function calculateBmi(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const heightM = h / 100;
  const bmi = Math.round((w / (heightM * heightM)) * 10) / 10;
  if (!Number.isFinite(bmi)) return null;
  if (bmi < 18.5) return { bmi, category: 'Thiếu cân', tone: 'warning' };
  if (bmi < 23) return { bmi, category: 'Bình thường', tone: 'normal' };
  if (bmi < 25) return { bmi, category: 'Thừa cân', tone: 'warning' };
  if (bmi < 30) return { bmi, category: 'Béo phì độ I', tone: 'danger' };
  return { bmi, category: 'Béo phì độ II', tone: 'danger' };
}

/** Chỉ chấp nhận đường dẫn http(s) để dùng làm href (chặn javascript:, data:, ...). */
export function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Kiểm tra hạn dùng thuốc (yyyy-MM-dd) so với ngày hiện tại theo giờ máy. */
export function isDrugExpired(drug, now = new Date()) {
  if (!drug?.expiryDate) return false;
  const [y, m, d] = String(drug.expiryDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return false;
  const expiry = new Date(y, m - 1, d, 23, 59, 59);
  return expiry < now;
}

// =====================================================================
// API
// =====================================================================

const pageContent = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

let drugCatalogCache = null;

export const visitService = {
  /** Danh sách ca khám (GET /visits). Lỗi → ném AppError, KHÔNG trả dữ liệu giả. */
  async getVisits({ doctorId = null, patientId = null, status = null, size = 50 } = {}) {
    const params = { size };
    if (doctorId) params.doctorId = doctorId;
    if (patientId) params.patientId = patientId;
    if (status) params.status = status;
    try {
      const res = await apiClient.get('/visits', { params });
      return pageContent(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách ca khám.');
    }
  },

  async getVisitById(id) {
    try {
      const res = await apiClient.get(`/visits/${id}`);
      return res?.data ?? null;
    } catch (err) {
      throw toAppError(err, `Không tải được ca khám #${id}.`);
    }
  },

  /** Tạo ca khám (lễ tân check-in hoặc bác sĩ tiếp nhận). Bắt buộc patientId + doctorId thật. */
  async createVisit({ patientId, doctorId, appointmentId, chiefComplaint, vitalSigns } = {}) {
    if (!patientId || !doctorId) {
      throw new Error('Thiếu thông tin bệnh nhân hoặc bác sĩ phụ trách – không thể tạo ca khám.');
    }
    const body = { patientId, doctorId };
    if (appointmentId) body.appointmentId = appointmentId;
    if (chiefComplaint) body.chiefComplaint = chiefComplaint;
    if (vitalSigns) body.vitalSigns = vitalSigns;
    try {
      const res = await apiClient.post('/visits', body);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không tạo được ca khám.');
    }
  },

  /**
   * Cập nhật ca khám: lý do khám, chẩn đoán ICD-10, ghi chú, sinh hiệu (đối tượng VitalSignsDto).
   * Trường undefined không được gửi để tránh ghi đè dữ liệu của người khác.
   */
  async updateVisit(id, { chiefComplaint, diagnosisCode, diagnosisNote, vitalSigns } = {}) {
    const body = {};
    if (chiefComplaint !== undefined) body.chiefComplaint = chiefComplaint;
    if (diagnosisCode !== undefined) body.diagnosisCode = diagnosisCode;
    if (diagnosisNote !== undefined) body.diagnosisNote = diagnosisNote;
    if (vitalSigns) body.vitalSigns = vitalSigns;
    try {
      const res = await apiClient.put(`/visits/${id}`, body);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không lưu được thông tin ca khám.');
    }
  },

  /** Điều dưỡng cập nhật sinh hiệu (chỉ gửi vitalSigns dạng ĐỐI TƯỢNG). */
  async updateVitalSigns(visitId, vitalSigns) {
    if (!vitalSigns || typeof vitalSigns !== 'object' || Object.keys(vitalSigns).length === 0) {
      throw new Error('Chưa nhập chỉ số sinh hiệu nào.');
    }
    try {
      const res = await apiClient.put(`/visits/${visitId}`, { vitalSigns });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không lưu được sinh hiệu.');
    }
  },

  async completeVisit(id) {
    try {
      const res = await apiClient.patch(`/visits/${id}/complete`);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không hoàn tất được ca khám.');
    }
  },

  /**
   * Kê đơn thuốc. overrideReason (≤ 500 ký tự) bắt buộc khi có tương tác/dị ứng nghiêm trọng;
   * nếu thiếu, backend trả PRESCRIPTION_SAFETY_BLOCK (err.errorCode) kèm err.details.
   */
  async createPrescription(visitId, { items = [], overrideReason } = {}) {
    const body = {
      items: items.map((it) => ({
        drugId: Number(it.drugId),
        dosage: String(it.dosage || '').trim(),
        quantity: Number(it.quantity),
        instruction: it.instruction ? String(it.instruction).trim() : undefined
      }))
    };
    if (overrideReason) body.overrideReason = String(overrideReason).trim().slice(0, 500);
    try {
      const res = await apiClient.post(`/visits/${visitId}/prescriptions`, body);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không lưu được đơn thuốc.');
    }
  },

  async createLabOrder(visitId, { testType }) {
    try {
      const res = await apiClient.post(`/visits/${visitId}/lab-orders`, { testType: String(testType || '').trim() });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không tạo được chỉ định cận lâm sàng.');
    }
  },

  async updateLabResult(orderId, { resultText, resultFileUrl } = {}) {
    const body = { resultText: String(resultText || '').trim() };
    const url = String(resultFileUrl || '').trim();
    if (url) {
      if (!isHttpUrl(url)) throw new Error('Đường dẫn tệp kết quả phải bắt đầu bằng http:// hoặc https://');
      body.resultFileUrl = url;
    }
    try {
      const res = await apiClient.put(`/lab-orders/${orderId}/result`, body);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không lưu được kết quả cận lâm sàng.');
    }
  },

  /** Danh mục thuốc thật từ kho dược (GET /drugs/all). Lưu đệm trong phiên làm việc. */
  async getDrugCatalog({ force = false } = {}) {
    if (drugCatalogCache && !force) return drugCatalogCache;
    try {
      const res = await apiClient.get('/drugs/all');
      const list = Array.isArray(res?.data) ? res.data : pageContent(res);
      drugCatalogCache = list;
      return list;
    } catch (err) {
      throw toAppError(err, 'Không tải được danh mục thuốc.');
    }
  },

  /** Xóa bộ đệm danh mục thuốc (dùng trong kiểm thử hoặc sau khi kho cập nhật). */
  clearDrugCatalogCache() {
    drugCatalogCache = null;
  }
};

export default visitService;
