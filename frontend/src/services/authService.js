import apiClient from './api';
import { getErrorMessage, isNetworkError, NETWORK_ERROR_MESSAGE } from './apiError';

const TOKEN_KEY = 'hms_token';
const REFRESH_TOKEN_KEY = 'hms_refresh_token';
const USER_KEY = 'hms_user';

// Dọn khóa cũ của chế độ đăng ký ngoại tuyến (từng lưu MẬT KHẨU dạng rõ trong localStorage)
try {
  localStorage.removeItem('hms_registered_users');
} catch {
  // localStorage có thể bị chặn – bỏ qua
}

/**
 * Xác thực người dùng qua backend. Không còn đăng nhập/đăng ký ngoại tuyến hay token giả:
 * mất kết nối thì báo lỗi, không tự "đăng nhập thành công".
 */
const failure = (err, fallback) => {
  if (err?.response) return new Error(getErrorMessage(err, fallback));
  return new Error(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : getErrorMessage(err, NETWORK_ERROR_MESSAGE));
};

export const authService = {
  async login(username, password) {
    let res;
    try {
      res = await apiClient.post('/auth/login', { username, password });
    } catch (err) {
      throw failure(err, 'Tên đăng nhập hoặc mật khẩu không chính xác!');
    }
    if (!res?.data?.accessToken) throw new Error('Phản hồi đăng nhập không hợp lệ từ máy chủ.');
    const { user, accessToken, refreshToken } = res.data;
    this.saveSession(user, accessToken, refreshToken);
    return { success: true, user, token: accessToken };
  },

  async register(registrationData) {
    const { fullName, username, email, phone, password } = registrationData;
    let res;
    try {
      res = await apiClient.post('/auth/register', { fullName, username, email, phone, password });
    } catch (err) {
      throw failure(err, 'Không thể đăng ký tài khoản. Vui lòng kiểm tra lại thông tin.');
    }
    if (!res?.data?.accessToken) throw new Error('Phản hồi đăng ký không hợp lệ từ máy chủ.');
    const { user, accessToken, refreshToken } = res.data;
    // Không lưu mật khẩu vào trình duyệt – phiên đăng nhập chỉ giữ token và hồ sơ người dùng
    this.saveSession(user, accessToken, refreshToken);
    return { success: true, user, token: accessToken };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('hms_auth_changed'));
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  saveSession(user, token, refreshToken) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    window.dispatchEvent(new Event('hms_auth_changed'));
  }
};
