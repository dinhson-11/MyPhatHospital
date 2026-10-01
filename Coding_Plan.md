# Kế hoạch Code chi tiết – HMS-AI

Giả định lộ trình ~10-12 tuần, khớp với các giai đoạn học phần: Chọn đề tài → Xác định yêu cầu → Phân tích thiết kế → Triển khai → Kiểm thử → Báo cáo.

## Sprint 0 (Tuần 1) – Khởi tạo ✅
- [x] Khởi tạo repo Git (backend, ai-service, frontend – 3 thư mục hoặc 3 repo).
- [x] Setup Spring Boot project (Spring Initializr: Web, JPA, Security, Validation, MySQL Driver, Lombok).
- [x] Setup MySQL, tạo schema từ `03_DB_Design.md` (dùng Flyway/Liquibase để quản lý migration).
- [x] Setup FastAPI project rỗng cho AI Service, healthcheck endpoint.
- [x] Cấu hình Swagger, cấu hình CORS, cấu hình application.yml (profile dev/prod).
- [x] Viết README mô tả cách chạy dự án.
- **Frontend**:
  - [x] Khởi tạo dự án React + Vite (`npm create vite@latest ./` với template `react`).
  - [x] Cài đặt dependencies: `axios`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`.
  - [x] Cấu hình `vite.config.js` với Vitest (môi trường `jsdom`, `setupFiles`, `globals`).
  - [x] Thiết lập `index.html` với Google Fonts (Inter, Plus Jakarta Sans), Material Symbols Outlined.
  - [x] Viết `index.css` với design tokens màu sắc chuẩn thương hiệu Bệnh viện Thanh Sơn (`#005440`, `#1960a6`, `#ebfef6`).

---

## Sprint 1 (Tuần 2) – Auth & phân quyền ✅
- [x] Entity: `User, Role, UserRole, Department, StaffProfile`.
- [x] Đăng ký/Đăng nhập, sinh JWT, JWT filter, `UserDetailsService`.
- [x] `@PreAuthorize` theo role, xử lý exception tập trung (`@ControllerAdvice`).
- [x] API quản lý user (ADMIN).
- [x] Unit test cho AuthService.
- **Frontend** ✅:
  - [x] **Axios Client & Interceptors** (`src/services/api.js`): Tự động đính kèm `Authorization: Bearer <token>`, bắt lỗi 401 → xóa phiên, phát sự kiện `hms_auth_changed`.
  - [x] **authService.js**: Đăng nhập/Đăng ký với fallback offline (seed users `admin`/`benhnhan`). Sync session token vào `localStorage`.
  - [x] **AuthContext.jsx**: `useAuth()` hook quản lý `user`, `isAuthenticated`, `isAdmin`, `login`, `register`, `logout`.
  - [x] **ToastContext.jsx**: `useToast()` hook với floating alerts (Success/Error/Warning/Info).
  - [x] **AuthModal.jsx**: Form Đăng nhập + Đăng ký, nút điền nhanh tài khoản dùng thử (`benhnhan` / `admin`).
  - [x] **Navbar.jsx**: Header sticky, hiển thị trạng thái đăng nhập động, dropdown avatar, trigger tất cả modal.
  - [x] **Unit & Integration Tests** (`auth.test.jsx`, `api.test.js`): 10 tests – kiểm thử interceptor JWT, đăng nhập/đăng ký, role ADMIN/PATIENT, Context state.
- **Deliverable**: đăng nhập/đăng ký chạy được, phân quyền cơ bản, giao diện đầy đủ chức năng Auth.

---

## Sprint 2 (Tuần 3) – Bệnh nhân & EMR
- [ ] Entity: `Patient, PatientAllergy, MedicalRecord`.
- [ ] CRUD hồ sơ bệnh nhân, tìm kiếm (theo tên/SĐT/mã), phân trang.
- [ ] API dị ứng bệnh nhân (dữ liệu đầu vào cho AI sau này).
- [ ] Test API bằng Postman collection.
- **Frontend**:
  - [ ] **Trang Hồ sơ bệnh nhân** (`PatientProfilePage.jsx`): Form xem & chỉnh sửa thông tin cá nhân (họ tên, ngày sinh, CCCD, địa chỉ, nhóm máu).
  - [ ] **Danh sách dị ứng** (`AllergiesSection.jsx`): Hiển thị & thêm/xóa thông tin dị ứng của bệnh nhân (thuốc, thức ăn, môi trường).
  - [ ] **Tích hợp API**: Kết nối `patientService.js` gọi `GET/PUT /api/v1/patients/me`, `POST/DELETE /api/v1/patient-allergies`.
  - [ ] **Kiểm thử**: `patient.test.jsx` – form validation, lấy/cập nhật hồ sơ, thêm/xóa dị ứng.

