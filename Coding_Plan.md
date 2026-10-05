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

## Sprint 2 (Tuần 3) – Bệnh nhân & EMR ✅

- [x] Entity: `Patient, PatientAllergy, MedicalRecord` + Flyway `V14__add_patient_blood_type.sql` (bổ sung `blood_type`).
- [x] CRUD hồ sơ bệnh nhân, tìm kiếm (theo tên/SĐT/mã), phân trang.
- [x] API dị ứng bệnh nhân (dữ liệu đầu vào cho AI sau này); PATIENT được thêm/xóa dị ứng của chính mình, self-access check ở `PatientController` (hồ sơ + dị ứng).
- [x] Test API bằng Postman collection: `backend/postman/HMS-AI_Sprint2_Patient.postman_collection.json`.
- [x] Backend Unit Tests: `PatientServiceImplTest` (+2 test nhóm máu), `PatientAllergyServiceImplTest`.
- **Frontend** ✅:
  - [x] **Hồ sơ bệnh nhân** (`PatientProfileModal.jsx`): xem & chỉnh sửa (họ tên, ngày sinh, giới tính, CCCD, SĐT, địa chỉ, nhóm máu) kèm validation inline.
  - [x] **Danh sách dị ứng** (`AllergiesSection.jsx`): hiển thị & thêm/xóa dị ứng.
  - [x] **Tích hợp API**: `patientService.js` gọi `GET/PUT /api/v1/patients/me`, `GET/POST/DELETE /api/v1/patients/{id}/allergies`; thêm `validatePatientProfile`, `BLOOD_TYPES`; fallback offline.
  - [x] **Kiểm thử**: `patient.test.jsx` (12 tests pass) – validation, lấy/cập nhật hồ sơ, thêm/xóa dị ứng, modal.

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

## Sprint 8 (Tuần 10) – Nhà thuốc, viện phí, nhân sự & lịch trực (FR-6, FR-7, FR-8) ✅ (Hoàn thành Fullstack Backend + Frontend + DB Migration)

### 1. Phân hệ Nhà thuốc & Kho (Pharmacy & Dispense - FR-6) ✅

- **Database & Flyway Migration**:
  - [x] Tận dụng bảng `dispenses` đã tạo trong migration `V7__create_drugs_pharmacy.sql` (`id`, `prescription_id`, `dispensed_by`, `dispensed_at`, `created_at`).
  - [x] Thêm seed dữ liệu mở rộng số lượng tồn kho ban đầu và ngày hết hạn cho danh mục 15 thuốc thiết yếu trong `drugs` trong `V13__create_staff_schedules.sql` (thuốc còn dồi dào, thuốc sắp hết hàng tồn <= 20, và thuốc sắp hết hạn <= 30 ngày).
