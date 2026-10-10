import apiClient from './api';

const SEED_USERS_KEY = 'hms_registered_users';
const TOKEN_KEY = 'hms_token';
const USER_KEY = 'hms_user';

const DEFAULT_SEEDS = [
  // --- QUẢN TRỊ VIÊN HỆ THỐNG & BAN GIÁM ĐỐC ---
  {
    id: 1,
    username: 'admin',
    password: 'Admin@123',
    fullName: 'Ban Giám Đốc Mỹ Phát Hospital',
    title: 'Giám Đốc Bệnh Viện',
    email: 'myphathospital@gmail.com',
    phone: '0789065493',
    roles: ['ADMIN']
  },

  // --- BỆNH NHÂN ĐĂNG KÝ KHÁM ---
  {
    id: 2,
    username: 'benhnhan',
    password: 'Password@123',
    fullName: 'Trần Đức Minh',
    email: 'minh.tran@gmail.com',
    phone: '0912345678',
    roles: ['PATIENT']
  },

  // --- BÁC SĨ CHUYÊN KHOA ĐỒNG BỘ 100% VỚI DANH SÁCH BỆNH VIỆN ---
  {
    id: 3,
    username: 'bacsi',
    password: 'Doctor@123',
    fullName: 'TS.BS Vi Mai Anh',
    title: 'Trưởng khoa Khám bệnh / Cấp cứu ban đầu',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    specialty: 'Khám chữa bệnh & Nội tổng quát',
    room: 'Phòng khám ban đầu 101 (Tầng 1)',
    email: 'bs.maianh@myphathospital.com',
    phone: '0912111222',
    roles: ['DOCTOR']
  },
  {
    id: 11,
    username: 'bs.maianh',
    password: 'Doctor@123',
    fullName: 'TS.BS Vi Mai Anh',
    title: 'Trưởng khoa Khám bệnh / Cấp cứu ban đầu',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    specialty: 'Khám chữa bệnh & Nội tổng quát',
    room: 'Phòng khám ban đầu 101 (Tầng 1)',
    email: 'bs.maianh@myphathospital.com',
    phone: '0912111222',
    roles: ['DOCTOR']
  },
  {
    id: 12,
    username: 'bs.nga',
    password: 'Doctor@123',
    fullName: 'BSCKII. Lê Thị Nga',
    title: 'Trưởng khoa Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    departmentId: 2,
    departmentName: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    specialty: 'Phẫu thuật ngoại khoa, tiểu phẫu ống cổ tay, xử lý tuyến mồ hôi nách',
    room: 'Phòng khám Ngoại 402 (Tầng 4)',
    email: 'bs.nga@myphathospital.com',
    phone: '0912222333',
    roles: ['DOCTOR']
  },
  {
    id: 13,
    username: 'bs.vy',
    password: 'Doctor@123',
    fullName: 'BSCKII. Phạm Lan Vy',
    title: 'Bác sĩ phụ trách Sản - Phụ khoa',
    departmentId: 3,
    departmentName: 'Sản - Phụ khoa',
    specialty: 'Khám tư vấn thai kỳ & Điều trị bệnh phụ khoa',
    room: 'Phòng khám Sản 302 (Tầng 3)',
    email: 'bs.vy@myphathospital.com',
    phone: '0912333444',
    roles: ['DOCTOR']
  },
  {
    id: 14,
    username: 'bs.dung',
    password: 'Doctor@123',
    fullName: 'ThS.BS Hoàng Thị Dung',
    title: 'Trưởng khoa Tai Mũi Họng',
    departmentId: 10,
    departmentName: 'Tai Mũi Họng',
    specialty: 'Bệnh lý hô hấp, nội soi thanh quản, điều trị khàn tiếng',
    room: 'Phòng khám TMH 212 (Tầng 2)',
    email: 'bs.dung@myphathospital.com',
    phone: '0912444555',
    roles: ['DOCTOR']
  },
  {
    id: 15,
    username: 'bs.sy',
    password: 'Doctor@123',
    fullName: 'BS. Nguyễn Văn Sỹ',
    title: 'Bác sĩ phụ trách Khoa YHCT – Phục hồi chức năng',
    departmentId: 13,
    departmentName: 'Khoa Y học cổ truyền – Phục hồi chức năng',
    specialty: 'Điều trị cơ xương khớp, khớp gối, cổ vai gáy, thoát vị đĩa đệm',
    room: 'Phòng Trị liệu PHCN 206 (Tầng 2)',
    email: 'bs.sy@myphathospital.com',
    phone: '0912555666',
    roles: ['DOCTOR']
  },
  {
    id: 16,
    username: 'bs.hiep',
    password: 'Doctor@123',
    fullName: 'ThS.BS Lê Tuấn Hiệp',
    title: 'Bác sĩ chuyên trách Thẩm mỹ / Tạo hình',
    departmentId: 14,
    departmentName: 'Dịch vụ Thẩm mỹ / Tạo hình',
    specialty: 'Thẩm mỹ tạo hình, nâng mũi, tái tạo da & laser thẩm mỹ',
    room: 'Phòng Thẩm mỹ 209 (Tầng 2)',
    email: 'bs.hiep@myphathospital.com',
    phone: '0912666777',
    roles: ['DOCTOR']
  },
  {
    id: 17,
    username: 'bs.an',
    password: 'Doctor@123',
    fullName: 'TS.BS Trần Thị An',
    title: 'Bác sĩ phụ trách Khoa Chẩn đoán hình ảnh',
    departmentId: 15,
    departmentName: 'Khoa Chẩn đoán hình ảnh',
    specialty: 'Siêu âm màu 4D, siêu âm thai, CĐHA kỹ thuật số & Tim mạch',
    room: 'Phòng Siêu âm 104 (Tầng 1)',
    email: 'bs.an@myphathospital.com',
    phone: '0912777888',
    roles: ['DOCTOR']
  },
  {
    id: 18,
    username: 'bs.toan',
    password: 'Doctor@123',
    fullName: 'ThS.BS Hoàng Văn Toán',
    title: 'Bác sĩ phụ trách Khoa Xét nghiệm',
    departmentId: 16,
    departmentName: 'Khoa Xét nghiệm',
    specialty: 'Xét nghiệm máu, nước tiểu, test nhanh cúm A/B, ký sinh trùng & Tiêu hóa',
    room: 'Khu Xét nghiệm 105 (Tầng 1)',
    email: 'bs.toan@myphathospital.com',
    phone: '0912888999',
    roles: ['DOCTOR']
  },

  // --- LỄ TÂN TIẾP ĐÓN ---
  {
    id: 4,
    username: 'letan',
    password: 'Receptionist@123',
    fullName: 'CN. Hoàng Thùy Linh',
    title: 'Chuyên viên Tiếp đón & Điều phối BHYT',
    departmentName: 'Quầy Tiếp đón & Giám định BHYT',
    email: 'letan.linh@myphathospital.com',
    phone: '0945678901',
    roles: ['RECEPTIONIST']
  },

  // --- ĐIỀU DƯỠNG VIÊN ---
  {
    id: 5,
    username: 'dieuduong',
    password: 'Nurse@123',
    fullName: 'ĐD. Phạm Thu Hà',
    title: 'Điều dưỡng viên Trưởng lâm sàng & Phòng Lab',
    departmentName: 'Khu Chăm sóc sinh hiệu & Lấy mẫu',
    email: 'dieuduong.ha@myphathospital.com',
    phone: '0956789012',
    roles: ['NURSE']
  },

  // --- TRƯỞNG PHÒNG DƯỢC ---
  {
    id: 6,
    username: 'duocsi',
    password: 'Pharmacist@123',
    fullName: 'ThS.DS Lê Hải Quang',
    title: 'Trưởng Phòng Dược Mỹ Phát Hospital',
    departmentId: 12,
    departmentName: 'Phòng Dược & Cung ứng thuốc',
    specialty: 'Quản lý kho thuốc GPP & Dược lâm sàng',
    room: 'Phòng Dược Tầng 1 (Khu A)',
    email: 'ds.quang@myphathospital.com',
    phone: '0978666555',
    roles: ['PHARMACIST']
  },
  {
    id: 19,
    username: 'ds.quang',
    password: 'Pharmacist@123',
    fullName: 'ThS.DS Lê Hải Quang',
    title: 'Trưởng Phòng Dược Mỹ Phát Hospital',
    departmentId: 12,
    departmentName: 'Phòng Dược & Cung ứng thuốc',
    specialty: 'Quản lý kho thuốc GPP & Dược lâm sàng',
    room: 'Phòng Dược Tầng 1 (Khu A)',
    email: 'ds.quang@myphathospital.com',
    phone: '0978666555',
    roles: ['PHARMACIST']
  },

  // --- KẾ TOÁN VIÊN ---
  {
    id: 7,
    username: 'ketoan',
    password: 'Accountant@123',
    fullName: 'KT. Trần Thị Hoa',
    title: 'Kế toán trưởng Viện phí & Thu ngân',
    departmentName: 'Phòng Kế toán & Tài chính',
    email: 'ketoan.hoa@myphathospital.com',
    phone: '0923456789',
    roles: ['ACCOUNTANT']
  }
];

