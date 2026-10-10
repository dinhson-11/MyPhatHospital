import apiClient from './api';
import { toAppError } from './apiError';

/**
 * Patient Service – hồ sơ bệnh nhân, thẻ BHYT & dị ứng.
 *
 * Dị ứng là dữ liệu an toàn người bệnh: KHÔNG bao giờ trả danh sách giả khi không tải được
 * (trước đây trả "Penicillin" mẫu). Lỗi được ném ra để giao diện hiển thị "chưa xác định" + Thử lại.
 */

// ==================== Validation ====================

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Mã thẻ BHYT: 2 chữ cái in hoa + 1 chữ số mức hưởng (1–5) + 12 chữ số = 15 ký tự. */
export const INSURANCE_NUMBER_REGEX = /^[A-Z]{2}[1-5][0-9]{12}$/;
export const VN_MOBILE_REGEX = /^0\d{9,10}$/;

/** Chuẩn hóa mã thẻ BHYT khi nhập: bỏ khoảng trắng, viết hoa, tối đa 15 ký tự. */
export const normalizeInsuranceNumber = (value) =>
  String(value || '').replace(/\s+/g, '').toUpperCase().slice(0, 15);

/**
 * Kiểm tra thông tin thẻ BHYT (dùng cho lễ tân tạo / cập nhật hồ sơ).
 * @returns {Object} map field → thông báo lỗi
 */
export function validateInsurance({ insuranceNumber, insuranceValidFrom, insuranceValidTo } = {}) {
  const errors = {};
  const number = normalizeInsuranceNumber(insuranceNumber);
  if (number && !INSURANCE_NUMBER_REGEX.test(number)) {
    errors.insuranceNumber = 'Mã thẻ BHYT gồm 15 ký tự: 2 chữ cái, 1 chữ số mức hưởng (1–5) và 12 chữ số';
  }
  if (!number && (insuranceValidFrom || insuranceValidTo)) {
    errors.insuranceNumber = 'Nhập mã thẻ BHYT trước khi nhập thời hạn thẻ';
  }
  if (insuranceValidFrom && insuranceValidTo && insuranceValidFrom > insuranceValidTo) {
    errors.insuranceValidTo = 'Ngày hết hạn phải sau ngày bắt đầu hiệu lực';
  }
  return errors;
}

/**
 * Validate dữ liệu hồ sơ bệnh nhân (khớp ràng buộc Bean Validation phía Backend).
 * @param {object} data
 * @param {{ requirePhone?: boolean, includeInsurance?: boolean }} options
 * @returns {Object} map field → thông báo lỗi (rỗng nếu hợp lệ)
 */
