import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const TOKEN_KEY = 'hms_token';
const REFRESH_TOKEN_KEY = 'hms_refresh_token';
const USER_KEY = 'hms_user';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('hms_auth_changed'));
};

// Chỉ một lần gọi refresh tại một thời điểm: các request song song cùng chờ kết quả này
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return Promise.reject(new Error('NO_REFRESH_TOKEN'));
    // Dùng axios thuần (không qua interceptor) để lỗi refresh không gây vòng lặp
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh-token`, { refreshToken }, { timeout: 5000 })
      .then((res) => {
        const accessToken = res.data?.data?.accessToken;
        if (!accessToken) throw new Error('INVALID_REFRESH_RESPONSE');
        localStorage.setItem(TOKEN_KEY, accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Response Interceptor: unwrap body; 401 -> thử làm mới token một lần rồi gửi lại request gốc
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const isAuthCall = String(originalRequest?.url || '').includes('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Máy chủ từ chối refresh token (hết hạn / bị thu hồi / không có) → đăng xuất.
        // Chỉ mất mạng / timeout lúc làm mới thì GIỮ phiên: người dùng thử lại được khi có mạng.
        const transient = refreshError?.isAxiosError && !refreshError.response;
        if (!transient) clearSession();
      }
    } else if (error.response?.status === 401 && !isAuthCall) {
      clearSession();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { BASE_URL };