---

## Sprint 3 (Tuần 4) – Đặt lịch khám ✅ (Hoàn thành Fullstack Backend + Frontend)
- [x] Entity: `Appointment`, `AppointmentStatus`, `AppointmentSource`, Flyway migration `V11__add_appointment_symptom_notes.sql`.
- [x] API đặt/hủy/xác nhận/hoàn tất lịch, kiểm tra trùng lịch bác sĩ (unique query + logic service).
- [x] API lấy khung giờ trống theo bác sĩ/ngày (`/api/v1/appointments/available-slots`).
- [x] Backend Controller: `AppointmentController` phân quyền theo Role (`PATIENT`, `RECEPTIONIST`, `DOCTOR`, `ADMIN`).
- [x] Unit test Backend: `AppointmentServiceImplTest` (14/14 tests pass).
- **Frontend** ✅ (Hoàn thành và tích hợp):
  - [x] **appointmentService.js**: Đặt lịch, sinh mã vé `HMS-2026-XXXX`, hủy lịch, lấy danh sách. Tự động fallback LocalStorage khi Backend offline.
  - [x] **BookingModal.jsx**: Chọn chuyên khoa (10 khoa), tự động lọc bác sĩ tương ứng (6 bác sĩ), chọn ngày & khung giờ, điền triệu chứng. Hiển thị **Phiếu Khám Điện Tử** mã vạch sau khi đặt thành công.
  - [x] **MyAppointmentsModal.jsx**: Danh sách lịch hẹn, xem chi tiết phiếu khám, in phiếu, hủy lịch.
  - [x] **AllDepartmentsModal.jsx**: Danh bạ 10 chuyên khoa với thanh tìm kiếm realtime, 1-click đặt khám từng khoa.
  - [x] **DepartmentsSection.jsx**: 6 thẻ chuyên khoa nổi bật trên trang chủ, mỗi thẻ có nút "Đặt khám" & "Xem thông tin".
  - [x] **Kiểm thử** (`booking.test.jsx`): 4 tests – tạo lịch & sinh ticketCode, hủy lịch, kiểm tra lỗi ID không hợp lệ, lấy danh sách.
  - [x] **Backend integration**: Đã tích hợp gọi `POST /api/v1/appointments`, `GET /api/v1/appointments/me`, `PATCH /api/v1/appointments/{id}/cancel`, `GET /api/v1/appointments/available-slots`.

---

