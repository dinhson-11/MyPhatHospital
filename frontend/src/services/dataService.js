/**
 * Data Service – Dữ liệu chuẩn dự án HMS-AI
 * Khớp với V10__seed_data.sql và các Entity Department, StaffProfile
 */

export const DEPARTMENTS = [
  {
    id: 1,
    name: 'Khoa Nội tổng quát',
    code: 'NOI_TONG_QUAT',
    desc: 'Khám và điều trị toàn diện các bệnh lý mạn tính, đái tháo đường, tăng huyết áp, tầm soát sức khỏe tổng quát.',
    icon: 'stethoscope',
    doctorsCount: 12,
    room: 'Phòng 201 - 205 (Tầng 2, Tòa nhà A)'
  },
  {
    id: 5,
    name: 'Khoa Tim mạch',
    code: 'TIM_MACH',
    desc: 'Chẩn đoán sớm bệnh mạch vành, đo điện tim gắng sức, siêu âm tim Doppler màu 4D thế hệ mới.',
    icon: 'cardiology',
    doctorsCount: 8,
    room: 'Phòng 306 - 308 (Tầng 3, Tòa nhà A)'
  },
  {
    id: 4,
    name: 'Khoa Nhi',
    code: 'NHI',
    desc: 'Chăm sóc sức khỏe toàn diện cho trẻ sơ sinh và trẻ nhỏ, tiêm chủng vacxin, theo dõi phát triển thể chất.',
    icon: 'child_care',
    doctorsCount: 10,
    room: 'Phòng 105 - 108 (Tầng 1, Tòa nhà B)'
  },
  {
    id: 6,
    name: 'Khoa Tiêu hóa',
    code: 'TIEU_HOA',
    desc: 'Nội soi tiêu hóa không đau công nghệ NBI phóng đại cao, chẩn đoán sớm ung thư đường tiêu hóa, điều trị gan mật.',
    icon: 'gastroenterology',
    doctorsCount: 9,
    room: 'Phòng 206 - 208 (Tầng 2, Tòa nhà A)'
  },
  {
    id: 8,
    name: 'Khoa Da liễu',
    code: 'DA_LIEU',
    desc: 'Điều trị dứt điểm viêm da, vảy nến, mụn trứng cá và phục hồi thẩm mỹ da liễu bằng laser y khoa tân tiến.',
    icon: 'dermatology',
    doctorsCount: 6,
    room: 'Phòng 209 - 210 (Tầng 2, Tòa nhà B)'
  },
  {
    id: 10,
    name: 'Khoa Tai mũi họng',
    code: 'TAI_MUI_HONG',
    desc: 'Nội soi vi phẫu ống mềm HD, điều trị triệt để viêm xoang, viêm tai giữa, cắt amidan bằng dao plasma.',
    icon: 'hearing',
    doctorsCount: 7,
    room: 'Phòng 211 - 213 (Tầng 2, Tòa nhà A)'
  },
  {
    id: 2,
    name: 'Khoa Ngoại tổng quát',
    code: 'NGOAI_TONG_QUAT',
    desc: 'Phẫu thuật ngoại khoa xâm lấn tối thiểu, phẫu thuật tiêu hóa, gan mật và thoát vị bẹn.',
    icon: 'healing',
    doctorsCount: 8,
    room: 'Phòng 401 - 405 (Tầng 4, Tòa nhà A)'
  },
  {
    id: 3,
    name: 'Khoa Sản phụ khoa',
    code: 'SAN_PHU_KHOA',
    desc: 'Quản lý thai kỳ trọn gói, chẩn đoán trước sinh, sàng lọc dị tật và điều trị bệnh phụ khoa chuyên sâu.',
    icon: 'pregnant_woman',
    doctorsCount: 11,
    room: 'Phòng 301 - 305 (Tầng 3, Tòa nhà B)'
  },
  {
    id: 7,
    name: 'Khoa Cấp cứu 24/7',
    code: 'CAP_CUU',
    desc: 'Trực cấp cứu đa khoa 24/7, xe cấp cứu chuyên dụng trang bị đầy đủ máy thở và sốc tim.',
    icon: 'emergency',
    doctorsCount: 15,
    room: 'Sảnh Cấp cứu Tầng 1 (Cửa tiếp nhận riêng)'
  },
  {
    id: 9,
    name: 'Khoa Mắt',
    code: 'MAT',
    desc: 'Đo khúc xạ thị lực tự động, phẫu thuật Phaco đục thủy tinh thể, điều trị glôcôm và đáy mắt.',
    icon: 'visibility',
    doctorsCount: 5,
    room: 'Phòng 309 - 311 (Tầng 3, Tòa nhà A)'
  }
];