- **Backend Architecture & Code (`com.hospital.hmsai.pharmacy`)**:
  - **Entity**:
    - [x] `Dispense`: `@Entity`, `@Table(name = "dispenses")`, quan hệ `@ManyToOne` với `Prescription` và `StaffProfile` (dược sĩ cấp phát), trường `dispensedAt`, `note`, `createdAt`.
    - [x] Mở rộng `Drug`: bổ sung helper methods kiểm tra tồn kho (`isLowStock()`, `isExpiringSoon(int days)`).
  - **Repository**:
    - [x] `DispenseRepository`: `findByPrescriptionId(Long prescriptionId)`, `existsByPrescriptionId(Long prescriptionId)`, `findAllByOrderByDispensedAtDesc()`.
    - [x] `DrugRepository` (bổ sung): `findByStockQuantityLessThanEqual(int threshold)`, `findByExpiryDateBeforeAndStockQuantityGreaterThan(LocalDate date, int minStock)`.
  - **Service Layer (Interface + Impl)**:
    - [x] `DispenseService`:
      - `dispensePrescription(Long prescriptionId, DispenseRequest request)`: `@Transactional` – Kiểm tra đơn tồn tại (`ResourceNotFoundException`), kiểm tra đơn chưa từng được cấp phát (`BusinessException`), duyệt từng `PrescriptionItem` kiểm tra đủ tồn kho (`BusinessException("Thuốc {name} không đủ tồn kho")`), trừ tồn kho tự động (`stockQuantity - quantity`), lưu bản ghi `Dispense`, trả về `DispenseResponse`.
      - `getDispenseByPrescriptionId(Long prescriptionId)`: Lấy thông tin chi tiết cấp phát của đơn.
      - `getDispenses(Pageable pageable)`: Lấy danh sách các lượt cấp phát thuốc.
    - [x] `DrugService` (bổ sung):
      - `createDrug(CreateDrugRequest request)`: Thêm thuốc mới vào danh mục (`PHARMACIST`, `ADMIN`).
      - `updateStock(Long drugId, UpdateStockRequest request)`: Nhập/xuất kho tự động với số lượng điều chỉnh (`IMPORT`, `EXPORT`, `ADJUSTMENT`).
      - `getExpiringSoonDrugs(int days)`: Danh sách thuốc sắp hết hạn trong N ngày tới (`FR-6.3`).
      - `getLowStockDrugs(int threshold)`: Danh sách thuốc tồn kho thấp dưới ngưỡng cảnh báo (`FR-6.3`).
  - **Controller Layer & RBAC (`/api/v1`)**:
    - [x] `DispenseController`:
      - `POST /api/v1/prescriptions/{id}/dispense`: Cấp phát thuốc theo đơn (`@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")`).
      - `GET /api/v1/prescriptions/{id}/dispense`: Xem thông tin cấp phát đơn (`@PreAuthorize("hasAnyRole('PHARMACIST', 'DOCTOR', 'ADMIN', 'PATIENT')")`).
      - `GET /api/v1/prescriptions/{id}/is-dispensed`: Kiểm tra trạng thái cấp phát.
      - `GET /api/v1/dispenses`: Danh sách các lượt cấp phát thuốc.
    - [x] `DrugController` (bổ sung):
      - `POST /api/v1/drugs`: Thêm thuốc mới (`@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")`).
      - `PUT /api/v1/drugs/{id}/stock`: Cập nhật nhập/xuất kho (`@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")`).
      - `GET /api/v1/drugs/expiring-soon`: Lọc thuốc sắp hết hạn (`@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")`).
      - `GET /api/v1/drugs/low-stock`: Lọc thuốc sắp hết hàng (`@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")`).
  - **Backend Unit Tests (`src/test/java/.../pharmacy/`)**:
    - [x] `DispenseServiceImplTest` (5 tests pass): Cấp phát thành công trừ kho, chặn khi không tìm thấy đơn, chặn khi đã cấp phát trước đó, chặn khi không đủ tồn kho, lấy chi tiết cấp phát.

---

### 2. Phân hệ Viện phí & Thanh toán (Billing & Invoices - FR-7) ✅

- **Database Schema**:
  - [x] Bảng `invoices` và `invoice_items` từ migration `V8__create_billing.sql` và mở rộng cột `payment_method`, `transaction_code`, `paid_at` trong `V13__create_staff_schedules.sql`.
