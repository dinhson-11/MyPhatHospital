# Rule: Security & Data Protection

## Nguyên tắc tối cao
Đây là hệ thống y tế – dữ liệu bệnh nhân là **dữ liệu nhạy cảm**. Mọi vi phạm bảo mật đều nghiêm trọng.

## Authentication

### JWT
- Access token: 15-30 phút, KHÔNG lâu hơn
- Refresh token: 7 ngày
- Secret key: **PHẢI** dùng environment variable, **TUYỆT ĐỐI KHÔNG** hardcode
- Token phải chứa: `userId`, `username`, `roles`, `exp`
- Mã hóa mật khẩu: BCrypt (strength >= 10)

### Password Policy
- Tối thiểu 8 ký tự
- Có chữ hoa, chữ thường, số
- KHÔNG lưu plaintext password ở bất kỳ đâu (log, response, database)

## Authorization (RBAC)

### Nguyên tắc
- Mọi API endpoint PHẢI có `@PreAuthorize` (trừ public endpoints)
- Patient chỉ xem được dữ liệu **của chính mình** (self-access)
- Doctor chỉ xem EMR của bệnh nhân **đang khám/đã khám**
- Dữ liệu EMR KHÔNG bao giờ trả cho role không liên quan

### Endpoints public (không cần auth)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `GET /swagger-ui/**`
- `POST /api/v1/ai/chat/**` (chatbot cho guest)

## Data Protection

### KHÔNG BAO GIỜ
- Hard delete dữ liệu bệnh nhân/hồ sơ y tế → dùng soft delete
- Trả password hash trong response
- Log dữ liệu nhạy cảm (password, token, thông tin y tế chi tiết)
- Expose stack trace cho client trong production
- Lưu credentials trong source code

### LUÔN LUÔN
- Validate input ở cả Controller (Bean Validation) và Service layer
- Sanitize user input để tránh SQL injection, XSS
- Log ai truy cập hồ sơ EMR nào, lúc nào (audit trail)
- Mã hóa dữ liệu nhạy cảm khi cần thiết
- Giới hạn CORS theo domain cụ thể (không dùng `*` trong production)

## AI Safety

### Bắt buộc
- Mọi output AI **PHẢI** có disclaimer: "Chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa"
- Mọi gợi ý AI **PHẢI** được log vào `ai_clinical_suggestions` (audit)
- Chatbot **PHẢI** nhận diện triệu chứng cấp cứu và khuyến nghị gọi 115/đến cơ sở y tế
- AI Service lỗi → backend vẫn hoạt động bình thường (graceful degradation)
- **KHÔNG BAO GIỜ** để AI tự quyết định thay bác sĩ