export const DOCTORS = [
  {
    id: 1,
    name: 'TS. BS. Nguyễn Văn Hùng',
    title: 'Trưởng khoa Tim mạch',
    departmentId: 5,
    departmentName: 'Khoa Tim mạch',
    experience: '22 năm KN • Nguyên Phó khoa Viện Tim mạch',
    rating: 4.9,
    reviewsCount: 342,
    fee: 350000,
    room: 'Phòng khám 306 (Tầng 3)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxwanPIKvcVv0JKehjI1b-14d6Nfob_G4pQu9_SwfsUo3GOuwf7ysZH6u-_PZC0R4SgbpsTc4eI0BL5dTlQPWfAxkwtBbzEQlKj4uRf3Q0mLEe9LLptzRnEIN4xsNuUYBI315XmepwuD9eEd7jVryy_qz9L72u58eVR19RY6QYW6eY5pFEAOTM_UrwK_ZeboTCBZrjqPdb8F4NfT_0VrgxSB4Mpf2eIwggcQZsyXEMjVXPjmT5OmXjIQ',
    schedule: 'Thứ 2, 4, 6 (08:00 - 16:30)',
    available: true
  },
  {
    id: 2,
    name: 'PGS. TS. Trần Thị Mai',
    title: 'Chuyên gia Nội tổng quát & Nội tiết',
    departmentId: 1,
    departmentName: 'Khoa Nội tổng quát',
    experience: '25 năm KN • Chuyên gia điều trị chuyển hóa',
    rating: 5.0,
    reviewsCount: 428,
    fee: 350000,
    room: 'Phòng khám 202 (Tầng 2)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt3a2ZSDmr9zcYR5rNh4Bz9Mxkkc6FAUkeVH42UV1CNhUiVUDOCFw80aMPEISsr30rrFq7jgkqjiYxLyWRA8QQPZVf61rfq4G_2alVtZIKY8qVV86cil9kfyNfXzbYiSo8nHEsMrHCt8PiMCEvn-WdI_izXjngK7Ygm_f78nHbFI0_qPlx49Wt972w9v6QSzsb7ddY7BqGDXaaGOL5df-U4oQu0fAHNOOYTloK1sGJlGblyc6XHUDmJA',
    schedule: 'Thứ 3, 5, 7 (08:00 - 16:30)',
    available: true
  },
  {
    id: 3,
    name: 'BSCKII. Lê Hoàng Nam',
    title: 'Trưởng khoa Nhi',
    departmentId: 4,
    departmentName: 'Khoa Nhi',
    experience: '18 năm KN • Nguyên BS BV Nhi Trung ương',
    rating: 4.9,
    reviewsCount: 516,
    fee: 300000,
    room: 'Phòng khám 106 (Tầng 1)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4SYFo2tTqvLAGIjuDECzTH_119jPuze8h3mTPWbZGQc_MnIO6ZsGdjxNVrD5Ts-L0yOQ445cxbTyAmA5Be4OFj-JTXm2Erd8nsQdHtjL3-G7TxBcjsA1tdmpTXtcBCY4Zn50JZEkYb-jO_2y5P74Q3EZIoaDP4xBoyYn8pquWxYP4kEMFLDqROH1fOsRJwoN2xucX0y2w5d7hiJF8LdFiEQhsYp5gc55lR_v0JIQ1I60-X7cwHymbjA',
    schedule: 'Thứ 2 đến Thứ 6 (08:00 - 16:30)',
    available: true
  },
  {
    id: 4,
    name: 'ThS. BS. Phạm Thu Hương',
    title: 'Chuyên gia Tiêu hóa & Nội soi',
    departmentId: 6,
    departmentName: 'Khoa Tiêu hóa',
    experience: '15 năm KN • Chuyên gia can thiệp nội soi',
    rating: 4.8,
    reviewsCount: 295,
    fee: 300000,
    room: 'Phòng khám 207 (Tầng 2)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMyxFMeo5UNfbqfjQ-57pIBdfKieMRT2n5hn-m1dRUKEj0EYBR7iypAZMcs2wC0X1ynwaTPCMR6mZaRSdy-JIQSeovAOEWw7R5doq67suOu7ptQa8I7Y9Ow4MLkB38VNjkdbYg4BKKV_wsK-_BkrNxgAabBVn7lkHG4WlPUhO5MHAnii9SKgFtq639ULNPYSUAZANp3tfBoCrg9p7rbImS3_ZB3Qg1I4bkYrLnLXKt4oXjlHIcmNlqzg',
    schedule: 'Thứ 2 đến Thứ 7 (08:00 - 16:30)',
    available: true
  },
  {
    id: 5,
    name: 'BSCKI. Vũ Đình Trọng',
    title: 'Bác sĩ chuyên khoa Tai Mũi Họng',
    departmentId: 10,
    departmentName: 'Khoa Tai mũi họng',
    experience: '12 năm KN • BV Tai Mũi Họng TW',
    rating: 4.8,
    reviewsCount: 184,
    fee: 250000,
    room: 'Phòng khám 212 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    schedule: 'Thứ 3, 5, Chủ nhật (08:00 - 16:30)',
    available: true
  },
  {
    id: 6,
    name: 'ThS. BS. Lê Thị Lan Anh',
    title: 'Bác sĩ chuyên khoa Da liễu Thẩm mỹ',
    departmentId: 8,
    departmentName: 'Khoa Da liễu',
    experience: '14 năm KN • Laser y khoa chuyên sâu',
    rating: 4.9,
    reviewsCount: 210,
    fee: 280000,
    room: 'Phòng khám 209 (Tầng 2)',
    avatar: 'https://images.unsplash.com/photo-1594824813637-44f0b2f52803?auto=format&fit=crop&w=400&q=80',
    schedule: 'Thứ 2, 4, 7 (08:00 - 16:30)',
    available: true
  }
];

