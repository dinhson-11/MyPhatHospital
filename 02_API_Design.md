# API Design – HMS-AI

## 1. Nguyên tắc chung
- Kiến trúc REST, base path: `/api/v1`
- Định dạng: JSON, `Content-Type: application/json`
- Xác thực: `Authorization: Bearer <JWT>`
- Phân quyền: mỗi endpoint gắn `@PreAuthorize("hasRole('...')")` theo role tương ứng
- Response chuẩn:
```json
{ "success": true, "data": { }, "message": "OK" }
```
- Lỗi chuẩn:
```json
{ "success": false, "errorCode": "VALIDATION_ERROR", "message": "...", "details": [] }
```
- Mã lỗi HTTP: 400 (dữ liệu sai), 401 (chưa đăng nhập), 403 (không đủ quyền), 404 (không tìm thấy), 409 (xung đột, vd trùng lịch), 500 (lỗi hệ thống).
- Phân trang: `?page=0&size=20&sort=createdAt,desc`

## 2. Auth & User

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /auth/register | Đăng ký (bệnh nhân) | Public |
| POST | /auth/login | Đăng nhập, trả JWT | Public |
| POST | /auth/refresh-token | Làm mới token | Authenticated |
| POST | /auth/forgot-password | Quên mật khẩu | Public |
| GET | /users | Danh sách người dùng | ADMIN |
| POST | /users | Tạo tài khoản nhân viên | ADMIN |
| PUT | /users/{id} | Cập nhật thông tin/role | ADMIN |
| PUT | /users/{id}/status | Khóa/mở tài khoản | ADMIN |

## 3. Bệnh nhân & EMR

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /patients | Tìm kiếm bệnh nhân (tên, SĐT, mã) | RECEPTIONIST, DOCTOR, ADMIN |
| POST | /patients | Tạo hồ sơ bệnh nhân | RECEPTIONIST, ADMIN |
| GET | /patients/{id} | Xem chi tiết hồ sơ | RECEPTIONIST, DOCTOR, ADMIN, PATIENT(self) |
| PUT | /patients/{id} | Cập nhật hồ sơ | RECEPTIONIST, ADMIN |
| GET | /patients/{id}/allergies | Danh sách dị ứng | DOCTOR, NURSE, PATIENT(self) |
| POST | /patients/{id}/allergies | Thêm dị ứng | DOCTOR, NURSE |
| GET | /patients/{id}/medical-records | Lịch sử khám | DOCTOR, PATIENT(self) |

## 4. Đặt lịch khám

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /appointments | Danh sách lịch (lọc theo ngày/bác sĩ) | RECEPTIONIST, DOCTOR, ADMIN |
| POST | /appointments | Đặt lịch mới | PATIENT, RECEPTIONIST |
| PUT | /appointments/{id}/cancel | Hủy lịch | PATIENT(self), RECEPTIONIST |
| PUT | /appointments/{id}/confirm | Xác nhận lịch | RECEPTIONIST |
| GET | /doctors/{id}/available-slots?date= | Khung giờ trống của bác sĩ | Authenticated |

## 5. Khám bệnh & kê đơn

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /visits | Bắt đầu lượt khám (từ appointment) | DOCTOR, NURSE |
| PUT | /visits/{id} | Cập nhật sinh hiệu/chẩn đoán | DOCTOR, NURSE |
| PUT | /visits/{id}/complete | Hoàn tất khám | DOCTOR |
| POST | /visits/{id}/prescriptions | Tạo đơn thuốc | DOCTOR |
| GET | /visits/{id}/prescriptions | Xem đơn thuốc của lượt khám | DOCTOR, PHARMACIST, PATIENT(self) |
| POST | /visits/{id}/lab-orders | Chỉ định cận lâm sàng | DOCTOR |
| PUT | /lab-orders/{id}/result | Nhập kết quả | NURSE, LAB_TECH |

