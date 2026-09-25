# SRS – Đặc tả yêu cầu phần mềm
## Hệ thống Quản lý Bệnh viện tích hợp AI (Hospital Management System with AI – HMS-AI)

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu mô tả toàn bộ yêu cầu chức năng và phi chức năng của hệ thống HMS-AI, làm cơ sở cho việc phân tích, thiết kế, code và kiểm thử trong khuôn khổ học phần Project 1.

### 1.2 Phạm vi
Hệ thống hỗ trợ quản lý toàn bộ quy trình khám chữa bệnh tại một cơ sở y tế: từ đặt lịch, khám bệnh, kê đơn, cận lâm sàng, nhà thuốc, viện phí, đến quản trị nhân sự. Tích hợp hai tính năng AI:
- **AI Chatbot**: tư vấn bệnh nhân, gợi ý chuyên khoa theo triệu chứng, hỗ trợ đặt lịch.
- **AI Cảnh báo lâm sàng**: cảnh báo tương tác thuốc, gợi ý chẩn đoán tham khảo cho bác sĩ dựa trên triệu chứng/tiền sử.

AI đóng vai trò **hỗ trợ ra quyết định**, không thay thế chỉ định của bác sĩ.

### 1.3 Định nghĩa, thuật ngữ
| Thuật ngữ | Ý nghĩa |
|---|---|
| EMR | Electronic Medical Record – Hồ sơ bệnh án điện tử |
| RBAC | Role-Based Access Control – Phân quyền theo vai trò |
| ICD-10 | Bảng phân loại bệnh quốc tế |
| JWT | JSON Web Token – token xác thực |

### 1.4 Tài liệu tham khảo
Slide học phần Project 1 (Giới thiệu học phần, Xác định yêu cầu, Phân tích hệ thống).

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm
Ứng dụng web (có thể mở rộng app di động) dùng trong nội bộ một bệnh viện/phòng khám, đồng thời cho phép bệnh nhân tự đặt lịch, xem kết quả qua cổng bệnh nhân (patient portal).

### 2.2 Tác nhân (Actors)
| Tác nhân | Mô tả |
|---|---|
| Bệnh nhân | Đăng ký, đặt lịch, xem hồ sơ, chat với AI |
| Lễ tân | Tiếp nhận, tạo hồ sơ, xếp lịch khám |
| Bác sĩ | Khám, chẩn đoán, kê đơn, xem gợi ý AI |
| Điều dưỡng | Ghi nhận sinh hiệu, hỗ trợ cận lâm sàng |
| Dược sĩ | Cấp phát thuốc, quản lý kho thuốc |
| Kế toán/Thu ngân | Lập hóa đơn, thu viện phí |
| Quản trị viên | Quản lý người dùng, phân quyền, danh mục |
| AI Service | Tác nhân hệ thống: xử lý chatbot, phân tích cảnh báo |

### 2.3 Tổng quan chức năng (module)
1. Quản lý tài khoản & phân quyền (Auth/RBAC)
2. Quản lý bệnh nhân & hồ sơ bệnh án (EMR)
3. Đặt lịch khám (Appointment)
4. Khám bệnh & kê đơn (Clinical Visit/Prescription)
5. Cận lâm sàng (Lab/Imaging Order & Result)
6. Nhà thuốc & kho (Pharmacy/Inventory)
7. Viện phí & thanh toán (Billing)
8. Quản lý nhân sự & lịch trực (HR/Schedule)
9. Báo cáo thống kê (Reporting)
10. AI Chatbot tư vấn bệnh nhân
11. AI Cảnh báo tương tác thuốc & gợi ý chẩn đoán

### 2.4 Ràng buộc thiết kế
- Backend: Java Spring Boot (REST API).
- CSDL: MySQL.
- Phải tuân thủ nguyên tắc bảo mật dữ liệu y tế (mã hóa, phân quyền chặt).
- AI có thể triển khai dưới dạng service riêng (Python) hoặc gọi API mô hình ngôn ngữ, giao tiếp qua REST/message queue với backend chính.