## Sprint 4 (Tuần 5-6) – Khám bệnh, kê đơn, cận lâm sàng ✅ (Hoàn thành Fullstack Backend + Frontend)
- [x] Entity Backend: `Visit`, `VisitStatus`, `Prescription`, `PrescriptionItem`, `LabOrder`, `LabOrderStatus`, `LabResult`, `Drug`, `DrugInteraction`, `InteractionSeverity`.
- [x] API bắt đầu/hoàn tất lượt khám, ghi chẩn đoán ICD-10, cập nhật sinh hiệu (`/api/v1/visits`).
- [x] API tạo đơn thuốc, danh mục thuốc (`/api/v1/drugs`, `/api/v1/visits/{id}/prescriptions`).
- [x] API chỉ định cận lâm sàng và cập nhật kết quả phòng Lab (`/api/v1/visits/{id}/lab-orders`, `/api/v1/lab-orders/{id}/result`).
- [x] Flyway migration `V12__seed_drugs_interactions.sql`: 15 danh mục thuốc thiết yếu và 6 cặp tương tác thuốc kinh điển.
- [x] Backend Unit Tests: `VisitServiceImplTest` (10 tests pass), `DrugServiceImplTest` (5 tests pass) -> Tổng Backend: 53/53 tests pass.
- **Frontend** ✅:
  - [x] **visitService.js**: Kết nối toàn bộ REST API ca khám, đơn thuốc, cận lâm sàng, tra cứu tương tác thuốc và fallback offline LocalStorage.
  - [x] **VisitDashboard.jsx**: Phòng khám bác sĩ chuyên sâu – hàng đợi bệnh nhân, theo dõi sinh hiệu đổi màu cảnh báo (mạch, HA, nhiệt độ, SpO2, nhịp thở, tự động tính BMI), chẩn đoán ICD-10 nhanh, in phiếu khám EMR.
  - [x] **PrescriptionForm.jsx**: Kê đơn thuốc điện tử động, tìm kiếm thuốc realtime, tính tổng tiền tự động, cảnh báo tương tác thuốc tức thì.
  - [x] **LabOrderPanel.jsx**: Chỉ định cận lâm sàng với 9 nhóm xét nghiệm tiêu chuẩn, nhập kết quả xét nghiệm và đính kèm tài liệu.
  - [x] **Tích hợp Auth & Navigation**: Bổ sung tài khoản dùng thử Bác sĩ (`bacsi` / `Doctor@123` - CKII Nguyễn Văn Hùng), menu truy cập nhanh phòng khám trên Navbar.
  - [x] **Kiểm thử**: `visit.test.jsx` (8 tests pass) -> Tổng Frontend: 33/33 tests pass, production bundle build thành công (126.96 kB gzip).
- **Điểm mốc**: Sẵn sàng đầy đủ dữ liệu lâm sàng và tương tác thuốc để bước vào Sprint 5 tích hợp AI cảnh báo lâm sàng.

---

## Sprint 5 (Tuần 7) – AI Service: Cảnh báo tương tác thuốc & dị ứng (FR-11.1, 11.2)
- [ ] AI Service: endpoint `/check-interaction`, `/check-allergy` (rule-based, tra cứu dữ liệu `drug_interactions`/`patient_allergies` được backend gửi kèm hoặc AI Service tự query DB).
- [ ] Backend: `AiClientService` gọi AI Service khi bác sĩ lưu đơn thuốc; hiển thị cảnh báo ở response tạo đơn.
- [ ] Lưu log vào `ai_clinical_suggestions`.
- [ ] Test case: đơn có/không có tương tác, có/không có dị ứng.
- **Frontend**:
  - [ ] **DrugInteractionAlert.jsx**: Banner cảnh báo nổi bật màu đỏ/cam hiển thị ngay trong `PrescriptionForm` khi AI phát hiện tương tác thuốc hoặc dị ứng.
  - [ ] **aiAlertService.js**: Gọi `POST /api/v1/prescriptions` và xử lý mảng `warnings` trong response, classify `CRITICAL` / `WARNING` / `INFO`.
  - [ ] Kiểm thử: `drugAlert.test.jsx` – render alert khi có cảnh báo, không render khi đơn thuốc an toàn.

---

## Sprint 6 (Tuần 8) – AI Service: Gợi ý chẩn đoán (FR-11.3)
- [ ] Chuẩn bị tập dữ liệu mẫu (triệu chứng ↔ chẩn đoán) – có thể tự tạo bộ nhỏ cho demo.
- [ ] Cài đặt rule-based scoring hoặc mô hình phân loại đơn giản (scikit-learn).
- [ ] Endpoint `/suggest-diagnosis`, tích hợp vào màn hình khám bệnh của bác sĩ.
- [ ] Gắn disclaimer + log vào `ai_clinical_suggestions`.
- **Frontend**:
  - [ ] **DiagnosisSuggestBox.jsx**: Ô nhập triệu chứng trong màn hình khám bệnh → gọi AI → trả về Top 3 ICD-10 gợi ý với % tin cậy. Bác sĩ click để tự động điền chẩn đoán.
  - [ ] **diagnosisAiService.js**: Gọi `POST /api/v1/ai/suggest-diagnosis`, debounce 500ms tránh spam request.
  - [ ] Disclaimer y tế nổi bật "AI chỉ hỗ trợ, không thay thế phán đoán lâm sàng của bác sĩ".
  - [ ] Kiểm thử: `diagnosisSuggest.test.jsx` – render gợi ý đúng, xử lý khi không có gợi ý phù hợp, click chọn gợi ý.