- **Backend Architecture & Code (`com.hospital.hmsai.billing`)**:
  - **Entity**:
    - [x] `Invoice`: `@Entity`, `@Table(name = "invoices")`, `@ManyToOne` với `Patient` và `Visit`, `totalAmount`, enum `InvoiceStatus` (`PENDING`, `PAID`, `CANCELLED`), `@OneToMany` với `InvoiceItem`, `paymentMethod`, `transactionCode`, `paidAt`, timestamps.
    - [x] `InvoiceItem`: `@Entity`, `@Table(name = "invoice_items")`, enum `InvoiceItemType` (`SERVICE`, `DRUG`, `LAB`), `refId`, `description`, `amount`, `@ManyToOne` với `Invoice`.
  - **Repository**:
    - [x] `InvoiceRepository`: `findByVisitId(Long visitId)`, `findByPatientId(Long patientId, Pageable pageable)`, `findByStatus(InvoiceStatus status, Pageable pageable)`, `findAll(Pageable pageable)`.
    - [x] `InvoiceItemRepository`: `findByInvoiceId(Long invoiceId)`.
  - **Service Layer (Interface + Impl)**:
    - [x] `InvoiceService`:
      - `generateInvoiceFromVisit(Long visitId)`: `@Transactional` – Tự động tổng hợp chi phí từ ca khám (Khám dịch vụ 150.000 VNĐ + Tiền thuốc kê đơn + Tiền cận lâm sàng xét nghiệm).
      - `getInvoiceById(Long id)`: Lấy chi tiết hóa đơn kèm kiểm tra self-access (Patient chỉ xem hóa đơn của chính mình; Kế toán/Admin xem toàn bộ).
      - `getInvoiceByVisitId(Long visitId)`: Tra cứu hóa đơn của ca khám.
      - `payInvoice(Long id, PayInvoiceRequest request)`: Xác nhận thanh toán (mock) – chuyển trạng thái sang `PAID`, ghi nhận phương thức thanh toán (`CASH` hoặc `VIETQR`), sinh mã GD.
      - `getInvoices(Pageable pageable)`: Danh sách hóa đơn phân trang.
  - **Controller Layer & RBAC (`/api/v1/invoices`)**:
    - [x] `POST /api/v1/invoices/generate/{visitId}`: Tự động sinh hóa đơn (`@PreAuthorize("hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN')")`).
    - [x] `GET /api/v1/invoices/{id}`: Xem chi tiết hóa đơn (`@PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN', 'PATIENT')")`).
    - [x] `GET /api/v1/invoices/visit/{visitId}`: Lấy hóa đơn theo ca khám (`@PreAuthorize("hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN', 'PATIENT')")`).
    - [x] `PUT /api/v1/invoices/{id}/pay`: Xác nhận thanh toán (`@PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")`).
    - [x] `GET /api/v1/invoices`: Danh sách hóa đơn phân trang (`@PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")`).
  - **Backend Unit Tests (`src/test/java/.../billing/`)**:
    - [x] `InvoiceServiceImplTest` (5 tests pass): Sinh hóa đơn đầy đủ 3 khoản, sinh hóa đơn không có đơn/CLS, thanh toán thành công, chặn thanh toán khi đã PAID, kiểm tra bảo mật phân quyền self-access.

---

### 3. Phân hệ Quản lý Nhân sự & Lịch trực (HR & Staff Schedules - FR-8) ✅

- **Database & Flyway Migration**:
  - [x] File migration `V13__create_staff_schedules.sql`: Bảng `staff_schedules` với khóa composite chống trùng lịch `CONSTRAINT uk_staff_schedule UNIQUE (staff_id, work_date, shift)`, seed dữ liệu tài khoản `duocsi`, `ketoan`, profiles và lịch trực mẫu tuần.
- **Backend Architecture & Code (`com.hospital.hmsai.hr`)**:
  - **Entity**:
    - [x] `StaffSchedule`: `@Entity`, `@Table(name = "staff_schedules")`, quan hệ `@ManyToOne` với `StaffProfile` và `Department`, `workDate`, enum `WorkShift` (`MORNING`, `AFTERNOON`, `NIGHT`, `FULL_DAY`), `roomNo`, `note`, timestamps.
  - **Repository**:
    - [x] `StaffScheduleRepository`: `findByWorkDateBetween`, `findByStaffProfileIdAndWorkDateBetween`, `findByDepartmentIdAndWorkDateBetween`, `existsByStaffProfileIdAndWorkDateAndShift`.
  - **Service Layer (Interface + Impl)**:
    - [x] `StaffService`: Lấy danh bạ nhân sự y tế (`getAllStaff`, `getStaffById`).
    - [x] `ScheduleService`:
      - `createSchedule(ScheduleRequest request)`: Kiểm tra chống trùng lịch trực cùng ca/ngày (`BusinessException("Nhân viên đã có lịch trực trong ca này")`), lưu ca trực.
      - `createBatchSchedules(BatchScheduleRequest request)`: Xếp lịch hàng loạt theo tuần.
      - `getSchedules(Long staffId, Long departmentId, LocalDate startDate, LocalDate endDate)`: Tra cứu lịch trực linh hoạt theo tuần/tháng.
      - `deleteSchedule(Long scheduleId)`: Hủy ca trực (`ADMIN`).
  - **Controller Layer & RBAC (`/api/v1`)**:
    - [x] `StaffController`: `GET /api/v1/staff`, `GET /api/v1/staff/{id}` (`@PreAuthorize("isAuthenticated()")`).
    - [x] `ScheduleController`:
      - `POST /api/v1/schedules`: Xếp lịch trực mới (`@PreAuthorize("hasRole('ADMIN')")`).
      - `POST /api/v1/schedules/batch`: Xếp lịch trực hàng loạt (`@PreAuthorize("hasRole('ADMIN')")`).
      - `GET /api/v1/schedules`: Tra cứu lịch trực (`@PreAuthorize("isAuthenticated()")`).
      - `DELETE /api/v1/schedules/{id}`: Hủy lịch trực (`@PreAuthorize("hasRole('ADMIN')")`).
  - **Backend Unit Tests (`src/test/java/.../hr/`)**:
    - [x] `ScheduleServiceImplTest` (4 tests pass): Xếp lịch trực thành công, chặn xếp trùng ca cho cùng 1 nhân viên, tra cứu theo khoảng thời gian, hủy ca trực.
  - **Tổng kết Backend Sprint 8**: **81/81 tests pass (100%)** trên toàn bộ test suite.