### 2.5 Giả định
- Dữ liệu triệu chứng – tương tác thuốc dùng bộ dữ liệu mẫu/tự xây dựng cho mục đích học phần (không phải dữ liệu lâm sàng chính thức).
- Không xử lý thanh toán thật (mock payment).

---

## 3. Yêu cầu chức năng

### 3.1 Quản lý tài khoản & phân quyền
- FR-1.1: Đăng ký/đăng nhập (JWT), đổi mật khẩu, quên mật khẩu.
- FR-1.2: Phân quyền theo vai trò: ADMIN, RECEPTIONIST, DOCTOR, NURSE, PHARMACIST, ACCOUNTANT, PATIENT.
- FR-1.3: Quản trị viên quản lý người dùng, vai trò, khoa/phòng ban.

### 3.2 Quản lý bệnh nhân & EMR
- FR-2.1: Tạo/cập nhật hồ sơ bệnh nhân (thông tin cá nhân, tiền sử bệnh, dị ứng).
- FR-2.2: Tra cứu bệnh nhân theo mã, tên, SĐT, CCCD.
- FR-2.3: Xem lịch sử khám bệnh, đơn thuốc, kết quả xét nghiệm của bệnh nhân.

### 3.3 Đặt lịch khám
- FR-3.1: Bệnh nhân/lễ tân đặt lịch theo chuyên khoa, bác sĩ, khung giờ.
- FR-3.2: Hủy/đổi lịch, nhắc lịch (thông báo).
- FR-3.3: Kiểm tra trùng lịch bác sĩ.

### 3.4 Khám bệnh & kê đơn
- FR-4.1: Bác sĩ ghi nhận triệu chứng, khám lâm sàng, chẩn đoán (ICD-10).
- FR-4.2: Kê đơn thuốc: chọn thuốc, liều dùng, số lượng.
- FR-4.3: Chỉ định cận lâm sàng (xét nghiệm/chẩn đoán hình ảnh).
- FR-4.4: Hệ thống hiển thị cảnh báo AI (tương tác thuốc, dị ứng, gợi ý chẩn đoán) ngay trong màn hình kê đơn/chẩn đoán.

### 3.5 Cận lâm sàng
- FR-5.1: Điều dưỡng/kỹ thuật viên nhập kết quả xét nghiệm/CĐHA.
- FR-5.2: Bác sĩ xem kết quả gắn với hồ sơ khám.

### 3.6 Nhà thuốc & kho
- FR-6.1: Quản lý danh mục thuốc, tồn kho, hạn dùng.
- FR-6.2: Cấp phát thuốc theo đơn, trừ kho tự động.
- FR-6.3: Cảnh báo thuốc sắp hết hạn/hết hàng.

### 3.7 Viện phí & thanh toán
- FR-7.1: Tự động tính viện phí từ dịch vụ khám, thuốc, cận lâm sàng.
- FR-7.2: Lập hóa đơn, xác nhận thanh toán (mock).

### 3.8 Nhân sự & lịch trực
- FR-8.1: Quản lý hồ sơ nhân viên, chuyên khoa, ca trực.
- FR-8.2: Xếp lịch trực theo tuần/tháng.

### 3.9 Báo cáo thống kê
- FR-9.1: Thống kê lượt khám, doanh thu, bệnh phổ biến theo thời gian.
- FR-9.2: Xuất báo cáo (PDF/Excel).

### 3.10 AI Chatbot tư vấn bệnh nhân
- FR-10.1: Bệnh nhân mô tả triệu chứng bằng ngôn ngữ tự nhiên, chatbot gợi ý chuyên khoa phù hợp.
- FR-10.2: Chatbot hỗ trợ đặt lịch, trả lời câu hỏi thường gặp (giờ khám, thủ tục, giá dịch vụ).
- FR-10.3: Lưu lịch sử hội thoại gắn với tài khoản bệnh nhân.
- FR-10.4: Khi câu hỏi vượt phạm vi tư vấn (triệu chứng cấp cứu, nội dung nhạy cảm), chatbot khuyến nghị liên hệ trực tiếp cơ sở y tế/cấp cứu.