// Helper lấy danh sách user từ LocalStorage hoặc seed nếu chưa có (tự động đồng bộ seed mới)
const getSeedUsers = () => {
  const raw = localStorage.getItem(SEED_USERS_KEY);
  if (!raw) {
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(DEFAULT_SEEDS));
    return [...DEFAULT_SEEDS];
  }
  try {
    const stored = JSON.parse(raw);
    // Luôn merge danh sách DEFAULT_SEEDS mới nhất để đảm bảo các tài khoản bác sĩ và vai trò mới được cập nhật
    const mergedMap = new Map();
    DEFAULT_SEEDS.forEach((u) => mergedMap.set(u.username, u));
    stored.forEach((u) => {
      // Giữ lại các user đăng ký mới của bệnh nhân mà không ghi đè seeds hệ thống
      if (!mergedMap.has(u.username)) {
        mergedMap.set(u.username, u);
      }
    });
    const result = Array.from(mergedMap.values());
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(result));
    return result;
  } catch {
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(DEFAULT_SEEDS));
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
    } catch (err) {
      // Backend đã phản hồi (vd. 401 sai mật khẩu) -> KHÔNG được fallback offline
      if (err?.response) {
        throw new Error(err.response.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
      }
      // Backend không truy cập được: chỉ cho phép tài khoản mẫu ở môi trường dev/test
      if (!import.meta.env.DEV) {
        throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
      }
    }

    // 2. Fallback offline cho môi trường dev & test (chỉ khi backend không phản hồi)
    const users = getSeedUsers();
    const matchedUser = users.find(u => {
      if (u.username !== username) return false;
      if (u.password === password) return true;
      // Hỗ trợ alias mật khẩu dùng thử
      if (password === 'Password@123') return true;
      if (username === 'letan' && (password === 'Reception@123' || password === 'Receptionist@123')) return true;
      if (u.roles.includes('DOCTOR') && password === 'Doctor@123') return true;
      return false;
    });

    if (matchedUser) {
      const token = `jwt_mock_${matchedUser.roles[0].toLowerCase()}_${Date.now()}`;
      const userProfile = {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        title: matchedUser.title,
        departmentId: matchedUser.departmentId,
        departmentName: matchedUser.departmentName,
        specialty: matchedUser.specialty,
        room: matchedUser.room,
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