## 6. Nhà thuốc & kho

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /drugs | Danh mục thuốc (tìm kiếm, lọc) | PHARMACIST, DOCTOR, ADMIN |
| POST | /drugs | Thêm thuốc mới | PHARMACIST, ADMIN |
| PUT | /drugs/{id}/stock | Cập nhật tồn kho (nhập/xuất) | PHARMACIST |
| POST | /prescriptions/{id}/dispense | Cấp phát thuốc theo đơn | PHARMACIST |
| GET | /drugs/expiring-soon | Danh sách thuốc sắp hết hạn | PHARMACIST |

## 7. Viện phí

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /invoices/generate/{visitId} | Tự sinh hóa đơn từ lượt khám | ACCOUNTANT (hệ thống tự gọi) |
| GET | /invoices/{id} | Xem chi tiết hóa đơn | ACCOUNTANT, PATIENT(self) |
| PUT | /invoices/{id}/pay | Xác nhận thanh toán (mock) | ACCOUNTANT |

## 8. Nhân sự & lịch trực

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /staff | Danh sách nhân viên | ADMIN |
| POST | /schedules | Xếp lịch trực | ADMIN |
| GET | /schedules?staffId=&week= | Xem lịch trực | Authenticated |

## 9. Báo cáo

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | /reports/visits-summary?from=&to= | Thống kê lượt khám | ADMIN |
| GET | /reports/revenue?from=&to= | Thống kê doanh thu | ADMIN, ACCOUNTANT |
| GET | /reports/top-diagnoses | Bệnh phổ biến | ADMIN, DOCTOR |

## 10. AI Chatbot (FR-10)

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /ai/chat/sessions | Tạo phiên chat mới | PATIENT, Public(guest) |
| POST | /ai/chat/sessions/{id}/messages | Gửi tin nhắn, nhận phản hồi AI | PATIENT, Public(guest) |
| GET | /ai/chat/sessions/{id} | Lấy lịch sử hội thoại | PATIENT(self) |

**Ví dụ request/response** – `POST /ai/chat/sessions/{id}/messages`
```json
// Request
{ "message": "Tôi bị đau bụng và sốt 2 ngày nay" }

// Response
{
  "success": true,
  "data": {
    "reply": "Với triệu chứng đau bụng kèm sốt, bạn nên khám chuyên khoa Tiêu hóa hoặc Nội tổng quát...",
    "suggestedDepartment": "Tiêu hóa",
    "suggestedAction": "BOOK_APPOINTMENT",
    "disclaimer": "Đây là gợi ý tham khảo, không thay thế chẩn đoán y khoa."
  }
}
```

## 11. AI Cảnh báo lâm sàng (FR-11)

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | /ai/clinical/check-interaction | Kiểm tra tương tác thuốc trong đơn | DOCTOR (hệ thống tự gọi khi lưu đơn) |
| POST | /ai/clinical/check-allergy | Kiểm tra thuốc kê với dị ứng bệnh nhân | DOCTOR |
| POST | /ai/clinical/suggest-diagnosis | Gợi ý chẩn đoán phân biệt | DOCTOR |
| GET | /ai/clinical/suggestions/{visitId} | Xem lịch sử gợi ý AI của lượt khám | DOCTOR, ADMIN |

**Ví dụ** – `POST /ai/clinical/check-interaction`
```json
// Request
{ "drugIds": [12, 27, 45] }

// Response
{
  "success": true,
  "data": {
    "hasWarning": true,
    "warnings": [
      {
        "drugA": "Aspirin",
        "drugB": "Warfarin",
        "severity": "SEVERE",
        "description": "Tăng nguy cơ chảy máu khi dùng đồng thời."
      }
    ],
    "disclaimer": "Kết quả chỉ mang tính tham khảo, bác sĩ ra quyết định cuối cùng."
  }
}
```

## 12. Tài liệu hóa API
Dùng `springdoc-openapi` để tự sinh Swagger UI tại `/swagger-ui.html`, phục vụ demo và làm phụ lục báo cáo.
