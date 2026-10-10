import apiClient from './api';
import { hoursCompact } from './hospitalHours';

/**
 * Data Service – Dữ liệu chuẩn dự án HMS-AI
 * Khớp với V10__seed_data.sql và các Entity Department, StaffProfile
 */

export const DEPARTMENTS = [
  // --- CHUYÊN KHOA LÂM SÀNG ---
  {
    id: 1,
    name: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    shortName: 'Khám bệnh / Cấp cứu',
    code: 'KHAM_BENH_CAP_CUU',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Tiếp nhận khám, chẩn đoán, điều trị các bệnh lý nội khoa, ngoại khoa thông thường và xử lý sơ cứu kịp thời.',
    icon: 'emergency',
    doctorsCount: 8,
    room: 'Tầng 1 (Khu Tiếp nhận & Cấp cứu ban đầu)',
    canBook: true
  },
  {
    id: 13,
    name: 'Khoa Y học cổ truyền – Phục hồi chức năng',
    shortName: 'YHCT – Phục hồi chức năng',
    code: 'YHCT_PHCN',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Chuyên trị các bệnh lý về cơ xương khớp như đau khớp gối, đau cổ vai gáy, đau lưng, thoát vị đĩa đệm bằng phương pháp vật lý trị liệu và Đông y.',
    icon: 'accessibility_new',
    doctorsCount: 6,
    room: 'Phòng 206 - 208 (Tầng 2)',
    canBook: true
  },
  {
    id: 3,
    name: 'Sản - Phụ khoa',
    shortName: 'Sản - Phụ khoa',
    code: 'SAN_PHU_KHOA',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Khám, tư vấn quản lý thai kỳ và điều trị các bệnh phụ khoa thường gặp.',
    icon: 'pregnant_woman',
    doctorsCount: 6,
    room: 'Phòng 301 - 304 (Tầng 3)',
    canBook: true
  },
  {
    id: 10,
    name: 'Tai Mũi Họng',
    shortName: 'Tai Mũi Họng',
    code: 'TAI_MUI_HONG',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Khám và điều trị các bệnh lý về đường hô hấp, dây thanh quản, khàn tiếng.',
    icon: 'hearing',
    doctorsCount: 5,
    room: 'Phòng 211 - 213 (Tầng 2)',
    canBook: true
  },
  {
    id: 2,
    name: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    shortName: 'Ngoại khoa & Tiểu phẫu',
    code: 'NGOAI_TIEU_PHAU',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Thực hiện một số thủ thuật ngoại khoa nhỏ như phẫu thuật hội chứng ống cổ tay, xử lý tuyến mồ hôi nách, điều trị vết thương nông.',
    icon: 'healing',
    doctorsCount: 6,
    room: 'Phòng 401 - 403 (Tầng 4)',
    canBook: true
  },
  {
    id: 14,
    name: 'Dịch vụ Thẩm mỹ / Tạo hình',
    shortName: 'Thẩm mỹ / Tạo hình',
    code: 'THAM_MY_TAO_HINH',
    category: 'CLINICAL',
    categoryName: 'Chuyên khoa lâm sàng',
    desc: 'Có bác sĩ chuyên trách hỗ trợ các dịch vụ như nâng mũi, chăm sóc tái tạo da và thẩm mỹ công nghệ cao.',
    icon: 'auto_fix_high',
    doctorsCount: 4,
    room: 'Phòng Thẩm mỹ 209 (Tầng 2)',
    canBook: true
  },

  // --- KHOA CẬN LÂM SÀNG & TIỆN ÍCH HỖ TRỢ ---
  {
    id: 15,
    name: 'Khoa Chẩn đoán hình ảnh',
    shortName: 'Chẩn đoán hình ảnh',
    code: 'CHAN_DOAN_HINH_ANH',
    category: 'SUPPORT',
    categoryName: 'Cận lâm sàng & Tiện ích hỗ trợ',
    desc: 'Siêu âm (siêu âm thai, siêu âm tổng quát) và các dịch vụ chụp chiếu kỹ thuật số giúp phát hiện chính xác bệnh lý.',
    icon: 'radiology',
    doctorsCount: 6,
    room: 'Khu CĐHA Tầng 1 (Máy siêu âm 4D, X-quang số hóa)',
    canBook: false
  },
  {
    id: 16,
    name: 'Khoa Xét nghiệm',
    shortName: 'Xét nghiệm y khoa',
    code: 'XET_NGHIEM',
    category: 'SUPPORT',
    categoryName: 'Cận lâm sàng & Tiện ích hỗ trợ',
    desc: 'Thực hiện đầy đủ xét nghiệm máu, nước tiểu, test nhanh cúm A/B, xét nghiệm ký sinh trùng (như Demodex).',
    icon: 'biotech',
    doctorsCount: 7,
    room: 'Khu Xét nghiệm Trung tâm (Tầng 1)',
    canBook: false
  },
  {
    id: 17,
    name: 'Dịch vụ Bảo hiểm Y tế (BHYT)',
    shortName: 'Bảo hiểm Y tế (BHYT)',
    code: 'BHYT',
    category: 'SUPPORT',
    categoryName: 'Cận lâm sàng & Tiện ích hỗ trợ',
    desc: 'Phòng khám áp dụng thanh toán và đảm bảo đúng quyền lợi bảo hiểm y tế cho người dân khi đến khám từ Thứ 2 đến Thứ 7 hàng tuần.',
    icon: 'verified_user',
    doctorsCount: 0,
    room: 'Quầy Tiếp đón & Giám định BHYT (Tầng 1)',
    canBook: false
  },

  // Phòng Dược hỗ trợ
  {
    id: 12,
    name: 'Phòng Dược & Cung ứng thuốc',
    shortName: 'Phòng Dược',
    code: 'DUOC',
    category: 'SUPPORT',
    categoryName: 'Cận lâm sàng & Tiện ích hỗ trợ',
    desc: 'Quản lý, cung ứng thuốc đạt chuẩn GPP và tư vấn sử dụng thuốc an toàn, hợp lý cho bệnh nhân.',
    icon: 'medication',
    doctorsCount: 4,
    room: 'Phòng Dược Tầng 1 (Khu A)',
    canBook: false
  }
];

