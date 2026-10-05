import apiClient from './api';

const PATIENT_PROFILE_KEY = 'hms_patient_profile';
const PATIENT_ALLERGIES_KEY = 'hms_patient_allergies';

/**
 * Patient Service – Quản lý hồ sơ bệnh nhân & dị ứng.
 * Hỗ trợ fallback offline khi Backend chưa sẵn sàng (dev/test).
 */

// ==================== Dữ liệu mẫu offline ====================
const DEFAULT_PROFILE = {
  id: 1,
  patientCode: 'BN-260928-001',
  fullName: 'Trần Đức Minh',
  dob: '1995-03-20',
  gender: 'MALE',
  nationalId: '001099012345',
  address: '123 Lê Lợi, Phường 1, Quận 1, TP.HCM',
  phone: '0912345678',
  bloodType: 'O+',
  createdAt: '2026-09-01T10:00:00'
};

const DEFAULT_ALLERGIES = [
  { id: 1, allergen: 'Penicillin', severity: 'SEVERE', note: 'Phản ứng phản vệ, khó thở', createdAt: '2026-08-15T08:30:00' },
  { id: 2, allergen: 'Hải sản (tôm, cua)', severity: 'MODERATE', note: 'Nổi mề đay toàn thân', createdAt: '2026-08-20T14:00:00' },
  { id: 3, allergen: 'Phấn hoa', severity: 'MILD', note: 'Hắt xì, ngứa mũi theo mùa', createdAt: '2026-09-01T09:15:00' }
];

// ==================== Helpers ====================

const getStoredProfile = () => {
  const raw = localStorage.getItem(PATIENT_PROFILE_KEY);
  if (!raw) {
    localStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
    return { ...DEFAULT_PROFILE };
  }
  try { return JSON.parse(raw); } catch { return { ...DEFAULT_PROFILE }; }
};

const getStoredAllergies = () => {
  const raw = localStorage.getItem(PATIENT_ALLERGIES_KEY);
  if (!raw) {
    localStorage.setItem(PATIENT_ALLERGIES_KEY, JSON.stringify(DEFAULT_ALLERGIES));
    return [...DEFAULT_ALLERGIES];
  }
  try { return JSON.parse(raw); } catch { return [...DEFAULT_ALLERGIES]; }
};

// ==================== Validation ====================

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Validate dữ liệu hồ sơ bệnh nhân (khớp ràng buộc Bean Validation phía Backend).
 * @returns {Object} map field → thông báo lỗi (rỗng nếu hợp lệ)
 */
export const validatePatientProfile = (data = {}) => {
  const errors = {};
  if (!data.fullName || !data.fullName.trim()) {
    errors.fullName = 'Họ tên không được để trống';
  } else if (data.fullName.length > 150) {
    errors.fullName = 'Họ tên tối đa 150 ký tự';
  }
  if (data.phone && !/^0[0-9]{9,10}$/.test(data.phone)) {
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
  return errors;
};

// ==================== Service API ====================

export const patientService = {

  /**
   * Lấy hồ sơ bệnh nhân hiện tại (GET /patients/me).
   */
  async getMyProfile() {
    try {
      const res = await apiClient.get('/patients/me');
      if (res && res.data) return res.data;
    } catch {
      // Fallback offline
    }
    return getStoredProfile();
  },

  /**
   * Cập nhật hồ sơ bệnh nhân (PUT /patients/me).
   */
  async updateMyProfile(updateData) {
    try {
      const res = await apiClient.put('/patients/me', updateData);
      if (res && res.data) return res.data;
    } catch {
      // Fallback offline
    }

    // Offline: lưu vào localStorage
    const current = getStoredProfile();
    const updated = { ...current, ...updateData, updatedAt: new Date().toISOString() };
    localStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Lấy danh sách dị ứng (GET /patients/{id}/allergies).
   */
  async getAllergies(patientId) {
    try {
      const res = await apiClient.get(`/patients/${patientId}/allergies`);
      if (res && res.data) return res.data;
    } catch {
      // Fallback offline
    }
    return getStoredAllergies();
  },

  /**
   * Lấy danh sách dị ứng của bệnh nhân hiện tại.
   */
  async getMyAllergies() {
    try {
      const profile = await this.getMyProfile();
      if (profile && profile.id) {
        return await this.getAllergies(profile.id);
      }
    } catch {
      // Fallback offline
    }
    return getStoredAllergies();
  },

  /**
   * Thêm dị ứng mới (POST /patients/{id}/allergies).
   */
  async addAllergy(patientId, allergyData) {
    try {
      const res = await apiClient.post(`/patients/${patientId}/allergies`, allergyData);
      if (res && res.data) return res.data;
    } catch {
      // Fallback offline
    }

    // Offline: lưu vào localStorage
    const allergies = getStoredAllergies();
    const newAllergy = {
      id: Date.now(),
      allergen: allergyData.allergen,
      severity: allergyData.severity || 'MILD',
      note: allergyData.note || '',
      createdAt: new Date().toISOString()
    };
    allergies.push(newAllergy);
    localStorage.setItem(PATIENT_ALLERGIES_KEY, JSON.stringify(allergies));
    return newAllergy;
  },

  /**
   * Xóa dị ứng (DELETE /patients/{id}/allergies/{allergyId}).
   */
  async deleteAllergy(patientId, allergyId) {
    try {
      await apiClient.delete(`/patients/${patientId}/allergies/${allergyId}`);
      return true;
    } catch {
      // Fallback offline
    }

    // Offline: xóa khỏi localStorage
    const allergies = getStoredAllergies();
    const filtered = allergies.filter(a => a.id !== allergyId);
    localStorage.setItem(PATIENT_ALLERGIES_KEY, JSON.stringify(filtered));
    return true;
  }
};
