import apiClient from './api';

const SEED_USERS_KEY = 'hms_registered_users';
const TOKEN_KEY = 'hms_token';
const USER_KEY = 'hms_user';

const DEFAULT_SEEDS = [
  {
    id: 1,
    username: 'admin',
    password: 'Admin@123',
    fullName: 'Quản trị viên Hệ thống',
    email: 'admin@hospital.com',
    phone: '0900000000',
    roles: ['ADMIN']
  },
  {
    id: 2,
    username: 'benhnhan',
    password: 'Password@123',
    fullName: 'Trần Đức Minh',
    email: 'minh.tran@gmail.com',
    phone: '0912345678',
    roles: ['PATIENT']
  },
  {
    id: 3,
    username: 'bacsi',
    password: 'Doctor@123',
    fullName: 'TS. BS. Nguyễn Văn Hùng',
    email: 'hung.nguyen@hospital.com',
    phone: '0988776655',
    roles: ['DOCTOR']
  }
];

// Helper lấy danh sách user từ LocalStorage hoặc seed nếu chưa có
const getSeedUsers = () => {
  const raw = localStorage.getItem(SEED_USERS_KEY);
  if (!raw) {
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(DEFAULT_SEEDS));
    return [...DEFAULT_SEEDS];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_SEEDS];
  }
};

export const authService = {
  async login(username, password) {
    try {
      // 1. Thử gọi backend API thực tế
      const res = await apiClient.post('/auth/login', { username, password });
      if (res && res.data) {
        const { user, accessToken } = res.data;
        this.saveSession(user, accessToken);
        return { success: true, user, token: accessToken };
      }
    } catch {
      // Fallback khi backend offline hoặc test
    }

    // 2. Fallback offline cho môi trường dev & test
    const users = getSeedUsers();
    const matchedUser = users.find(u => u.username === username && u.password === password);

    if (matchedUser) {
      const token = `jwt_mock_${matchedUser.roles[0].toLowerCase()}_${Date.now()}`;
      const userProfile = {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        email: matchedUser.email,
        phone: matchedUser.phone,
        roles: matchedUser.roles
      };
      this.saveSession(userProfile, token);
      return { success: true, user: userProfile, token };
    }

    throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác!');
  },

  async register(registrationData) {
    const { fullName, username, email, phone, password } = registrationData;

    try {
      // 1. Thử gọi backend API
      const res = await apiClient.post('/auth/register', { fullName, username, email, phone, password });
      if (res && res.data) {
        const { user, accessToken } = res.data;
        this.saveSession(user, accessToken);
        // Đồng bộ vào seed users cục bộ
        const users = getSeedUsers();
        if (!users.some(u => u.username === username)) {
          users.push({
            id: user?.id || users.length + 1,
            fullName,
            username,
            email,
            phone,
            password,
            roles: user?.roles || ['PATIENT']
          });
          localStorage.setItem(SEED_USERS_KEY, JSON.stringify(users));
        }
        return { success: true, user, token: accessToken };
      }
    } catch (err) {
      // Nếu backend chủ động trả về mã lỗi (như trùng username), re-throw lỗi
      if (err.response) {
        throw new Error(err.response.data?.message || 'Tên đăng nhập đã tồn tại trên hệ thống!');
      }
      // Chỉ fallback khi backend offline / network error
    }

    // 2. Fallback offline
    const users = getSeedUsers();
    if (users.some(u => u.username === username)) {
      throw new Error('Tên đăng nhập đã tồn tại trên hệ thống!');
    }

    const newUser = {
      id: users.length + 1,
      fullName,
      username,
      email,
      phone,
      password,
      roles: ['PATIENT']
    };

    users.push(newUser);
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(users));

    const token = `jwt_mock_patient_${Date.now()}`;
    const userProfile = {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      roles: newUser.roles
    };

    this.saveSession(userProfile, token);
    return { success: true, user: userProfile, token };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
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

  saveSession(user, token) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event('hms_auth_changed'));
  }
};