export const DOCTORS = [
  {
    id: 1,
    name: 'TS.BS Vi Mai Anh',
    username: 'bs.maianh',
    title: 'Trưởng khoa Khám bệnh / Cấp cứu ban đầu',
    departmentId: 1,
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    experience: '22+ năm kinh nghiệm • Chuyên gia Khám chữa bệnh & Nội tổng quát',
    rating: 5.0,
    reviewsCount: 428,
    fee: 350000,
    room: 'Phòng khám ban đầu 101 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1594824813637-44f0b2f52803?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 7 (${hoursCompact()})`,
    available: true
  },
  {
    id: 2,
    name: 'BSCKII. Lê Thị Nga',
    username: 'bs.nga',
    title: 'Trưởng khoa Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    departmentId: 2,
    departmentName: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    experience: '20+ năm kinh nghiệm • Phẫu thuật ngoại khoa, tiểu phẫu ống cổ tay, xử lý tuyến mồ hôi nách',
    rating: 4.9,
    reviewsCount: 345,
    fee: 350000,
    room: 'Phòng khám Ngoại 402 (Tầng 4)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2, 4, 6 (${hoursCompact()})`,
    available: true
  },
  {
    id: 3,
    name: 'BSCKII. Phạm Lan Vy',
    username: 'bs.vy',
    title: 'Bác sĩ phụ trách Sản - Phụ khoa',
    departmentId: 3,
    departmentName: 'Sản - Phụ khoa',
    experience: '18+ năm kinh nghiệm • Khám tư vấn thai kỳ & Điều trị bệnh phụ khoa',
    rating: 5.0,
    reviewsCount: 516,
    fee: 300000,
    room: 'Phòng khám Sản 302 (Tầng 3)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 6 (${hoursCompact()})`,
    available: true
  },
  {
    id: 4,
    name: 'ThS.BS Hoàng Thị Dung',
    username: 'bs.dung',
    title: 'Trưởng khoa Tai Mũi Họng',
    departmentId: 10,
    departmentName: 'Tai Mũi Họng',
    experience: '15+ năm kinh nghiệm • Bệnh lý hô hấp, nội soi thanh quản, điều trị khàn tiếng',
    rating: 4.8,
    reviewsCount: 265,
    fee: 280000,
    room: 'Phòng khám TMH 212 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2, 4, 6 (${hoursCompact()})`,
    available: true
  },
  {
    id: 5,
    name: 'BS. Nguyễn Văn Sỹ',
    username: 'bs.sy',
    title: 'Bác sĩ phụ trách Khoa YHCT – Phục hồi chức năng',
    departmentId: 13,
    departmentName: 'Khoa Y học cổ truyền – Phục hồi chức năng',
    experience: '16+ năm kinh nghiệm • Điều trị cơ xương khớp, khớp gối, cổ vai gáy, thoát vị đĩa đệm',
    rating: 4.9,
    reviewsCount: 310,
    fee: 300000,
    room: 'Phòng Trị liệu PHCN 206 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 7 (${hoursCompact()})`,
    available: true
  },
  {
    id: 6,
    name: 'ThS.BS Lê Tuấn Hiệp',
    username: 'bs.hiep',
    title: 'Bác sĩ chuyên trách Thẩm mỹ / Tạo hình & Da liễu',
    departmentId: 14,
    departmentName: 'Dịch vụ Thẩm mỹ / Tạo hình',
    experience: '14+ năm kinh nghiệm • Thẩm mỹ tạo hình, nâng mũi, tái tạo da & laser thẩm mỹ',
    rating: 4.9,
    reviewsCount: 290,
    fee: 350000,
    room: 'Phòng Thẩm mỹ 209 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 3, 5, 7 (${hoursCompact()})`,
    available: true
  },
  {
    id: 7,
    name: 'TS.BS Trần Thị An',
    username: 'bs.an',
    title: 'Bác sĩ phụ trách Khoa Chẩn đoán hình ảnh',
    departmentId: 15,
    departmentName: 'Khoa Chẩn đoán hình ảnh',
    experience: '20+ năm kinh nghiệm • Siêu âm màu 4D, siêu âm thai, CĐHA kỹ thuật số',
    rating: 5.0,
    reviewsCount: 382,
    fee: 280000,
    room: 'Phòng Siêu âm 104 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 7 (${hoursCompact()})`,
    available: true
  },
  {
    id: 8,
    name: 'ThS.BS Hoàng Văn Toán',
    username: 'bs.toan',
    title: 'Bác sĩ phụ trách Khoa Xét nghiệm',
    departmentId: 16,
    departmentName: 'Khoa Xét nghiệm',
    experience: '16+ năm kinh nghiệm • Xét nghiệm máu, nước tiểu, test nhanh cúm A/B, ký sinh trùng',
    rating: 4.9,
    reviewsCount: 275,
    fee: 250000,
    room: 'Khu Xét nghiệm 105 (Tầng 1)',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 7 (${hoursCompact()})`,
    available: true
  },
  {
    id: 9,
    name: 'ThS.DS Lê Hải Quang',
    username: 'ds.quang',
    title: 'Trưởng Phòng Dược',
    departmentId: 12,
    departmentName: 'Phòng Dược & Cung ứng thuốc',
    experience: '17+ năm kinh nghiệm • Quản lý cung ứng & Dược lâm sàng',
    rating: 5.0,
    reviewsCount: 198,
    fee: 0,
    room: 'Phòng Dược Tầng 1 (Khu A)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    schedule: `Thứ 2 đến Thứ 7 (${hoursCompact()})`,
    available: true,
    canBook: false,
    isDoctor: false,
    roleTitle: 'Trưởng Phòng Dược'
  }
];

export const TRIAGE_RULES = [
  {
    keywords: ['cấp cứu', 'sơ cứu', 'ngất', 'choáng', 'hôn mê', 'khó thở dữ dội', 'đau ngực', 'sốt cao'],
    deptId: 1,
    deptName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    doctorId: 1,
    doctorName: 'TS.BS Vi Mai Anh',
    urgency: 'HIGH',
    urgencyLabel: 'Cảnh báo khẩn cấp: Tiếp nhận cấp cứu ban đầu ngay',
    confidence: '99%',
    advice: 'Đây là tình huống cần được xử lý sơ cứu và kiểm tra thể trạng tức thì. Quý khách vui lòng đưa bệnh nhân đến ngay Quầy Tiếp đón Cấp cứu Tầng 1 Mỹ Phát Hospital hoặc gọi hotline 0789 065 493.'
  },
  {
    keywords: ['khớp gối', 'cổ vai gáy', 'đau lưng', 'thoát vị đĩa đệm', 'đau vai gáy', 'vật lý trị liệu', 'đông y', 'châm cứu', 'bấm huyệt', 'cơ xương khớp', 'tê bì chân tay'],
    deptId: 13,
    deptName: 'Khoa Y học cổ truyền – Phục hồi chức năng',
    doctorId: 5,
    doctorName: 'BS. Nguyễn Văn Sỹ',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám chuyên khoa YHCT – Phục hồi chức năng',
    confidence: '98%',
    advice: 'Các bệnh lý cơ xương khớp, đau vai gáy, thoát vị đĩa đệm được điều trị chuyên sâu bởi BS. Nguyễn Văn Sỹ bằng phương pháp vật lý trị liệu kết hợp y học cổ truyền an toàn, phục hồi vận động hiệu quả.'
  },
  {
    keywords: ['thai', 'mang thai', 'thai kỳ', 'phụ khoa', 'kinh nguyệt', 'khám thai', 'siêu âm thai', 'ra máu thai', 'u nang'],
    deptId: 3,
    deptName: 'Sản - Phụ khoa',
    doctorId: 3,
    doctorName: 'BSCKII. Phạm Lan Vy',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám & Quản lý thai kỳ - Sản Phụ khoa',
    confidence: '98%',
    advice: 'Quản lý thai kỳ và chăm sóc sức khỏe phụ nữ được BSCKII. Phạm Lan Vy trực tiếp thăm khám, tư vấn siêu âm sàng lọc dị tật thai nhi và điều trị các bệnh phụ khoa bảo mật, tận tâm.'
  },
  {
    keywords: ['ho', 'họng', 'tai', 'mũi', 'xoang', 'khàn tiếng', 'ngạt mũi', 'đờm', 'viêm họng', 'nuốt đau', 'chảy mũi', 'thanh quản'],
    deptId: 10,
    deptName: 'Tai Mũi Họng',
    doctorId: 4,
    doctorName: 'ThS.BS Hoàng Thị Dung',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám chuyên khoa Tai Mũi Họng',
    confidence: '97%',
    advice: 'Tình trạng khàn tiếng, viêm tai giữa hay viêm xoang mãn tính cần được nội soi vi phẫu ống mềm bởi ThS.BS Hoàng Thị Dung để phát hiện sớm các tổn thương dây thanh quản và hốc xoang.'
  },
  {
    keywords: ['ống cổ tay', 'mồ hôi nách', 'tuyến mồ hôi', 'tiểu phẫu', 'phẫu thuật', 'vết thương', 'vết thương nông', 'u bã đậu', 'nhọt'],
    deptId: 2,
    deptName: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu',
    doctorId: 2,
    doctorName: 'BSCKII. Lê Thị Nga',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám Ngoại khoa & Tiểu phẫu can thiệp',
    confidence: '98%',
    advice: 'Hội chứng ống cổ tay, xử lý tuyến mồ hôi nách hoặc các vết thương nông được BSCKII. Lê Thị Nga trực tiếp thực hiện tiểu phẫu xâm lấn tối thiểu, vô khuẩn chuẩn y khoa và nhanh hồi phục.'
  },
  {
    keywords: ['nâng mũi', 'thẩm mỹ', 'tạo hình', 'da', 'mụn', 'nốt ruồi', 'sẹo', 'laser', 'tái tạo da'],
    deptId: 14,
    deptName: 'Dịch vụ Thẩm mỹ / Tạo hình',
    doctorId: 6,
    doctorName: 'ThS.BS Lê Tuấn Hiệp',
    urgency: 'LOW',
    urgencyLabel: 'Tư vấn Thẩm mỹ & Tạo hình chuyên sâu',
    confidence: '96%',
    advice: 'Dịch vụ thẩm mỹ tạo hình nâng mũi và thẩm mỹ da liễu do ThS.BS Lê Tuấn Hiệp phụ trách với trang thiết bị y khoa hiện đại, cam kết vẻ đẹp tự nhiên và an toàn chuẩn y khoa.'
  },
  {
    keywords: ['ngực', 'tim', 'hồi hộp', 'đập nhanh', 'nhói ngực', 'huyết áp', 'tức ngực', 'mạch'],
    deptId: 1,
    deptName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    doctorId: 1,
    doctorName: 'TS.BS Vi Mai Anh',
    urgency: 'HIGH',
    urgencyLabel: 'Khám Khẩn cấp & Nội khoa chuyên sâu',
    confidence: '98%',
    advice: 'Dấu hiệu đau tức ngực, khó thở có thể là biểu hiện của co thắt mạch vành hoặc rối loạn nhịp. Đề nghị bạn đến ngay Mỹ Phát Hospital để được đo điện tim ECG và thăm khám kịp thời.'
  },
  {
    keywords: ['đầu', 'chóng mặt', 'hoa mắt', 'mệt mỏi', 'sụt cân', 'khám sức khỏe', 'tiểu đường', 'tổng quát', 'mất ngủ'],
    deptId: 1,
    deptName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    doctorId: 1,
    doctorName: 'TS.BS Vi Mai Anh',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám Nội tổng quát & Tầm soát chuyên sâu',
    confidence: '97%',
    advice: 'Triệu chứng suy nhược hoặc bệnh lý nội khoa cần được TS.BS Vi Mai Anh thăm khám tổng thể và xét nghiệm sinh hóa cơ bản để đánh giá toàn diện sức khỏe.'
  }
];

let catalogSynced = false;
export const isCatalogSynced = () => catalogSynced;

/**
 * Đồng bộ mã bác sĩ với backend (nguồn dữ liệu duy nhất là DB).
 * DOCTORS ở trên chỉ chứa nội dung trình bày (ảnh, kinh nghiệm...); `id` thật của bác sĩ
 * (staff_profiles.id) lấy từ GET /public/doctors, khớp theo `username`.
 * Gọi một lần trước khi render ứng dụng.
 */
export async function syncCatalogWithBackend() {
  try {
    const res = await apiClient.get('/public/doctors', { skipAuth: true, timeout: 3000 });
    const remote = Array.isArray(res?.data) ? res.data : [];
    if (remote.length === 0) return false;

    const idMap = new Map();
    DOCTORS.forEach((doc) => {
      const real = remote.find((r) => r.username === doc.username);
      if (!real) {
        doc.canBook = false; // không có trong DB -> không thể đặt lịch
        return;
      }
      if (doc.staticId === undefined) doc.staticId = doc.id;
      idMap.set(doc.staticId, real.id);
      doc.id = real.id;
      if (real.departmentId) doc.departmentId = real.departmentId;
      doc.canBook = real.canBook;
    });

    TRIAGE_RULES.forEach((rule) => {
      if (rule.staticDoctorId === undefined) rule.staticDoctorId = rule.doctorId;
      if (idMap.has(rule.staticDoctorId)) rule.doctorId = idMap.get(rule.staticDoctorId);
    });

    catalogSynced = true;
    return true;
  } catch {
    return false; // backend không sẵn sàng: giữ dữ liệu tĩnh, đặt lịch sẽ báo lỗi kết nối
  }
}

// Chuyên khoa AI/chatbot gợi ý (id/tên theo bộ khoa cũ) -> khoa thực tế của Mỹ Phát Hospital.
// Khớp theo TÊN vì id của AI service và backend chat fallback đang xung đột với DB.
const SUGGESTION_TO_DEPARTMENT_ID = [
  [/da liễu|thẩm mỹ/i, 14],
  [/cơ xương khớp|phục hồi|y học cổ truyền|vật lý trị liệu/i, 13],
  [/tai mũi họng|tai mũi|hô hấp/i, 10],
  [/sản|phụ khoa/i, 3],
  [/ngoại|phẫu thuật/i, 2]
];

export function resolveHospitalDepartment(suggested) {
  const fallbackId = 1;
  const name = suggested?.name || '';
  const match = SUGGESTION_TO_DEPARTMENT_ID.find(([re]) => re.test(name));
  const id = match ? match[1] : fallbackId;
  const dept = DEPARTMENTS.find((d) => d.id === id);
  return { ...suggested, id, name: dept ? dept.name : name };
}
