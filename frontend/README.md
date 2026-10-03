# Cổng Thông Tin Bệnh Viện Đa Khoa Thanh Sơn (Frontend React / Vite)

Hệ thống Frontend chuẩn doanh nghiệp ứng dụng **React 18 + Vite**, kiến trúc phân tầng Service / Context / Component hiện đại, tích hợp giao diện y tế cao cấp, trợ lý AI Triage lâm sàng và hệ sinh thái đặt lịch khám thông minh.

---

## 🚀 Tính Năng Chính (Sprint 1)

1. **Kiến Trúc Kết Nối API & Offline Resilience**:
   - Axios client với Interceptors đính kèm `Bearer JWT Token` tự động từ LocalStorage.
   - Cơ chế tự động giải phóng session và phát sự kiện `hms_auth_changed` khi gặp mã lỗi 401 Unauthorized.
   - Hỗ trợ graceful fallback dữ liệu seed khi Backend Spring Boot (`http://localhost:8080/api/v1`) đang khởi động hoặc offline.

2. **Xác Thực & Phân Quyền (Auth & Roles)**:
   - Đăng nhập, đăng ký tài khoản bệnh nhân trực tuyến.
   - Nút điền nhanh tài khoản dùng thử Sprint 1:
     - **Bệnh nhân:** `benhnhan` / `Password@123` (Role: `PATIENT`)
     - **Quản trị viên:** `admin` / `Admin@123` (Role: `ADMIN`)
   - Bảng điều khiển Quản trị viên (`AdminPanelModal`) hiển thị trạng thái hệ thống, 10 chuyên khoa, danh sách lịch khám.

3. **Đặt Lịch Khám & Phiếu Khám Điện Tử (Smart Booking)**:
   - Đặt lịch theo 10 Chuyên khoa (`Khoa Nội tổng quát`, `Khoa Tim mạch`, `Khoa Nhi`, `Khoa Tiêu hóa`, `Khoa Da liễu`, `Khoa Tai mũi họng`...).
   - Lọc bác sĩ chuyên khoa tương ứng, chọn ngày hẹn và khung giờ khám (08:00 - 16:30).
   - Xuất vé khám điện tử mã số chuẩn `HMS-2026-XXXX` kèm barcode, in phiếu khám và quản lý trạng thái tại "Lịch Khám Của Tôi".

4. **Trợ Lý Sàng Lọc Triệu Chứng AI 24/7 (AI Clinical Triage)**:
   - Phân tích triệu chứng thời gian thực bằng bộ quy tắc lâm sàng AI.
   - Đánh giá mức độ khẩn cấp (Khẩn cấp / Ưu tiên / Tiêu chuẩn), gợi ý chuyên khoa và bác sĩ trực tiếp.
   - 1-click "Đặt Khám Ngay Theo Phân Luồng Này" tự động điền sẵn chuyên khoa, bác sĩ và triệu chứng.

---

## 🛠️ Cấu Trúc Dự Án

```
frontend/
├── src/
│   ├── assets/              # Assets hình ảnh và logo
│   ├── components/
│   │   ├── home/            # HeroSection, FeaturesSection, DepartmentsSection, DoctorsSection, AITriageSection, TestimonialsSection, QuickCtaSection
│   │   ├── layout/          # Navbar, Footer
│   │   └── modals/          # AuthModal, BookingModal, MyAppointmentsModal, AllDepartmentsModal, AboutModal, ContactModal, UserProfileModal, AdminPanelModal
│   ├── context/
│   │   ├── AuthContext.jsx  # Quản lý authentication, JWT, role kiểm tra
│   │   └── ToastContext.jsx # Thông báo hệ thống thông minh (Success, Error, Warning, Info)
│   ├── services/
│   │   ├── api.js           # Axios instance & interceptors
│   │   ├── authService.js   # API auth + offline seed sync
│   │   ├── appointmentService.js # Quản lý lịch hẹn & phiếu khám
│   │   ├── dataService.js   # Danh mục chuẩn 10 chuyên khoa, 6 bác sĩ
│   │   └── triageService.js # AI clinical symptom analyzer
│   ├── tests/
│   │   ├── setup.js         # Vitest setup & polyfills
│   │   ├── api.test.js      # Unit tests cho Axios interceptors
│   │   ├── auth.test.jsx    # Unit & Integration tests cho Auth/Context
│   │   ├── booking.test.jsx # Tests cho luồng đặt/hủy lịch hẹn
│   │   ├── triage.test.jsx  # Tests sàng lọc triệu chứng lâm sàng AI
│   │   └── components.test.jsx # UI & user interaction integration tests
│   ├── App.jsx              # Main App entry kết nối toàn bộ hệ thống
│   ├── index.css            # Design token, Google Fonts & Tailwind classes
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

## 🧪 Chạy Kiểm Thử Tự Động (Enterprise Test Suite)

Dự án sử dụng **Vitest** kết hợp với **React Testing Library** và **jsdom**:

```bash
# Chạy toàn bộ 5 test suites (25 tests)
npm test

# Chạy ở chế độ watch mode khi phát triển
npm run test:watch
```

**Kết quả kiểm thử:**
- ✅ `src/tests/triage.test.jsx` (7/7 tests pass)
- ✅ `src/tests/api.test.js` (4/4 tests pass)
- ✅ `src/tests/booking.test.jsx` (4/4 tests pass)
- ✅ `src/tests/auth.test.jsx` (6/6 tests pass)
- ✅ `src/tests/components.test.jsx` (4/4 tests pass)
- **Tổng cộng: 25/25 tests pass 100%**

---

## 💻 Chạy Ứng Dụng Trong Môi Trường Phát Triển

```bash
# Khởi chạy Vite Dev Server tại cổng 3000
npm run dev

# Đóng gói sản phẩm (Production build)
npm run build
```