export const validatePatientProfile = (data = {}, options = {}) => {
  const errors = {};
  if (!data.fullName || !data.fullName.trim()) {
    errors.fullName = 'Họ tên không được để trống';
  } else if (data.fullName.length > 150) {
    errors.fullName = 'Họ tên tối đa 150 ký tự';
  }
  const phone = String(data.phone || '').replace(/[\s.]/g, '');
  if (options.requirePhone && !phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (phone && !VN_MOBILE_REGEX.test(phone)) {
    errors.phone = 'Số điện thoại không hợp lệ';
  }
  if (data.nationalId && data.nationalId.length > 20) {
    errors.nationalId = 'CCCD/CMND tối đa 20 ký tự';
  }
  if (data.address && data.address.length > 255) {
    errors.address = 'Địa chỉ tối đa 255 ký tự';
  }
  if (data.dob && new Date(data.dob) > new Date()) {
    errors.dob = 'Ngày sinh không được ở tương lai';
  }
  if (data.bloodType && !BLOOD_TYPES.includes(data.bloodType)) {
    errors.bloodType = 'Nhóm máu không hợp lệ';
  }
  if (options.includeInsurance) Object.assign(errors, validateInsurance(data));
  return errors;
};

/** Trạng thái hiệu lực thẻ BHYT để hiển thị. */
export function insuranceStatus(patient, today = new Date()) {
  if (!patient?.insuranceNumber) return { code: 'NONE', label: 'Chưa có thẻ BHYT' };
  const pad = (n) => String(n).padStart(2, '0');
  const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (patient.insuranceValidTo && String(patient.insuranceValidTo).slice(0, 10) < iso) {
    return { code: 'EXPIRED', label: 'Thẻ đã hết hạn' };
  }
  if (patient.insuranceValidFrom && String(patient.insuranceValidFrom).slice(0, 10) > iso) {
    return { code: 'NOT_YET', label: 'Thẻ chưa đến ngày hiệu lực' };
  }
  return { code: 'VALID', label: 'Thẻ còn hiệu lực' };
}

const PROFILE_FIELDS = ['fullName', 'dob', 'gender', 'nationalId', 'address', 'phone', 'bloodType'];
const INSURANCE_FIELDS = ['insuranceNumber', 'insuranceValidFrom', 'insuranceValidTo'];

/** Bỏ chuỗi rỗng (gửi null) để backend không lỗi parse ngày/enum. */
function buildPatientPayload(data = {}, { includeInsurance }) {
  const fields = includeInsurance ? [...PROFILE_FIELDS, ...INSURANCE_FIELDS] : PROFILE_FIELDS;
  const payload = {};
  for (const f of fields) {
    if (!(f in data)) continue;
    let v = data[f];
    if (typeof v === 'string') v = v.trim();
    if (f === 'phone' && v) v = v.replace(/[\s.]/g, '');
    if (f === 'insuranceNumber' && v) v = normalizeInsuranceNumber(v);
    payload[f] = v === '' || v === undefined ? null : v;
  }
  return payload;
}

const pageContent = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

// ==================== Service API ====================

export const patientService = {
  /** Hồ sơ của bệnh nhân đang đăng nhập (GET /patients/me). */
  async getMyProfile() {
    try {
      const res = await apiClient.get('/patients/me');
      return res?.data ?? null;
    } catch (err) {
      throw toAppError(err, 'Không tải được hồ sơ bệnh nhân.');
    }
  },

  /**
   * Bệnh nhân tự cập nhật hồ sơ (PUT /patients/me).
   * Thông tin thẻ BHYT KHÔNG được gửi – chỉ quầy tiếp đón cập nhật.
   */
  async updateMyProfile(updateData) {
    try {
      const res = await apiClient.put('/patients/me', buildPatientPayload(updateData, { includeInsurance: false }));
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không lưu được hồ sơ.');
    }
  },

  /** Tìm kiếm bệnh nhân cho nhân viên (GET /patients?keyword=). */
  async searchPatients(keyword = '', { size = 20 } = {}) {
    try {
      const params = { size };
      if (keyword && keyword.trim()) params.keyword = keyword.trim();
      const res = await apiClient.get('/patients', { params });
      return pageContent(res);
    } catch (err) {
      throw toAppError(err, 'Không tìm được hồ sơ bệnh nhân.');
    }
  },

  /** Giữ tương thích tên hàm cũ. */
  async getPatients(keyword = '') {
    return this.searchPatients(keyword);
  },

  async getPatientById(id) {
    try {
      const res = await apiClient.get(`/patients/${id}`);
      return res?.data ?? null;
    } catch (err) {
      throw toAppError(err, `Không tải được hồ sơ bệnh nhân #${id}.`);
    }
  },

  /** Lễ tân tạo hồ sơ (có thể kèm thẻ BHYT). */
  async createPatient(data) {
    try {
      const res = await apiClient.post('/patients', buildPatientPayload(data, { includeInsurance: true }));
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không tạo được hồ sơ bệnh nhân.');
    }
  },

  /** Lễ tân cập nhật hồ sơ (có thể kèm thẻ BHYT). */
  async updatePatient(id, data) {
    try {
      const res = await apiClient.put(`/patients/${id}`, buildPatientPayload(data, { includeInsurance: true }));
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không cập nhật được hồ sơ bệnh nhân.');
    }
  },

  /** Danh sách dị ứng (GET /patients/{id}/allergies). Lỗi → ném ra, KHÔNG trả dữ liệu mẫu. */
  async getAllergies(patientId) {
    if (!patientId) throw new Error('Thiếu mã bệnh nhân để tải thông tin dị ứng.');
    try {
      const res = await apiClient.get(`/patients/${patientId}/allergies`);
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      throw toAppError(err, 'Không tải được thông tin dị ứng.');
    }
  },

  async getMyAllergies() {
    const profile = await this.getMyProfile();
    if (!profile?.id) return [];
    return this.getAllergies(profile.id);
  },

  async addAllergy(patientId, { allergen, severity, note } = {}) {
    try {
      const res = await apiClient.post(`/patients/${patientId}/allergies`, {
        allergen: String(allergen || '').trim(),
        severity: severity || 'MILD',
        note: note ? String(note).trim() : undefined
      });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không thêm được dị ứng.');
    }
  },

  async deleteAllergy(patientId, allergyId) {
    try {
      await apiClient.delete(`/patients/${patientId}/allergies/${allergyId}`);
      return true;
    } catch (err) {
      throw toAppError(err, 'Không xóa được dị ứng.');
    }
  }
};

export default patientService;