---

## Sprint 7 (Tuần 9) – AI Chatbot (FR-10)
- [ ] Entity: `ChatSession, ChatMessage`.
- [ ] AI Service: endpoint `/chat` — xác định intent (SYMPTOM_CHECK/BOOKING/FAQ), sinh phản hồi (rule-based cho FAQ, gợi ý chuyên khoa theo từ khóa triệu chứng, hoặc gọi LLM API nếu nhóm có key).
- [ ] Backend: API tạo phiên chat, gửi/nhận tin nhắn, lưu lịch sử.
- [ ] Xử lý case "vượt phạm vi tư vấn" → trả cảnh báo liên hệ y tế/cấp cứu.
- [ ] Tích hợp chatbot UI (widget chat đơn giản) vào frontend bệnh nhân.
- **Frontend**:
  - [ ] **ChatWidget.jsx**: Nút chat nổi góc phải màn hình (Floating Action Button), click mở cửa sổ chat. Hiển thị typing indicator khi AI đang trả lời.
  - [ ] **ChatMessage.jsx**: Component render từng tin nhắn, phân biệt tin nhắn người dùng / AI, hỗ trợ rich-text và action buttons (Đặt lịch khám ngay).
  - [ ] **ChatHistory.jsx**: Lịch sử hội thoại trước đó, phân chia theo phiên.
  - [ ] **chatService.js**: Gọi `POST /api/v1/chat/message`, WebSocket hoặc polling để nhận phản hồi realtime.
  - [ ] **AITriageSection** (đã có) → tích hợp seamless chuyển sang chat bot sau bước phân luồng.
  - [ ] Kiểm thử: `chatbot.test.jsx` – gửi tin nhắn, nhận phản hồi, intent routing, hiển thị cảnh báo vượt phạm vi.

---

## Sprint 8 (Tuần 10) – Nhà thuốc, viện phí, nhân sự (rút gọn)
- [ ] API cấp phát thuốc + trừ kho tự động.
- [ ] API sinh hóa đơn tự động từ lượt khám, xác nhận thanh toán (mock).
- [ ] API cơ bản quản lý nhân sự/lịch trực.
- **Frontend**:
  - [ ] **PharmacyDispensePage.jsx**: Màn hình nhà thuốc – tra cứu đơn theo mã vé khám, xác nhận cấp phát, kiểm tra tồn kho.
  - [ ] **InvoicePage.jsx**: Hiển thị hóa đơn tự động (dịch vụ khám + thuốc + CLS), nút "Xác nhận thanh toán" (mock VietQR / tiền mặt).
  - [ ] **StaffSchedulePage.jsx**: Lịch trực của nhân viên theo tuần/tháng (dùng component calendar đơn giản).
  - [ ] **invoiceService.js**, **pharmacyService.js**: Kết nối API backend tương ứng.
  - [ ] Kiểm thử: `invoice.test.jsx` – sinh hóa đơn đúng từ lượt khám, tính tổng, trạng thái thanh toán.

---

## Sprint 9 (Tuần 11) – Báo cáo, hoàn thiện, kiểm thử
- [ ] API thống kê (lượt khám, doanh thu, bệnh phổ biến).
- [ ] Viết test tích hợp cho các luồng chính (đặt lịch → khám → kê đơn → cảnh báo AI → thanh toán).
- [ ] Kiểm thử end-to-end thủ công theo kịch bản Use Case trong SRS.
- [ ] Rà soát bảo mật: kiểm tra phân quyền từng API, xử lý lỗi, validate input.
- **Frontend**:
  - [ ] **StatisticsDashboard.jsx**: Biểu đồ thống kê (chart.js hoặc recharts) – lượt khám theo ngày/tháng, top 5 bệnh phổ biến, doanh thu, tỷ lệ hủy lịch.
  - [ ] **AdminDashboardPage.jsx**: Tổng quan quản trị cho ADMIN – KPI cards (bệnh nhân hôm nay, bác sĩ đang trực, cảnh báo AI tháng này).
  - [ ] Hoàn thiện responsive mobile cho toàn bộ giao diện (375px – 1440px).
  - [ ] Rà soát accessibility: aria-label, focus trap trong modal, keyboard navigation.
  - [ ] **E2E Integration Tests**: Vitest Integration Suite kiểm thử full flow đặt lịch → đăng nhập → đặt lịch → xem vé → hủy lịch.
  - [ ] Đảm bảo 100% test suite pass trước khi đóng Sprint.

