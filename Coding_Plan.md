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

## Sprint 5 (Tuần 7) – AI Service: Cảnh báo tương tác thuốc & dị ứng (FR-11.1, 11.2) ✅ (Hoàn thành Fullstack AI + Backend + Frontend)
- [x] AI Service (FastAPI): Endpoint `/api/v1/ai/clinical/check-interaction`, `/check-allergy`, `/check-prescription-safety` (phân tích tương tác thuốc mở rộng, dị ứng trực tiếp & phản ứng chéo họ Beta-lactam/NSAID/Quinolone/Macrolide, kèm disclaimer y tế bắt buộc theo NFR-8).
- [x] Unit test AI Service: `test_clinical_service.py` (6/6 tests pass).
- [x] Backend (Spring Boot 3): `AiClinicalService` gọi REST sang FastAPI AI Service với timeout 3s (NFR-3); tự động fallback an toàn sang DB local khi AI Service offline.
- [x] Bảng log audit: Entity & Repository `AiClinicalSuggestion` map bảng `ai_clinical_suggestions` (NFR-8), tự động lưu trữ vết dữ liệu `input_snapshot`, `output_content`, `confidence_score`.
- [x] Backend REST Controller: `AiClinicalController` (`POST /check-interaction`, `POST /check-allergy`, `POST /visits/{id}/check-safety`, `GET /visits/{id}/suggestions`).
- [x] Tích hợp `VisitServiceImpl.createPrescription`: Tự động phân tích an toàn lâm sàng và trả về các trường `hasWarning`, `interactionWarnings`, `allergyAlerts`, `aiDisclaimer` trong `PrescriptionResponse`.
- [x] Backend Unit Tests: `AiClinicalServiceImplTest` (5 tests pass), `VisitServiceImplTest` (11 tests pass) -> Tổng Backend: 59/59 tests pass (100%).
- **Frontend** ✅:
  - [x] **aiAlertService.js**: Client service gọi API kiểm tra tương tác thuốc, dị ứng và lấy lịch sử audit log AI; tích hợp knowledge base fallback khi offline.
  - [x] **DrugInteractionAlert.jsx**: Banner cảnh báo trực quan đa cấp độ CRITICAL / WARNING / INFO / SAFE; hiển thị tên thuốc, cơ chế dược lý, hậu quả, khuyến cáo lâm sàng và Disclaimer y tế bắt buộc theo NFR-8.
  - [x] **PrescriptionForm.jsx**: Tích hợp nút "Kiểm tra an toàn (AI)", tự động phân tích an toàn thuốc realtime (debounce 350ms), hiển thị banner cảnh báo và lưu cảnh báo vào đơn thuốc.
  - [x] **VisitDashboard.jsx**: Bổ sung Tab 5 "Lịch sử AI Audit (NFR-8)" truy vết toàn bộ dữ liệu phân tích AI của ca khám.
  - [x] **Kiểm thử**: `drugAlert.test.jsx` (12 tests pass) -> Tổng Frontend: 45/45 tests pass (100%), production bundle build thành công (132.52 kB gzip).

---

## Sprint 6 (Tuần 8) – AI Service: Gợi ý chẩn đoán (FR-11.3) ✅ (Hoàn thành Fullstack AI + Backend + Frontend)
- [x] AI Service (FastAPI): Cơ sở tri thức 10 nhóm bệnh lý lâm sàng (Tim mạch, Hô hấp, Tiêu hóa, Nội tiết, Cơ xương khớp, Thần kinh, Tiết niệu, Da liễu, Mắt/TMH, Truyền nhiễm) với rule-based weighted keyword scoring.
- [x] Endpoint `POST /api/v1/ai/clinical/suggest-diagnosis`: Nhận triệu chứng → trả Top 3 ICD-10 gợi ý sắp xếp theo confidence giảm dần, kèm disclaimer NFR-8.
- [x] Unit test AI Service: `test_diagnosis_service.py` (8/8 tests pass).
- [x] Backend (Spring Boot 3): `AiClinicalServiceImpl.suggestDiagnosis` gọi REST sang FastAPI AI Service; tự động fallback knowledge base cục bộ khi AI Service offline.
- [x] Backend Controller: `POST /suggest-diagnosis` + `POST /visits/{visitId}/suggest-diagnosis` (kèm ghi audit log `DIAGNOSIS_SUGGESTION` vào bảng `ai_clinical_suggestions` – NFR-8).
- [x] Gắn disclaimer y tế + log audit `DIAGNOSIS_SUGGESTION` vào `ai_clinical_suggestions`.
- **Frontend** ✅:
  - [x] **DiagnosisSuggestBox.jsx**: Nâng cấp với nút "Phân tích AI" trigger API, loading spinner, debounce 500ms, badge confidence đa màu, chỉ báo nguồn (AI Service / Local KB). Bác sĩ click thẻ để điền nhanh ICD-10.
  - [x] **aiAlertService.js**: Thêm `suggestDiagnosis()` gọi `POST /api/v1/ai/clinical/suggest-diagnosis`, fallback cục bộ 6 nhóm bệnh lý.
  - [x] Disclaimer y tế nổi bật "AI chỉ hỗ trợ, không thay thế phán đoán lâm sàng của bác sĩ" theo NFR-8.
  - [x] **Kiểm thử**: `chatAndDiagnosis.test.jsx` (12 tests pass: 3 ChatWidget + 9 DiagnosisSuggestBox) → Tổng Frontend: 57/57 tests pass (100%).

