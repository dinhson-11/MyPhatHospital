import apiClient from './api';

/**
 * Quản lý tài khoản (chỉ Quản trị viên) – khớp UserController:
 *   GET    /users?page&size&search   → Page<UserResponse> trong data
 *   POST   /users                    → tạo tài khoản
 *   PUT    /users/{id}               → sửa họ tên, email, SĐT, vai trò, hồ sơ nhân viên
 *   PATCH  /users/{id}/lock|unlock   → khóa / mở khóa
 * Lỗi nghiệp vụ (trùng tên đăng nhập, email...) được ném nguyên để giao diện hiện đúng thông báo của máy chủ.
 */

/** Vai trò hệ thống (mã khớp bảng roles). */
export const ROLE_OPTIONS = [
  { code: 'ADMIN', label: 'Quản trị viên', staff: false },
  { code: 'DOCTOR', label: 'Bác sĩ', staff: true },
  { code: 'NURSE', label: 'Điều dưỡng', staff: true },
  { code: 'PHARMACIST', label: 'Dược sĩ', staff: true },
  { code: 'RECEPTIONIST', label: 'Lễ tân - Kế toán', staff: true },
  { code: 'PATIENT', label: 'Bệnh nhân', staff: false }
];

export const roleLabel = (code) => {
  const key = String(code || '').replace(/^ROLE_/, '');
  return ROLE_OPTIONS.find((r) => r.code === key)?.label || key;
};

const unwrap = (res) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

export const userService = {
  /** Một trang tài khoản. Trả { items, totalPages, totalElements, page }. */
  async getUsers({ page = 0, size = 20, search = '' } = {}) {
    const params = { page, size, sortBy: 'createdAt', sortDir: 'desc' };
    if (search && search.trim()) params.search = search.trim();
    const res = await apiClient.get('/users', { params });
    const data = unwrap(res) || {};
    return {
      items: Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : [],
      totalPages: data.totalPages ?? 1,
      totalElements: data.totalElements ?? (Array.isArray(data.content) ? data.content.length : 0),
      page: data.number ?? page
    };
  },

  async createUser(payload) {
    return unwrap(await apiClient.post('/users', payload));
  },

  async updateUser(id, payload) {
    return unwrap(await apiClient.put(`/users/${id}`, payload));
  },

  async lockUser(id) {
    await apiClient.patch(`/users/${id}/lock`);
  },

  async unlockUser(id) {
    await apiClient.patch(`/users/${id}/unlock`);
  }
};

export default userService;