---

### 4. Giao diện Frontend (React + Vite) ✅

- **Services mới (`frontend/src/services/`)**:
  - [x] `pharmacyService.js`: Tìm kiếm thuốc, cấp phát đơn, cảnh báo hết hạn, cảnh báo hết hàng tồn, điều chỉnh tồn kho, offline local fallback.
  - [x] `invoiceService.js`: Sinh hóa đơn tự động từ ca khám, tra cứu chi tiết, thanh toán hóa đơn, sinh chuỗi/mã VietQR chuẩn NAPAS247, offline local fallback.
  - [x] `scheduleService.js`: Lấy danh bạ nhân sự, tra cứu lịch trực tuần/tháng theo phòng ban/nhân viên, xếp lịch đơn/hàng loạt, xóa lịch, offline local fallback.
- **Components & Modals mới (`frontend/src/components/`)**:
  - [x] **Nhà thuốc (`frontend/src/components/pharmacy/PharmacyDispenseModal.jsx`)**:
    - Tab 1: Cấp phát thuốc theo mã vé khám/đơn thuốc, hiển thị chi tiết thuốc và liều lượng, cảnh báo an toàn thuốc, nút xác nhận cấp phát trừ kho, in Phiếu Cấp Phát Thuốc.
    - Tab 2: Danh mục kho dược, badge cảnh báo hết hàng/hạn dùng, modal nhập/xuất/điều chỉnh tồn kho thuốc.
  - [x] **Viện phí (`frontend/src/components/billing/InvoiceModal.jsx`)**:
    - Tra cứu hóa đơn theo ca khám/mã bệnh nhân, bảng kê chi tiết 3 phần: Khám dịch vụ + Đơn thuốc + Cận lâm sàng.
    - Modal thanh toán đa kênh: Tiền mặt (tính tiền thừa tự động), VietQR động chuẩn NAPAS247 (hiển thị mã QR ngân hàng có sẵn số tiền & nội dung).
    - Cập nhật trạng thái `ĐÃ THANH TOÁN`, in Hóa Đơn Thu Viện Phí.
  - [x] **Lịch trực nhân viên (`frontend/src/components/hr/StaffScheduleModal.jsx`)**:
    - Lưới lịch trực tuần 7 ngày, phân định 3 ca (Sáng, Chiều, Đêm), bộ lọc Khoa/Phòng ban.
    - Form Admin xếp lịch trực trực quan kèm cơ chế validate chặn trùng lịch trực ngay trên UI.
- **Tích hợp Navbar & Tài khoản Dùng thử (Mock Accounts)**:
  - [x] `Navbar.jsx`: Phân quyền hiển thị nút "Nhà thuốc" (`PHARMACIST`), "Viện phí" (`ACCOUNTANT`), "Lịch trực" (toàn bộ nhân viên y tế & quản trị).
  - [x] `AuthModal.jsx`: Thêm 2 nút 1-click đăng nhập nhanh:
    - **Dược sĩ**: `duocsi` / `Pharmacist@123` (DS. Đỗ Thị Mai – Kho Dược).
    - **Kế toán**: `ketoan` / `Accountant@123` (KT. Trần Thị Hoa – Phòng Tài chính - Kế toán).
  - [x] `App.jsx`: Tích hợp toàn bộ state, trigger handler và modal rendering cho 3 modal mới.
- **Kiểm thử Frontend (Vitest - `frontend/src/tests/`)**:
  - [x] `pharmacy.test.jsx` (9/9 tests pass): Cấp phát, trừ kho, chặn cấp phát lại, cảnh báo hết hạn & tồn thấp, nhập xuất kho.
  - [x] `invoice.test.jsx` (9/9 tests pass): Gom 3 nhóm phí, tính tổng, thanh toán tiền mặt (tính tiền thừa), thanh toán VietQR, in hóa đơn.
  - [x] `schedule.test.jsx` (7/7 tests pass): Render lịch trực tuần, lọc phòng ban, admin xếp lịch, chặn xếp trùng ca.
  - [x] **Tổng kết Frontend Sprint 8**: **96/96 tests pass (100%)** trên 12 test files, production bundle build thành công (156.46 kB gzip).