export const TIME_SLOTS = [
  '08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30',
  '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
  '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30'
];

export const TRIAGE_RULES = [
  {
    keywords: ['ngực', 'tim', 'hồi hộp', 'đập nhanh', 'nhói ngực', 'huyết áp', 'tức ngực', 'mạch', 'khó thở'],
    deptId: 5,
    deptName: 'Khoa Tim mạch',
    doctorId: 1,
    doctorName: 'TS. BS. Nguyễn Văn Hùng',
    urgency: 'HIGH',
    urgencyLabel: 'Cảnh báo: Cần khám sớm hoặc kiểm tra tim mạch khẩn cấp',
    confidence: '99%',
    advice: 'Dấu hiệu đau tức ngực, khó thở có thể là biểu hiện của co thắt mạch vành hoặc rối loạn nhịp. Đề nghị bạn nghỉ ngơi tại chỗ, tránh vận động gắng sức và nhanh chóng đến Bệnh viện Thanh Sơn để được đo điện tim ECG và siêu âm tim chuyên sâu.'
  },
  {
    keywords: ['ho', 'họng', 'tai', 'mũi', 'xoang', 'khàn tiếng', 'ngạt mũi', 'đờm', 'viêm họng', 'nuốt đau', 'chảy mũi'],
    deptId: 10,
    deptName: 'Khoa Tai mũi họng',
    doctorId: 5,
    doctorName: 'BSCKI. Vũ Đình Trọng',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám chuyên khoa Tai Mũi Họng tiêu chuẩn',
    confidence: '97%',
    advice: 'Tình trạng ho kéo dài hoặc đau rát họng cần được nội soi vi phẫu ống mềm để kiểm tra niêm mạc thanh quản và hốc xoang. Uống nhiều nước ấm, giữ ấm cổ họng và tuyệt đối không tự ý mua thuốc kháng sinh uống khi chưa có chỉ định.'
  },
  {
    keywords: ['dạ dày', 'bụng', 'đầy hơi', 'khó tiêu', 'ợ chua', 'ợ hơi', 'nôn', 'buồn nôn', 'tiêu hóa', 'đại tiện', 'tiêu chảy', 'táo bón', 'gan', 'mật'],
    deptId: 6,
    deptName: 'Khoa Tiêu hóa',
    doctorId: 4,
    doctorName: 'ThS. BS. Phạm Thu Hương',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám chuyên khoa Tiêu hóa - Gan mật',
    confidence: '98%',
    advice: 'Các triệu chứng đầy hơi, đau bụng, ợ chua gợi ý tình trạng viêm loét dạ dày tá tràng hoặc trào ngược thực quản (GERD). Bệnh viện có dịch vụ nội soi không đau công nghệ NBI phóng đại cao giúp phát hiện tổn thương chính xác chỉ trong 10 phút.'
  },
  {
    keywords: ['trẻ', 'bé', 'con', 'sơ sinh', 'nhi', 'biếng ăn', 'quấy khóc', 'tiêm chủng', 'sốt cao'],
    deptId: 4,
    deptName: 'Khoa Nhi',
    doctorId: 3,
    doctorName: 'BSCKII. Lê Hoàng Nam',
    urgency: 'HIGH',
    urgencyLabel: 'Ưu tiên tiếp nhận Nhi khoa chất lượng cao',
    confidence: '98%',
    advice: 'Ở trẻ nhỏ, các triệu chứng sốt hoặc mệt mỏi có thể diễn tiến nhanh. Bác sĩ Nhi khoa sẽ thăm khám trực tiếp, nghe phổi và tư vấn phác đồ điều trị an toàn, thân thiện nhất cho bé.'
  },
  {
    keywords: ['da', 'ngứa', 'mụn', 'dị ứng', 'mẩn đỏ', 'viêm da', 'vảy nến', 'nổi mề đay', 'sẹo', 'thẩm mỹ', 'rụng tóc'],
    deptId: 8,
    deptName: 'Khoa Da liễu',
    doctorId: 6,
    doctorName: 'ThS. BS. Lê Thị Lan Anh',
    urgency: 'LOW',
    urgencyLabel: 'Khám và tư vấn chuyên khoa Da liễu',
    confidence: '96%',
    advice: 'Không nên gãi xước làm lan rộng tổn thương. Khoa Da liễu Bệnh viện Thanh Sơn trang bị hệ thống soi da vi điểm và công nghệ laser hiện đại giúp điều trị dứt điểm căn nguyên bệnh lý.'
  },
  {
    keywords: ['đầu', 'chóng mặt', 'hoa mắt', 'mệt mỏi', 'sụt cân', 'khám sức khỏe', 'tiểu đường', 'tổng quát', 'vai gáy', 'mỏi vai', 'lưng', 'xương khớp', 'mất ngủ'],
    deptId: 1,
    deptName: 'Khoa Nội tổng quát',
    doctorId: 2,
    doctorName: 'PGS. TS. Trần Thị Mai',
    urgency: 'MEDIUM',
    urgencyLabel: 'Khám Nội tổng quát & Tầm soát chuyên sâu',
    confidence: '97%',
    advice: 'Triệu chứng đau mỏi vai gáy hoặc suy nhược kéo dài cần được thăm khám tổng thể, làm xét nghiệm sinh hóa cơ bản (đường huyết, mỡ máu, chức năng gan thận) và chụp phim cột sống nếu cần thiết.'
  }
];
