import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

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
    const token = localStorage.getItem('hms_token');
    if (token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors & Token Refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // Auto logout on 401 Unauthorized if not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      window.dispatchEvent(new Event('hms_auth_changed'));
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
export { BASE_URL };
