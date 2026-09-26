# Kế hoạch Code chi tiết – HMS-AI

Giả định lộ trình ~10-12 tuần, khớp với các giai đoạn học phần: Chọn đề tài → Xác định yêu cầu → Phân tích thiết kế → Triển khai → Kiểm thử → Báo cáo.

## Sprint 0 (Tuần 1) – Khởi tạo ✅
- [x] Khởi tạo repo Git (backend, ai-service, frontend – 3 thư mục hoặc 3 repo).
- [x] Setup Spring Boot project (Spring Initializr: Web, JPA, Security, Validation, MySQL Driver, Lombok).
- [x] Setup MySQL, tạo schema từ `03_DB_Design.md` (dùng Flyway/Liquibase để quản lý migration).
- [x] Setup FastAPI project rỗng cho AI Service, healthcheck endpoint.
- [x] Cấu hình Swagger, cấu hình CORS, cấu hình application.yml (profile dev/prod).
- [x] Viết README mô tả cách chạy dự án.

## Sprint 1 (Tuần 2) – Auth & phân quyền
- [ ] Entity: `User, Role, UserRole, Department, StaffProfile`.
- [ ] Đăng ký/Đăng nhập, sinh JWT, JWT filter, `UserDetailsService`.
- [ ] `@PreAuthorize` theo role, xử lý exception tập trung (`@ControllerAdvice`).
- [ ] API quản lý user (ADMIN).
- [ ] Unit test cho AuthService.
- **Deliverable**: đăng nhập/đăng ký chạy được, phân quyền cơ bản.

## Sprint 2 (Tuần 3) – Bệnh nhân & EMR
- [ ] Entity: `Patient, PatientAllergy, MedicalRecord`.
- [ ] CRUD hồ sơ bệnh nhân, tìm kiếm (theo tên/SĐT/mã), phân trang.
- [ ] API dị ứng bệnh nhân (dữ liệu đầu vào cho AI sau này).
- [ ] Test API bằng Postman collection.

## Sprint 3 (Tuần 4) – Đặt lịch khám
- [ ] Entity: `Appointment`.
- [ ] API đặt/hủy/xác nhận lịch, kiểm tra trùng lịch bác sĩ (unique constraint + logic service).
- [ ] API lấy khung giờ trống theo bác sĩ/ngày.
- [ ] (Có thể làm UI đặt lịch đơn giản để demo sớm.)

## Sprint 4 (Tuần 5-6) – Khám bệnh, kê đơn, cận lâm sàng
- [ ] Entity: `Visit, Prescription, PrescriptionItem, LabOrder, LabResult, Drug`.
- [ ] API bắt đầu/hoàn tất lượt khám, ghi chẩn đoán.
- [ ] API tạo đơn thuốc, chỉ định/nhập kết quả CLS.
- [ ] Seed dữ liệu mẫu: danh mục thuốc, bảng `drug_interactions`.
- **Điểm mốc**: đủ dữ liệu để bắt đầu tích hợp AI cảnh báo.

## Sprint 5 (Tuần 7) – AI Service: Cảnh báo tương tác thuốc & dị ứng (FR-11.1, 11.2)
- [ ] AI Service: endpoint `/check-interaction`, `/check-allergy` (rule-based, tra cứu dữ liệu `drug_interactions`/`patient_allergies` được backend gửi kèm hoặc AI Service tự query DB).
- [ ] Backend: `AiClientService` gọi AI Service khi bác sĩ lưu đơn thuốc; hiển thị cảnh báo ở response tạo đơn.
- [ ] Lưu log vào `ai_clinical_suggestions`.
- [ ] Test case: đơn có/không có tương tác, có/không có dị ứng.

## Sprint 6 (Tuần 8) – AI Service: Gợi ý chẩn đoán (FR-11.3)
- [ ] Chuẩn bị tập dữ liệu mẫu (triệu chứng ↔ chẩn đoán) – có thể tự tạo bộ nhỏ cho demo.
- [ ] Cài đặt rule-based scoring hoặc mô hình phân loại đơn giản (scikit-learn).
- [ ] Endpoint `/suggest-diagnosis`, tích hợp vào màn hình khám bệnh của bác sĩ.
- [ ] Gắn disclaimer + log vào `ai_clinical_suggestions`.

## Sprint 7 (Tuần 9) – AI Chatbot (FR-10)
- [ ] Entity: `ChatSession, ChatMessage`.
- [ ] AI Service: endpoint `/chat` — xác định intent (SYMPTOM_CHECK/BOOKING/FAQ), sinh phản hồi (rule-based cho FAQ, gợi ý chuyên khoa theo từ khóa triệu chứng, hoặc gọi LLM API nếu nhóm có key).
- [ ] Backend: API tạo phiên chat, gửi/nhận tin nhắn, lưu lịch sử.
- [ ] Xử lý case "vượt phạm vi tư vấn" → trả cảnh báo liên hệ y tế/cấp cứu.
- [ ] Tích hợp chatbot UI (widget chat đơn giản) vào frontend bệnh nhân.

## Sprint 8 (Tuần 10) – Nhà thuốc, viện phí, nhân sự (rút gọn)
- [ ] API cấp phát thuốc + trừ kho tự động.
- [ ] API sinh hóa đơn tự động từ lượt khám, xác nhận thanh toán (mock).
- [ ] API cơ bản quản lý nhân sự/lịch trực.

## Sprint 9 (Tuần 11) – Báo cáo, hoàn thiện, kiểm thử
- [ ] API thống kê (lượt khám, doanh thu, bệnh phổ biến).
- [ ] Viết test tích hợp cho các luồng chính (đặt lịch → khám → kê đơn → cảnh báo AI → thanh toán).
- [ ] Kiểm thử end-to-end thủ công theo kịch bản Use Case trong SRS.
- [ ] Rà soát bảo mật: kiểm tra phân quyền từng API, xử lý lỗi, validate input.

## Sprint 10 (Tuần 12) – Đóng gói & báo cáo
- [ ] Viết Dockerfile cho backend, ai-service; `docker-compose.yml` cho toàn hệ thống.
- [ ] Hoàn thiện Swagger, chuẩn bị data demo.
- [ ] Hoàn thiện báo cáo: SRS, Use Case/Class/Sequence/Activity Diagram, Architecture, kết quả kiểm thử.
- [ ] Chuẩn bị kịch bản demo (theo đúng thứ tự luồng nghiệp vụ).

## Ghi chú quản lý
- Phân công nên chia theo module (mỗi thành viên phụ trách 2-3 module xuyên suốt Sprint 1-8) để dễ đánh giá đóng góp cá nhân, đúng yêu cầu "phân công công việc nhân sự" của học phần.
- Mỗi sprint nên có 1 buổi review + cập nhật tiến độ, làm căn cứ cho điểm chuyên cần/quá trình.
- Ưu tiên làm xong luồng "happy path" trước, sau đó mới xử lý các trường hợp biên (edge case) và hoàn thiện AI.