---

## Sprint 10 (Tuần 12) – Đóng gói & báo cáo
- [ ] Viết Dockerfile cho backend, ai-service; `docker-compose.yml` cho toàn hệ thống.
- [ ] Hoàn thiện Swagger, chuẩn bị data demo.
- [ ] Hoàn thiện báo cáo: SRS, Use Case/Class/Sequence/Activity Diagram, Architecture, kết quả kiểm thử.
- [ ] Chuẩn bị kịch bản demo (theo đúng thứ tự luồng nghiệp vụ).
- **Frontend**:
  - [ ] `npm run build` – production bundle tối ưu, kiểm tra gzip size < 200KB.
  - [ ] Viết `Dockerfile` cho frontend (Nginx serving static files, proxy `/api` sang backend).
  - [ ] Tích hợp vào `docker-compose.yml` chung (`frontend`, `backend`, `ai-service`, `mysql`).
  - [ ] Kiểm thử smoke test sau khi chạy `docker-compose up` – đảm bảo toàn bộ luồng chạy đúng trong container.
  - [ ] Chuẩn bị slide demo frontend: Auth flow → Trang chủ → Triage AI → Đặt lịch → Vé khám → Quản lý lịch.

---

## Trạng Thái Tổng Quan Frontend (React + Vite)

| Sprint | Tính năng Frontend | Trạng thái |
|---|---|---|
| Sprint 0 | Khởi tạo Vite, cấu hình Vitest, thiết kế CSS/Fonts | ✅ Hoàn thành |
| Sprint 1 | Auth Modal, Navbar, Axios Interceptors, AuthContext, Toast, API Tests | ✅ Hoàn thành (25/25 tests pass) |
| Sprint 3 | Booking Modal, Appointment Service, My Appointments, Departments, AI Triage | ✅ Hoàn thành sớm |
| Sprint 4 | Visit Dashboard, Kê đơn điện tử, Chỉ định cận lâm sàng, Tương tác thuốc | ✅ Hoàn thành (33/33 tests pass) |
| Sprint 2 | Hồ sơ bệnh nhân, Dị ứng, patientService | 🔲 Chờ Backend Sprint 2 |
| Sprint 5 | Drug Interaction Alert, AI Alert Service | 🔲 Chờ AI Service Sprint 5 |
| Sprint 6 | Diagnosis Suggest Box | 🔲 Chờ AI Service Sprint 6 |
| Sprint 7 | Chat Widget, Chat History, WebSocket | 🔲 Chờ AI Service Sprint 7 |
| Sprint 8 | Pharmacy, Invoice, Staff Schedule | 🔲 Chờ Backend Sprint 8 |
| Sprint 9 | Statistics Dashboard, Admin KPIs, E2E Tests | 🔲 Sprint 9 |
| Sprint 10 | Production build, Dockerfile, Docker Compose | 🔲 Sprint 10 |

---

## Ghi chú quản lý
- Phân công nên chia theo module (mỗi thành viên phụ trách 2-3 module xuyên suốt Sprint 1-8) để dễ đánh giá đóng góp cá nhân, đúng yêu cầu "phân công công việc nhân sự" của học phần.
- Mỗi sprint nên có 1 buổi review + cập nhật tiến độ, làm căn cứ cho điểm chuyên cần/quá trình.
- Ưu tiên làm xong luồng "happy path" trước, sau đó mới xử lý các trường hợp biên (edge case) và hoàn thiện AI.
- **Frontend nguyên tắc**: Mỗi component mới phải đi kèm test. Mỗi service mới phải có fallback nếu Backend chưa sẵn sàng. Luôn chạy `npm test` trước khi commit.
