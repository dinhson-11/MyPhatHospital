import api from './api';
import { hoursCompact } from './hospitalHours';

const LOCAL_STORAGE_KEY_SCHEDULES = 'hms_mock_schedules_v3';
const LOCAL_STORAGE_KEY_VERSION = 'hms_schedule_version';
const CURRENT_SCHEDULE_VERSION = 'v3_myphat_hospital';

// Danh bạ 11 Bác sĩ, Dược sĩ & Nhân sự lâm sàng chuẩn Mỹ Phát Hospital
export const MOCK_STAFF_MEMBERS = [
  {
    id: 1,
    userId: 8,
    username: 'bs.maianh',
    fullName: 'TS.BS Vi Mai Anh',
    specialty: 'Khám chữa bệnh & Nội tổng quát',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    phone: '0912111222',
    licenseNo: 'CCHN-001289-BYT',
    roomNo: 'Phòng khám ban đầu 101 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1594824813637-44f0b2f52803?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 6,
    userId: 9,
    username: 'bs.nga',
    fullName: 'BSCKII. Lê Thị Nga',
    specialty: 'Trưởng khoa Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    departmentId: 2,
    departmentName: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    phone: '0912222333',
    licenseNo: 'CCHN-002341-BYT',
    roomNo: 'Phòng khám Ngoại 402 (Tầng 4)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2, 4, 6 (${hoursCompact()})`
  },
  {
    id: 7,
    userId: 10,
    username: 'bs.vy',
    fullName: 'BSCKII. Phạm Lan Vy',
    specialty: 'Bác sĩ phụ trách Sản - Phụ khoa • Khám thai & Phụ khoa',
    departmentId: 3,
    departmentName: 'Sản - Phụ khoa',
    phone: '0912333444',
    licenseNo: 'CCHN-003456-BYT',
    roomNo: 'Phòng khám Sản 302 (Tầng 3)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 6 (${hoursCompact()})`
  },
  {
    id: 8,
    userId: 11,
    username: 'bs.dung',
    fullName: 'ThS.BS Hoàng Thị Dung',
    specialty: 'Trưởng khoa Tai Mũi Họng • Hô hấp & Thanh quản',
    departmentId: 10,
    departmentName: 'Tai Mũi Họng',
    phone: '0912444555',
    licenseNo: 'CCHN-004567-BYT',
    roomNo: 'Phòng khám TMH 212 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2, 4, 6 (${hoursCompact()})`
  },
  {
    id: 9,
    userId: 12,
    username: 'bs.sy',
    fullName: 'BS. Nguyễn Văn Sỹ',
    specialty: 'Khoa Y học cổ truyền – Phục hồi chức năng • Cơ xương khớp',
    departmentId: 13,
    departmentName: 'Khoa Y học cổ truyền – Phục hồi chức năng',
    phone: '0912555666',
    licenseNo: 'CCHN-005678-BYT',
    roomNo: 'Phòng Trị liệu PHCN 206 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 10,
    userId: 13,
    username: 'bs.hiep',
    fullName: 'ThS.BS Lê Tuấn Hiệp',
    specialty: 'Bác sĩ chuyên trách Thẩm mỹ / Tạo hình • Nâng mũi & Da liễu',
    departmentId: 14,
    departmentName: 'Dịch vụ Thẩm mỹ / Tạo hình',
    phone: '0912666777',
    licenseNo: 'CCHN-006789-BYT',
    roomNo: 'Phòng Thẩm mỹ 209 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 3, 5, 7 (${hoursCompact()})`
  },
  {
    id: 11,
    userId: 14,
    username: 'bs.an',
    fullName: 'TS.BS Trần Thị An',
    specialty: 'Khoa Chẩn đoán hình ảnh • Siêu âm 4D & Tim mạch',
    departmentId: 15,
    departmentName: 'Khoa Chẩn đoán hình ảnh',
    phone: '0912777888',
    licenseNo: 'CCHN-007890-BYT',
    roomNo: 'Phòng Siêu âm 104 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 12,
    userId: 15,
    username: 'bs.toan',
    fullName: 'ThS.BS Hoàng Văn Toán',
    specialty: 'Khoa Xét nghiệm • Huyết học, Sinh hóa & Test nhanh',
    departmentId: 16,
    departmentName: 'Khoa Xét nghiệm',
    phone: '0912888999',
    licenseNo: 'CCHN-008901-BYT',
    roomNo: 'Khu Xét nghiệm 105 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 2,
    userId: 16,
    username: 'ds.quang',
    fullName: 'ThS.DS Lê Hải Quang',
    specialty: 'Trưởng Phòng Dược • Quản lý kho GPP & Dược lâm sàng',
    departmentId: 12,
    departmentName: 'Phòng Dược & Cung ứng thuốc',
    phone: '0978666555',
    licenseNo: 'CCHN-009012-BYT',
    roomNo: 'Phòng Dược Tầng 1 (Khu A)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 3,
    userId: 4,
    username: 'letan',
    fullName: 'CN. Hoàng Thùy Linh',
    specialty: 'Tiếp đón, Điều phối lịch & Thủ tục BHYT',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    phone: '0945678901',
    licenseNo: 'CCHN-003312-BYT',
    roomNo: 'Quầy Tiếp đón & Giám định BHYT',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  },
  {
    id: 4,
    userId: 5,
    username: 'dieuduong',
    fullName: 'ĐD. Phạm Thu Hà',
    specialty: 'Điều dưỡng lâm sàng & Chăm sóc sinh hiệu bệnh nhân',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    phone: '0956789012',
    licenseNo: 'CCHN-004423-BYT',
    roomNo: 'Khu Chăm sóc sinh hiệu & Lấy mẫu',
    avatar: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
    schedulePattern: `Thứ 2 đến Thứ 7 (${hoursCompact()})`
  }
];