---

### 5. Ý nghĩa & Điểm mốc Đạt được sau Sprint 8

- **Hoàn chỉnh 100% chu trình nghiệp vụ bệnh viện**:
  $$\text{Đăng ký (S1)} \rightarrow \text{Đặt lịch (S3)} \rightarrow \text{Khám, CLS, Kê đơn, AI Alert (S4-S6)} \rightarrow \text{Nhà thuốc cấp phát \& trừ kho (S8)} \rightarrow \text{Thanh toán viện phí (S8)}$$
- Dữ liệu lượt khám, doanh thu thanh toán viện phí, và danh mục bệnh ICD-10 được tích lũy đầy đủ và sẵn sàng 100% để bước vào **Sprint 9 – Báo cáo thống kê (Reporting Dashboard)**.

---

## Sprint 9 (Tuần 11) – Phân quyền toàn diện (RBAC), Báo cáo, Hoàn thiện & Kiểm thử ✅

> Kế hoạch phân quyền chi tiết: [05_RBAC_Role_Permissions_Plan.md](file:///d:/01_Work/Projects/thanhSonHospital/05_RBAC_Role_Permissions_Plan.md)

- [x] API thống kê (lượt khám, doanh thu, bệnh phổ biến – `ReportController`, `ReportService`, 4 endpoints).
- [x] Viết test tích hợp cho các luồng chính (đặt lịch → khám → kê đơn → cảnh báo AI → thanh toán).
- [x] Kiểm thử end-to-end liên hoàn theo kịch bản Use Case trong SRS (`e2eFlow.test.jsx`).
- [x] Rà soát bảo mật & Phân quyền đa tầng (RBAC Hardening):
  - [x] Xây dựng `SecurityService` xử lý Self-Access SpEL (`isCurrentPatient`, `isAppointmentOwner`, `isVisitPatient`, `isInvoicePatient`).
  - [x] Đồng bộ `@PreAuthorize` toàn diện trên toàn bộ REST Controllers theo ma trận phân quyền 7 vai trò.
  - [x] Migration Flyway `V15__seed_receptionist_nurse.sql`: Tạo tài khoản chuyên trách `letan` (RECEPTIONIST) và `dieuduong` (NURSE).
  - [x] Viết bộ test phân quyền Backend (`RBACSecurityTest.java`): 11 ca kiểm thử bảo mật `SEC-01` -> `SEC-11` (100% pass).
- **Frontend** ✅:
  - [x] **ReceptionDashboardModal.jsx**: Quầy tiếp đón lễ tân – tra cứu/tạo hồ sơ bệnh nhân, xác nhận lịch hẹn, check-in chuyển khám (`receptionService.js`, `reception.test.jsx`).
  - [x] **NurseStationModal.jsx**: Trạm điều dưỡng & Lab – đo sinh hiệu nhanh hàng loạt, tính BMI tự động, nhập kết quả CLS (`nurseService.js`, `nurse.test.jsx`).
  - [x] **Navbar.jsx & AuthContext.jsx**: Cung cấp helpers phân quyền cho 7 roles, menu động thông minh theo vai trò.
  - [x] **AuthModal.jsx**: Bổ sung thanh Quick Demo Switcher với 7 nút 1-click đăng nhập nhanh 7 roles để phục vụ nghiệm thu đồ án.
  - [x] **StatisticsDashboardModal.jsx**: Biểu đồ thống kê SVG và BI – lượt khám 7 ngày, cơ cấu doanh thu Tiền mặt vs VietQR, top 5 bệnh ICD-10 (`reportService.js`, `report.test.jsx`).
  - [x] Hoàn thiện responsive mobile cho toàn bộ giao diện (375px – 1440px).
  - [x] Rà soát accessibility: aria-label, focus trap trong modal, keyboard navigation.
  - [x] **E2E Integration Tests**: Vitest Integration Suite kiểm thử full flow 7 vai trò (`e2eFlow.test.jsx`).
  - [x] Đảm bảo 100% test suite pass: **100/100 tests Backend** và **133/133 tests Frontend** pass (100%).

---

## Sprint 10 (Tuần 12) – Đóng gói & báo cáo ✅

- [x] Viết Dockerfile cho backend (Multi-stage Maven + Temurin 17 JRE Alpine), ai-service (Python 3.11-slim + Uvicorn); `docker-compose.yml` cho toàn hệ thống (MySQL + Backend + AI + Frontend).
- [x] Hoàn thiện Swagger UI (`/swagger-ui/index.html`), chuẩn bị data demo 7 vai trò.
- [x] Hoàn thiện tài liệu kiến trúc & phân quyền: SRS, API Design, DB Design, Architecture, RBAC Role Permissions Plan (`05_RBAC_Role_Permissions_Plan.md`).
- [x] Chuẩn bị kịch bản demo (theo đúng thứ tự luồng nghiệp vụ 7 roles).
- **Frontend** ✅:
  - [x] `npm run build` – production bundle tối ưu thành công (gzip: 169.94 kB < 200KB).
  - [x] Viết `Dockerfile` cho frontend (Multi-stage Node 20-alpine -> Nginx Alpine, EXPOSE 80).
  - [x] Viết `nginx.conf` cấu hình reverse proxy `/api/v1/` sang Backend, gzip compression, SPA fallback routing.
  - [x] Tích hợp vào `docker-compose.yml` chung 4 services (`frontend`, `backend`, `ai-service`, `mysql`).
  - [x] Kiểm thử smoke test và cấu hình networking bridge `hmsai-network`.

---

## Trạng Thái Tổng Quan Frontend (React + Vite)

| Sprint | Tính năng Frontend | Trạng thái |
| --- | --- | --- |
| Sprint 0 | Khởi tạo Vite, cấu hình Vitest, thiết kế CSS/Fonts | ✅ Hoàn thành |
| Sprint 1 | Auth Modal, Navbar, Axios Interceptors, AuthContext, Toast, API Tests | ✅ Hoàn thành (25/25 tests pass) |
| Sprint 3 | Booking Modal, Appointment Service, My Appointments, Departments, AI Triage | ✅ Hoàn thành sớm |
| Sprint 4 | Visit Dashboard, Kê đơn điện tử, Chỉ định cận lâm sàng, Tương tác thuốc | ✅ Hoàn thành (33/33 tests pass) |
| Sprint 2 | Hồ sơ bệnh nhân, Dị ứng, patientService, nhóm máu + validation | ✅ Hoàn thành (12 tests pass) |
| Sprint 5 | Drug Interaction Alert, AI Alert Service, Tab AI Audit Log | ✅ Hoàn thành (45/45 tests pass) |
| Sprint 6 | Diagnosis Suggest Box, AI Suggest Service, Audit Log | ✅ Hoàn thành (57/57 tests pass) |
| Sprint 7 | Chat Widget, Chat History, Chat Service, ChatMessage | ✅ Hoàn thành (71/71 tests pass) |
| Sprint 8 | Pharmacy Dispense & Stock, Invoice & VietQR, Staff Schedule | ✅ Hoàn thành (81/81 backend tests, 96/96 frontend tests pass) |
| Sprint 9 | Tiếp đón (Reception), Trạm Điều dưỡng (Nurse), Báo cáo (BI), 7 Roles RBAC, E2E Tests | ✅ Hoàn thành (100/100 backend tests, 133/133 frontend tests pass) |
| Sprint 10 | Production build (169.94 kB), Dockerfile, Nginx Reverse Proxy, Docker Compose 4 services | ✅ Hoàn thành |

---

## Ghi chú quản lý

- Phân công nên chia theo module (mỗi thành viên phụ trách 2-3 module xuyên suốt Sprint 1-8) để dễ đánh giá đóng góp cá nhân, đúng yêu cầu "phân công công việc nhân sự" của học phần.
- Mỗi sprint nên có 1 buổi review + cập nhật tiến độ, làm căn cứ cho điểm chuyên cần/quá trình.
- Ưu tiên làm xong luồng "happy path" trước, sau đó mới xử lý các trường hợp biên (edge case) và hoàn thiện AI.
- **Frontend nguyên tắc**: Mỗi component mới phải đi kèm test. Mỗi service mới phải có fallback nếu Backend chưa sẵn sàng. Luôn chạy `npm test` trước khi commit.