---

## Sprint 7 (Tuần 9) – AI Chatbot (FR-10) ✅ (Hoàn thành Fullstack AI + Backend + Frontend)
- [x] Entity: `ChatSession, ChatMessage` (Backend JPA + Flyway V9 schema).
- [x] AI Service: endpoint `/api/v1/ai/chat/message` — intent routing (SYMPTOM_CHECK / BOOKING / FAQ / GREETING / OUT_OF_SCOPE / EMERGENCY), gợi ý 9 chuyên khoa, tri thức FAQ BHYT & lịch khám, cảnh báo vượt phạm vi → hotline 115. 14/14 tests pass.
- [x] Backend: `ChatService`, `ChatController`, `ChatSessionRepository`, `ChatMessageRepository` — API tạo phiên, lưu lịch sử tin nhắn USER & AI, fallback rule-based khi AI offline. 13/13 tests pass.
- [x] Xử lý case "vượt phạm vi tư vấn" → trả cảnh báo khẩn cấp + hotline cấp cứu 115.
- [x] Tích hợp chatbot UI (Floating Action Button + chat window) vào frontend bệnh nhân.
- **Frontend**:
  - [x] **ChatWidget.jsx**: FAB góc phải màn hình, mở popover chat 24/7, typing indicator, quản lý session ID, nút tạo phiên mới và xem lịch sử.
  - [x] **ChatMessage.jsx**: Render bong bóng tin nhắn Người dùng / AI, format markdown, thẻ chuyên khoa khuyến nghị + nút "Đặt khám khoa này ngay", hộp cảnh báo khẩn cấp 115, disclaimer NFR-8.
  - [x] **ChatHistory.jsx**: Danh sách phiên hội thoại trước đó, số lượng tin nhắn, preview nội dung, chuyển đổi phiên nhanh.
  - [x] **chatService.js**: Kết nối `POST /api/v1/chat/message`, quản lý sessions, cơ chế fallback local tức thì.
  - [x] **Kiểm thử**: `chatbot.test.jsx` (14/14 tests pass) + `chatAndDiagnosis.test.jsx` (12/12 tests pass) → Tổng Frontend: 71/71 tests pass (100%).

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
| Sprint 5 | Drug Interaction Alert, AI Alert Service, Tab AI Audit Log | ✅ Hoàn thành (45/45 tests pass) |
| Sprint 6 | Diagnosis Suggest Box, AI Suggest Service, Audit Log | ✅ Hoàn thành (57/57 tests pass) |
| Sprint 7 | Chat Widget, Chat History, Chat Service, ChatMessage | ✅ Hoàn thành (71/71 tests pass) |
| Sprint 8 | Pharmacy, Invoice, Staff Schedule | 🔲 Chờ Backend Sprint 8 |
| Sprint 9 | Statistics Dashboard, Admin KPIs, E2E Tests | 🔲 Sprint 9 |
| Sprint 10 | Production build, Dockerfile, Docker Compose | 🔲 Sprint 10 |

---

## Ghi chú quản lý
- Phân công nên chia theo module (mỗi thành viên phụ trách 2-3 module xuyên suốt Sprint 1-8) để dễ đánh giá đóng góp cá nhân, đúng yêu cầu "phân công công việc nhân sự" của học phần.
- Mỗi sprint nên có 1 buổi review + cập nhật tiến độ, làm căn cứ cho điểm chuyên cần/quá trình.
- Ưu tiên làm xong luồng "happy path" trước, sau đó mới xử lý các trường hợp biên (edge case) và hoàn thiện AI.
- **Frontend nguyên tắc**: Mỗi component mới phải đi kèm test. Mỗi service mới phải có fallback nếu Backend chưa sẵn sàng. Luôn chạy `npm test` trước khi commit.