const getMondayDate = (refDate = new Date()) => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const formatDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Sinh lịch trực chuẩn 7 ngày cho tuần tương ứng dựa trên phân công thực tế của Mỹ Phát Hospital
 */
export const generateBaseSchedulesForMonday = (monday) => {
  const schedules = [];
  let seq = 1;

  const addShift = (staff, dayOffset, shift, note) => {
    const shiftDate = new Date(monday);
    shiftDate.setDate(monday.getDate() + dayOffset);
    const dateStr = formatDateStr(shiftDate);

    schedules.push({
      id: Number(`${staff.id}${dayOffset}${shift === 'MORNING' ? 1 : shift === 'AFTERNOON' ? 2 : shift === 'NIGHT' ? 3 : 4}`),
      staffId: staff.id,
      staffName: staff.fullName,
      specialty: staff.specialty,
      departmentId: staff.departmentId,
      departmentName: staff.departmentName,
      workDate: dateStr,
      shift,
      roomNo: staff.roomNo,
      note
    });
  };

  const viMaiAnh = MOCK_STAFF_MEMBERS.find(s => s.id === 1);
  const leThiNga = MOCK_STAFF_MEMBERS.find(s => s.id === 6);
  const phamLanVy = MOCK_STAFF_MEMBERS.find(s => s.id === 7);
  const hoangThiDung = MOCK_STAFF_MEMBERS.find(s => s.id === 8);
  const nguyenVanSy = MOCK_STAFF_MEMBERS.find(s => s.id === 9);
  const leTuanHiep = MOCK_STAFF_MEMBERS.find(s => s.id === 10);
  const tranThiAn = MOCK_STAFF_MEMBERS.find(s => s.id === 11);
  const hoangVanToan = MOCK_STAFF_MEMBERS.find(s => s.id === 12);
  const leHaiQuang = MOCK_STAFF_MEMBERS.find(s => s.id === 2);
  const hoangThuyLinh = MOCK_STAFF_MEMBERS.find(s => s.id === 3);
  const phamThuHa = MOCK_STAFF_MEMBERS.find(s => s.id === 4);

  // 1. TS.BS Vi Mai Anh: Thứ 2 -> Thứ 7 (Sáng + Chiều), Trực Đêm Thứ 4 & Chủ Nhật
  if (viMaiAnh) {
    for (let day = 0; day <= 5; day++) {
      addShift(viMaiAnh, day, 'MORNING', 'Trực khám bệnh ban đầu buổi sáng');
      addShift(viMaiAnh, day, 'AFTERNOON', 'Khám nội tổng quát & hội chẩn chuyên khoa');
    }
    addShift(viMaiAnh, 2, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7');
    addShift(viMaiAnh, 6, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7');
  }

  // 2. BSCKII. Lê Thị Nga: Thứ 2, 4, 6 (Sáng + Chiều)
  if (leThiNga) {
    [0, 2, 4].forEach(day => {
      addShift(leThiNga, day, 'MORNING', 'Khám Ngoại tổng quát & hội chẩn mổ');
      addShift(leThiNga, day, 'AFTERNOON', 'Tiểu phẫu ống cổ tay & phẫu thuật nhỏ');
    });
  }

  // 3. BSCKII. Phạm Lan Vy: Thứ 2 -> Thứ 6 (Sáng + Chiều)
  if (phamLanVy) {
    for (let day = 0; day <= 4; day++) {
      addShift(phamLanVy, day, 'MORNING', 'Khám Sản - Phụ khoa & Quản lý thai');
      addShift(phamLanVy, day, 'AFTERNOON', 'Tư vấn thai kỳ & kế hoạch hóa gia đình');
    }
  }

  // 4. ThS.BS Hoàng Thị Dung: Thứ 2, 4, 6 (Sáng + Chiều)
  if (hoangThiDung) {
    [0, 2, 4].forEach(day => {
      addShift(hoangThiDung, day, 'MORNING', 'Khám TMH & Nội soi thanh quản');
      addShift(hoangThiDung, day, 'AFTERNOON', 'Điều trị viêm xoang, khàn tiếng');
    });
  }

  // 5. BS. Nguyễn Văn Sỹ: Thứ 2 -> Thứ 7 (Sáng + Chiều)
  if (nguyenVanSy) {
    for (let day = 0; day <= 5; day++) {
      addShift(nguyenVanSy, day, 'MORNING', 'Khám cơ xương khớp & YHCT');
      addShift(nguyenVanSy, day, 'AFTERNOON', 'Vật lý trị liệu phục hồi chức năng');
    }
  }

  // 6. ThS.BS Lê Tuấn Hiệp: Thứ 3, 5, 7 (Sáng + Chiều)
  if (leTuanHiep) {
    [1, 3, 5].forEach(day => {
      addShift(leTuanHiep, day, 'MORNING', 'Tư vấn Thẩm mỹ tạo hình & Nâng mũi');
      addShift(leTuanHiep, day, 'AFTERNOON', 'Chăm sóc tái tạo da & laser vi điểm');
    });
  }

  // 7. TS.BS Trần Thị An: Thứ 2 -> Thứ 7 (Sáng + Chiều)
  if (tranThiAn) {
    for (let day = 0; day <= 5; day++) {
      addShift(tranThiAn, day, 'MORNING', 'Siêu âm 4D màu thai & ổ bụng');
      addShift(tranThiAn, day, 'AFTERNOON', 'Chụp X-quang số hóa & đọc kết quả CĐHA');
    }
  }

  // 8. ThS.BS Hoàng Văn Toán: Thứ 2 -> Thứ 7 (Sáng + Chiều)
  if (hoangVanToan) {
    for (let day = 0; day <= 5; day++) {
      addShift(hoangVanToan, day, 'MORNING', 'Xét nghiệm huyết học, sinh hóa & test cúm');
      addShift(hoangVanToan, day, 'AFTERNOON', 'Xét nghiệm ký sinh trùng & vi sinh');
    }
  }

  // 9. ThS.DS Lê Hải Quang: Thứ 2 -> Thứ 7 (Sáng + Chiều)
  if (leHaiQuang) {
    for (let day = 0; day <= 5; day++) {
      addShift(leHaiQuang, day, 'MORNING', 'Cấp phát thuốc BHYT & ngoại trú theo đơn');
      addShift(leHaiQuang, day, 'AFTERNOON', 'Tư vấn dược lâm sàng & kiểm kê kho GPP');
    }
  }

  // 10. CN. Hoàng Thùy Linh: Thứ 2 -> Thứ 7 (Sáng + Chiều)
  if (hoangThuyLinh) {
    for (let day = 0; day <= 5; day++) {
      addShift(hoangThuyLinh, day, 'MORNING', 'Tiếp đón bệnh nhân & phân luồng khám');
      addShift(hoangThuyLinh, day, 'AFTERNOON', 'Giám định thẻ BHYT & hướng dẫn thủ tục');
    }
  }

  // 11. ĐD. Phạm Thu Hà: Thứ 2 -> Thứ 7 (Sáng + Chiều), Trực Đêm Thứ 2 & Thứ 6
  if (phamThuHa) {
    for (let day = 0; day <= 5; day++) {
      addShift(phamThuHa, day, 'MORNING', 'Đo sinh hiệu huyết áp, SpO2 ban đầu');
      addShift(phamThuHa, day, 'AFTERNOON', 'Hỗ trợ lấy mẫu xét nghiệm & buồng khám');
    }
    addShift(phamThuHa, 0, 'NIGHT', 'Trực cấp cứu theo dõi bệnh nhân');
    addShift(phamThuHa, 4, 'NIGHT', 'Trực cấp cứu theo dõi bệnh nhân');
  }

  return schedules;
};

const getStoredSchedules = () => {
  try {
    const storedVersion = localStorage.getItem(LOCAL_STORAGE_KEY_VERSION);
    if (storedVersion !== CURRENT_SCHEDULE_VERSION) {
      localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULES);
      localStorage.setItem(LOCAL_STORAGE_KEY_VERSION, CURRENT_SCHEDULE_VERSION);
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULES);
    if (!raw) {
      const initial = generateBaseSchedulesForMonday(getMondayDate(new Date()));
      localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi khi đọc lịch trực từ storage:', e);
    return generateBaseSchedulesForMonday(getMondayDate(new Date()));
  }
};

const saveStoredSchedules = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULES, JSON.stringify(list));
    localStorage.setItem(LOCAL_STORAGE_KEY_VERSION, CURRENT_SCHEDULE_VERSION);
  } catch (e) {
    console.error('Lỗi khi ghi lịch trực:', e);
  }
};