### 3.11 AI Cảnh báo tương tác thuốc & gợi ý chẩn đoán
- FR-11.1: Khi bác sĩ kê từ 2 thuốc trở lên, hệ thống kiểm tra và cảnh báo tương tác thuốc (mức độ: nhẹ/trung bình/nặng).
- FR-11.2: Kiểm tra thuốc với dị ứng đã ghi nhận của bệnh nhân.
- FR-11.3: Dựa trên triệu chứng + tiền sử, gợi ý danh sách chẩn đoán phân biệt tham khảo kèm mức độ tin cậy.
- FR-11.4: Toàn bộ gợi ý AI được gắn nhãn rõ "Chỉ mang tính tham khảo" và log lại để truy vết (audit).

---

## 4. Yêu cầu phi chức năng

| Mã | Loại | Mô tả |
|---|---|---|
| NFR-1 | Bảo mật | Mã hóa mật khẩu (BCrypt), JWT có thời hạn, HTTPS, phân quyền API theo role |
| NFR-2 | Bảo mật dữ liệu | Dữ liệu y tế nhạy cảm (EMR) chỉ truy cập theo đúng vai trò/quan hệ khám chữa bệnh |
| NFR-3 | Hiệu năng | API trả kết quả < 1s với thao tác thường; cảnh báo AI < 3s |
| NFR-4 | Khả dụng | Hệ thống hoạt động ổn định giờ hành chính, có cơ chế log lỗi |
| NFR-5 | Khả năng mở rộng | Kiến trúc tách lớp, dễ thêm module/AI service mới |
| NFR-6 | Sao lưu | Sao lưu định kỳ CSDL |
| NFR-7 | Khả năng bảo trì | Code tuân thủ chuẩn layered architecture, có tài liệu API (Swagger) |
| NFR-8 | Tính minh bạch AI | Mọi output AI phải có disclaimer và log để audit |

---

## 5. Mô hình hóa yêu cầu (tóm tắt)

### 5.1 Danh sách Use Case chính
UC01 Đăng nhập · UC02 Quản lý tài khoản · UC03 Tạo hồ sơ bệnh nhân · UC04 Đặt lịch khám · UC05 Khám bệnh & chẩn đoán · UC06 Kê đơn thuốc · UC07 Chỉ định & nhập kết quả CLS · UC08 Cấp phát thuốc · UC09 Lập hóa đơn/thanh toán · UC10 Xếp lịch trực · UC11 Xem báo cáo thống kê · UC12 Chat với AI tư vấn · UC13 Nhận cảnh báo tương tác thuốc/gợi ý chẩn đoán.

*(Use Case Diagram, Activity Diagram chi tiết sẽ được vẽ ở giai đoạn Phân tích thiết kế – Class/Sequence/Activity Diagram, theo đúng cấu trúc báo cáo yêu cầu của học phần.)*

### 5.2 Sơ đồ luồng dữ liệu mức ngữ cảnh (mô tả)
Tác nhân bên ngoài: Bệnh nhân, Bác sĩ/Điều dưỡng/Dược sĩ/Kế toán, Quản trị viên ⇄ Hệ thống HMS-AI ⇄ AI Service (nội bộ).

---

## 6. Ưu tiên & phạm vi MVP (cho đồ án)
Do thời lượng học phần có hạn, đề xuất ưu tiên triển khai đầy đủ: Auth/RBAC, Bệnh nhân/EMR, Đặt lịch, Khám bệnh/Kê đơn, AI Chatbot, AI Cảnh báo tương tác thuốc. Các module Nhân sự/Báo cáo nâng cao có thể làm ở mức cơ bản.