export const scheduleService = {
  /**
   * Lấy danh bạ nhân sự y tế (FR-8.1)
   */
  async getStaffList(departmentId) {
    try {
      const res = await api.get('/staff', { params: { departmentId } });
      if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback cục bộ chuẩn
    }

    if (departmentId) {
      return MOCK_STAFF_MEMBERS.filter(s => s.departmentId === Number(departmentId));
    }
    return MOCK_STAFF_MEMBERS;
  },

  /**
   * Tra cứu lịch trực theo tuần/tháng (FR-8.2)
   */
  async getSchedules(params = {}) {
    try {
      const res = await api.get('/schedules', { params });
      if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    let schedules = getStoredSchedules();

    // Nếu tra cứu một tuần cụ thể và tuần đó chưa có trong storage, sinh lịch cho tuần đó
    if (params.startDate) {
      const targetMonday = getMondayDate(new Date(params.startDate));
      const targetMondayStr = formatDateStr(targetMonday);
      const hasWeek = schedules.some(s => {
        const sMon = formatDateStr(getMondayDate(new Date(s.workDate)));
        return sMon === targetMondayStr;
      });

      if (!hasWeek) {
        const weekSchedules = generateBaseSchedulesForMonday(targetMonday);
        schedules = [...schedules, ...weekSchedules];
        saveStoredSchedules(schedules);
      }
    }

    if (params.staffId) {
      schedules = schedules.filter(s => s.staffId === Number(params.staffId));
    }
    if (params.departmentId) {
      schedules = schedules.filter(s => s.departmentId === Number(params.departmentId));
    }
    if (params.startDate && params.endDate) {
      schedules = schedules.filter(s => s.workDate >= params.startDate && s.workDate <= params.endDate);
    }
    return schedules;
  },

  /**
   * Xếp lịch trực mới (Admin)
   */
  async createSchedule(data) {
    try {
      const res = await api.post('/schedules', data);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
    }

    // Fallback Offline & Chống trùng ca
    const schedules = getStoredSchedules();
    const isConflict = schedules.some(s =>
      s.staffId === Number(data.staffId) &&
      s.workDate === data.workDate &&
      s.shift === data.shift
    );
    if (isConflict) {
      throw new Error(`Nhân viên đã có lịch trực ca ${data.shift} vào ngày ${data.workDate}.`);
    }

    const staff = MOCK_STAFF_MEMBERS.find(s => s.id === Number(data.staffId)) || {};
    const newSchedule = {
      id: Date.now(),
      staffId: Number(data.staffId),
      staffName: staff.fullName || data.staffName || 'Nhân viên y tế',
      specialty: staff.specialty || '',
      departmentId: Number(data.departmentId || staff.departmentId || 1),
      departmentName: staff.departmentName || 'Khoa Khám bệnh / Cấp cứu ban đầu',
      workDate: data.workDate,
      shift: data.shift,
      roomNo: data.roomNo || staff.roomNo || 'Phòng khám ban đầu 101',
      note: data.note || ''
    };

    schedules.push(newSchedule);
    saveStoredSchedules(schedules);
    return newSchedule;
  },

  /**
   * Xóa lịch trực (Admin)
   */
  async deleteSchedule(id) {
    try {
      const res = await api.delete(`/schedules/${id}`);
      if (res?.success) {
        return true;
      }
    } catch {
      // Fallback
    }

    let schedules = getStoredSchedules();
    schedules = schedules.filter(s => s.id !== Number(id));
    saveStoredSchedules(schedules);
    return true;
  }
};

export default scheduleService;
