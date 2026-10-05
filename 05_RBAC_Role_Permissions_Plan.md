# KẾ HOẠCH TRIỂN KHAI PHÂN QUYỀN (RBAC) & MA TRẬN CHỨC NĂNG THEO VAI TRÒ
## Hệ thống Quản lý Bệnh viện Tích hợp Trí tuệ Nhân tạo (HMS-AI)

> **Mã tài liệu**: `05_RBAC_Role_Permissions_Plan.md`  
> **Phiên bản**: 1.0  
> **Trạng thái**: Đã phê duyệt kiến trúc – Sẵn sàng thực thi  
> **Cơ sở tham chiếu**: `CLAUDE.md`, `.claude/rules/security.md`, `.claude/rules/code-style.md`, `.claude/rules/database.md`, `.claude/skills/jwt-security/SKILL.md`, `01_SRS.md`, `02_API_Design.md`, `04_Architecture.md`.

---

## 1. Cơ sở và Nguyên tắc Bảo mật Dữ liệu Y tế

### 1.1 Bối cảnh và Mục tiêu
Hệ thống HMS-AI quản lý toàn bộ chu trình khám chữa bệnh tại cơ sở y tế với tính năng tích hợp AI hỗ trợ lâm sàng. Dữ liệu y tế (EMR - Electronic Medical Record, thông tin bệnh nhân, đơn thuốc, cận lâm sàng, chẩn đoán) thuộc nhóm **dữ liệu nhạy cảm cấp độ cao**. Việc thiết kế phân quyền (Role-Based Access Control - RBAC) phải bảo đảm:
1. **Bảo mật tuyệt đối**: Ngăn chặn rò rỉ dữ liệu y tế, không cho phép role không có thẩm quyền truy cập EMR.
2. **Tuân thủ quy trình nghiệp vụ lâm sàng**: Đảm bảo luồng vận hành y tế liền mạch giữa 7 vai trò chuyên môn.
3. **Minh bạch và Truy vết (Auditability)**: Mọi thao tác truy cập hồ sơ bệnh án và các khuyến nghị AI đều được lưu vết phục vụ pháp lý y khoa.

### 1.2 Tuân thủ Nghiêm ngặt Bộ Quy tắc (Rules) & Kỹ năng (Skills)
Tài liệu này được xây dựng dựa trên việc tuân thủ triệt để các quy tắc cốt lõi đã định nghĩa trong dự án:

| Quy tắc / Kỹ năng | Nguồn định nghĩa | Yêu cầu bắt buộc áp dụng |
|---|---|---|
| **Security & Data Protection** | `.claude/rules/security.md` | - Access token ngắn hạn (15–30 phút), Refresh token 7 ngày.<br>- Mọi API nghiệp vụ **bắt buộc** gắn `@PreAuthorize` (ngoại trừ public endpoints).<br>- Mã hóa mật khẩu bằng BCrypt (strength >= 10).<br>- **Tuyệt đối không hard delete** dữ liệu bệnh nhân/EMR (chỉ dùng soft delete `is_deleted`).<br>- **Tuyệt đối không** trả password hash trong API response. |
| **Self-Access Rule** | `.claude/rules/security.md`, `02_API_Design.md` | - `PATIENT` chỉ được xem và thao tác trên dữ liệu **của chính mình** (hồ sơ, dị ứng, lịch hẹn, đơn thuốc, kết quả xét nghiệm, hóa đơn).<br>- `DOCTOR` chỉ được xem EMR của bệnh nhân mình đang khám hoặc đã tiếp nhận. |
| **AI Safety & Transparency** | `.claude/rules/security.md` (Mục 5), NFR-8 | - Mọi output AI **bắt buộc** có disclaimer y tế: *"Chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa"**.<br>- Mọi gợi ý AI (tương tác thuốc, gợi ý chẩn đoán) **bắt buộc** log vào bảng `ai_clinical_suggestions`.<br>- AI Service gặp sự cố thì hệ thống chính vẫn hoạt động bình thường (Graceful Degradation).<br>- Chatbot nhận diện triệu chứng cấp cứu phải lập tức trả số cấp cứu **115**. |
| **Layered Architecture & Code Style** | `.claude/rules/code-style.md` | Phân lớp bắt buộc: `Controller -> Service (Interface + Impl) -> Repository -> Entity`. Không xử lý business logic ở Controller. DTO tách biệt Entity. |
| **Database & Flyway Migration** | `.claude/rules/database.md` | Bảng số nhiều (`patients`, `appointments`), chuẩn hóa 3NF, timestamp, soft delete, Flyway migration versioned `V<N>__<name>.sql`. |
| **JWT Security & Spring Security** | `.claude/skills/jwt-security/SKILL.md` | `JwtAuthFilter` trích xuất `Authorization: Bearer <token>`, nạp `UserDetails` có prefix `ROLE_`, gán vào `SecurityContextHolder`. |

---

## 2. Đặc tả Chi tiết 7 Vai trò (Roles Specification)

Hệ thống thiết lập chính xác **7 vai trò nghiệp vụ (RBAC)** theo chuẩn SRS:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        7 VAI TRÒ CHÍNH (HMS-AI)                         │
├──────────────┬──────────────────┬───────────────┬──────────────────────┤
│ Mã Role (DB) │ Tên hiển thị     │ Nhóm đối tượng│ Trách nhiệm trọng tâm│
├──────────────┼──────────────────┼───────────────┼──────────────────────┤
│ ADMIN        │ Quản trị viên    │ Ban Quản trị  │ Toàn quyền hệ thống  │
│ RECEPTIONIST │ Lễ tân tiếp đón  │ Khối Hành chính Tiếp đón & Xếp lịch   │
│ DOCTOR       │ Bác sĩ lâm sàng  │ Khối Chuyên môn Khám, Chẩn đoán, Kê đơn│
│ NURSE        │ Điều dưỡng viên  │ Khối Hỗ trợ   │ Sinh hiệu, Phòng Lab │
│ PHARMACIST   │ Dược sĩ          │ Khối Dược     │ Kho thuốc, Cấp phát  │
│ ACCOUNTANT   │ Kế toán/Thu ngân │ Khối Tài chính│ Viện phí, Thanh toán │
│ PATIENT      │ Bệnh nhân        │ Khách hàng    │ Đặt lịch, Tra cứu cá nhân│
└──────────────┴──────────────────┴───────────────┴──────────────────────┘
```

---

### 2.1 Role `ADMIN` (Quản trị viên Hệ thống)
- **Mục đích**: Chịu trách nhiệm bảo đảm hệ thống vận hành thông suốt, bảo mật dữ liệu, quản lý nhân sự và cấu hình danh mục toàn viện.
- **Phạm vi dữ liệu**: Toàn viện (Global Scope).
- **Chức năng được phép**:
  1. **Quản lý Tài khoản & Phân quyền**: Xem danh sách người dùng, tạo tài khoản nhân viên y tế (Bác sĩ, Dược sĩ, Kế toán, Lễ tân, Điều dưỡng), khóa/mở khóa tài khoản, phân bổ vai trò (`POST/PUT /api/v1/users/**`).
  2. **Quản lý Danh mục Bệnh viện**: Tạo/cập nhật thông tin chuyên khoa (`departments`), danh bạ buồng khám, bảng giá dịch vụ khám.
  3. **Quản lý Nhân sự & Phân ca trực**: Tạo lịch trực, phân ca trực tuần/tháng cho toàn bộ nhân sự y tế (`POST/DELETE /api/v1/schedules/**`), kiểm soát xung đột ca trực.
  4. **Giám sát & Báo cáo viện phí / Hoạt động**: Xem thống kê tổng lượt khám, doanh thu toàn viện, top bệnh phổ biến (`/api/v1/reports/**`).
  5. **Audit Trail & AI Log Monitoring**: Xem nhật ký truy vết hệ thống và bảng lịch sử gợi ý AI (`ai_clinical_suggestions`).
- **Hành vi bị cấm**:
  - Không được trực tiếp kê đơn thuốc, không can thiệp nội dung chuyên môn chẩn đoán của bác sĩ.
  - Không được xóa cứng (`hard delete`) bất kỳ hồ sơ y tế nào.
- **Giao diện làm việc (Frontend)**:
  - `AdminDashboardPage`: Bảng điều khiển KPI tổng thể, quản trị người dùng, xếp lịch trực nhân viên, báo cáo doanh thu & lượt khám.

---

### 2.2 Role `RECEPTIONIST` (Lễ tân / Nhân viên Tiếp đón)
- **Mục đích**: Là tuyến đầu tiếp nhận bệnh nhân đến viện, xử lý thủ tục hành chính, phân luồng bệnh nhân và điều phối lịch khám.
- **Phạm vi dữ liệu**: Danh sách bệnh nhân tiếp nhận trong ngày, lịch hẹn khám, thông tin hành chính bệnh nhân.
- **Chức năng được phép**:
  1. **Tiếp nhận & Tạo hồ sơ bệnh nhân**: Tra cứu bệnh nhân theo CCCD/SĐT/Mã BN; tạo mới hồ sơ bệnh nhân đến khám lần đầu; cập nhật thông tin hành chính (`POST/PUT /api/v1/patients/**`).
  2. **Quản lý Đặt lịch khám (Appointments)**: Đặt lịch khám trực tiếp cho bệnh nhân tại quầy; tiếp nhận danh sách đặt trước trực tuyến; xác nhận lịch (`confirm`), hủy lịch (`cancel`) hoặc chuyển đổi khung giờ/bác sĩ khi có yêu cầu (`/api/v1/appointments/**`).
  3. **Điều phối Hàng đợi Phòng khám**: Check-in bệnh nhân có mặt tại viện, khởi tạo lượt khám (`POST /api/v1/visits`) gắn với chuyên khoa và bác sĩ trực để đưa bệnh nhân vào hàng đợi khám.
  4. **Tra cứu Lịch trực Bác sĩ**: Tra cứu lịch trực theo ngày của các chuyên khoa để tư vấn cho bệnh nhân (`GET /api/v1/schedules`).
- **Hành vi bị cấm**:
  - Tuyệt đối không được xem chi tiết chẩn đoán bệnh án, không xem đơn thuốc, không xem kết quả cận lâm sàng chi tiết của bệnh nhân.
  - Không được tạo tài khoản người dùng hoặc sửa phân quyền.
- **Giao diện làm việc (Frontend)**:
  - `ReceptionDashboardModal`: Quầy tiếp đón bệnh nhân – tìm kiếm bệnh nhân nhanh, tạo hồ sơ mới, xác nhận lịch hẹn trong ngày, check-in chuyển vào buồng khám.

---

### 2.3 Role `DOCTOR` (Bác sĩ Chuyên khoa / Bác sĩ Lâm sàng)
- **Mục đích**: Thực hiện quy trình khám bệnh lâm sàng, chẩn đoán, chỉ định cận lâm sàng, kê đơn điều trị và quyết định y khoa dựa trên hỗ trợ của AI.
- **Phạm vi dữ liệu**: Bệnh nhân thuộc danh sách chờ khám và lịch sử khám của bệnh nhân do bác sĩ phụ trách.
- **Chức năng được phép**:
  1. **Quản lý Ca khám (Visits Queue)**: Tiếp nhận ca khám từ hàng đợi buồng khám, bắt đầu khám, ghi nhận lý do khám, tiền sử bệnh, bệnh sử và triệu chứng lâm sàng (`/api/v1/visits/**`).
  2. **Chẩn đoán Bệnh (ICD-10)**: Nhập mã và tên chẩn đoán ICD-10; sử dụng tính năng **AI Diagnosis Suggestion** (`POST /api/v1/ai/clinical/suggest-diagnosis`) để tham khảo các gợi ý chẩn đoán phân biệt có trọng số tin cậy.
  3. **Chỉ định Cận lâm sàng (Lab Orders)**: Ra chỉ định xét nghiệm máu, nước tiểu, chẩn đoán hình ảnh (X-quang, Siêu âm...) gắn với ca khám (`POST /api/v1/visits/{id}/lab-orders`); theo dõi trạng thái và đọc kết quả khi phòng xét nghiệm trả về.
  4. **Kê đơn Thuốc Điện tử (Prescriptions)**: Kê đơn thuốc từ danh mục thuốc khả dụng trong kho; hệ thống kích hoạt tự động **AI Drug Interaction & Allergy Checker** (`POST /api/v1/ai/clinical/check-interaction`, `check-allergy`) để cảnh báo tức thì các tương tác nguy hiểm hoặc nguy cơ dị ứng thuốc.
  5. **Hoàn tất Khám (Complete Visit)**: Khóa hồ sơ lượt khám (`PUT /api/v1/visits/{id}/complete`), tự động chuyển tiếp dữ liệu đến Nhà thuốc và Thu ngân.
  6. **Xem Lịch trực cá nhân**: Tra cứu ca trực của mình trong tuần/tháng (`GET /api/v1/schedules`).
- **Hành vi bị cấm**:
  - Không được cấp phát thuốc hoặc trừ tồn kho dược (nhiệm vụ riêng của Dược sĩ).
  - Không được thu tiền hoặc trực tiếp đổi trạng thái hóa đơn viện phí sang `PAID` (nhiệm vụ của Kế toán).
- **Giao diện làm việc (Frontend)**:
  - `VisitDashboard`: Phòng khám Bác sĩ đa năng – Hàng đợi bệnh nhân, Bảng sinh hiệu & tính BMI tự động, Hộp gợi ý chẩn đoán AI (`DiagnosisSuggestBox`), Kê đơn thuốc điện tử (`PrescriptionForm`) tích hợp cảnh báo tương tác (`DrugInteractionAlert`), Bảng chỉ định & kết quả cận lâm sàng (`LabOrderPanel`), Tab Audit AI Log.

---

### 2.4 Role `NURSE` (Điều dưỡng viên / Kỹ thuật viên Cận lâm sàng)
- **Mục đích**: Hỗ trợ bác sĩ đo lường và theo dõi các chỉ số sinh tồn của bệnh nhân; tiếp nhận chỉ định và cập nhật kết quả xét nghiệm/CĐHA.
- **Phạm vi dữ liệu**: Ca khám đang chờ/đang thực hiện tại khoa và danh sách chỉ định cận lâm sàng được giao.
- **Chức năng được phép**:
  1. **Ghi nhận & Cập nhật Sinh hiệu (Vitals)**: Tiếp nhận bệnh nhân trước khi vào gặp bác sĩ; đo và nhập Huyết áp, Mạch, Thân nhiệt, Nhịp thở, SpO2, Chiều cao, Cân nặng (hệ thống tự động tính BMI) vào hồ sơ ca khám (`PUT /api/v1/visits/{id}`).
  2. **Cập nhật Tiền sử Dị ứng**: Phỏng vấn và ghi nhận các dị ứng thuốc/thức ăn vào hồ sơ bệnh nhân (`POST /api/v1/patients/{id}/allergies`).
  3. **Tiếp nhận & Xử lý Cận lâm sàng (Lab Orders)**: Xem danh sách chỉ định xét nghiệm từ bác sĩ; lấy mẫu, cập nhật trạng thái chỉ định (`PROCESSING` -> `COMPLETED`).
  4. **Nhập Kết quả Xét nghiệm (Lab Results)**: Nhập giá trị kết quả đo được, khoảng tham chiếu chuẩn, kết luận lâm sàng và link đính kèm kết quả hình ảnh/PDF (`PUT /api/v1/lab-orders/{id}/result`).
  5. **Xem Lịch trực cá nhân**: Xem lịch phân công ca trực của điều dưỡng (`GET /api/v1/schedules`).
- **Hành vi bị cấm**:
  - Không được ra y lệnh chẩn đoán bệnh thay bác sĩ.
  - Không được tự ý kê đơn thuốc hoặc sửa đổi đơn thuốc đã kê.
- **Giao diện làm việc (Frontend)**:
  - `NurseStationModal`: Trạm Điều dưỡng & Phòng Lab – Bảng đo sinh hiệu nhanh hàng loạt trước khám, tiếp nhận và nhập kết quả cận lâm sàng.

---

### 2.5 Role `PHARMACIST` (Dược sĩ / Quản lý Kho Dược)
- **Mục đích**: Quản lý xuất/nhập/tồn kho dược phẩm; kiểm tra tính hợp lệ của đơn thuốc và thực hiện cấp phát thuốc an toàn cho bệnh nhân.
- **Phạm vi dữ liệu**: Danh mục thuốc toàn viện, tồn kho thuốc, các đơn thuốc đã được bác sĩ hoàn tất kê đơn.
- **Chức năng được phép**:
  1. **Quản lý Danh mục & Kho Thuốc**: Thêm mới thuốc vào danh mục, cập nhật giá bán, đơn vị tính, hoạt chất, hạn dùng; thực hiện nhập kho/xuất kho/điều chỉnh tồn kho (`/api/v1/drugs/**`).
  2. **Giám sát Cảnh báo Kho Dược**: Theo dõi danh sách thuốc sắp hết hạn (<= 30 ngày) và thuốc có mức tồn kho dưới ngưỡng an toàn (`GET /api/v1/drugs/expiring-soon`, `/low-stock`).
  3. **Tiếp nhận Đơn thuốc Điện tử**: Tra cứu đơn thuốc theo mã ca khám hoặc mã bệnh nhân; kiểm tra liều dùng và đối chiếu cảnh báo tương tác thuốc.
  4. **Cấp phát Thuốc (Dispense)**: Xác nhận cấp phát thuốc theo đơn (`POST /api/v1/prescriptions/{id}/dispense`), hệ thống tự động kiểm tra đủ tồn kho và trừ kho tức thì; in **Phiếu Cấp Phát Thuốc**.
  5. **Xem Lịch trực cá nhân**: Xem ca trực khoa Dược (`GET /api/v1/schedules`).
- **Hành vi bị cấm**:
  - Không được tự ý sửa nội dung đơn thuốc của bác sĩ mà không có sự đồng ý của bác sĩ lâm sàng.
  - Không được thu viện phí (thuộc quyền kế toán).
- **Giao diện làm việc (Frontend)**:
  - `PharmacyDispenseModal`: Bàn Dược sĩ – Tab 1: Cấp phát thuốc theo đơn & in phiếu xuất thuốc; Tab 2: Danh mục kho dược, cảnh báo hạn dùng/hết hàng và modal nhập/xuất kho.

---

### 2.6 Role `ACCOUNTANT` (Kế toán / Thu ngân Viện phí)
- **Mục đích**: Quản lý tài chính, thu viện phí, xuất hóa đơn và tổng hợp báo cáo doanh thu tài chính bệnh viện.
- **Phạm vi dữ liệu**: Hóa đơn viện phí, bảng kê chi phí ca khám, báo cáo tài chính doanh thu.
- **Chức năng được phép**:
  1. **Tổng hợp Chi phí & Lập Hóa đơn**: Hệ thống tự động gom 3 nhóm phí từ ca khám hoàn tất: Tiền khám dịch vụ + Tiền thuốc kê đơn + Tiền cận lâm sàng xét nghiệm (`POST /api/v1/invoices/generate/{visitId}`).
  2. **Thu Viện phí & Xác nhận Thanh toán**:
     - Thu tiền mặt: Nhập tiền khách đưa, hệ thống tự tính tiền thừa trả khách.
     - Thanh toán điện tử VietQR: Tạo mã QR động chuẩn NAPAS247 chứa chính xác số tiền, số tài khoản thụ hưởng và nội dung mã hóa đơn.
     - Chuyển trạng thái hóa đơn sang `PAID`, ghi nhận mã giao dịch (`transactionCode`) và thời điểm thanh toán (`paidAt`) (`PUT /api/v1/invoices/{id}/pay`).
  3. **In Biên lai / Hóa đơn Viện phí**: Xuất bản in hóa đơn chi tiết 3 phần theo chuẩn kế toán bệnh viện.
  4. **Báo cáo Doanh thu**: Xem thống kê doanh thu theo mốc thời gian, khoa phòng, phương thức thanh toán (`GET /api/v1/reports/revenue`).
  5. **Xem Lịch trực cá nhân**: Xem ca trực phòng Tài chính - Kế toán.
- **Hành vi bị cấm**:
  - Không được chỉnh sửa số lượng thuốc hay loại cận lâm sàng trong hóa đơn (nếu có sai lệch phải báo bác sĩ hủy/điều chỉnh ca khám).
  - Không được can thiệp vào hồ sơ bệnh án hoặc đơn thuốc.
- **Giao diện làm việc (Frontend)**:
  - `InvoiceModal`: Bàn Thu ngân – Tra cứu hóa đơn theo ca khám, bảng kê chi tiết 3 phần, cổng thanh toán tiền mặt & VietQR động, in hóa đơn VAT viện phí.

---

### 2.7 Role `PATIENT` (Bệnh nhân / Người dùng Cổng Dịch vụ)
- **Mục đích**: Chủ động quản lý thông tin sức khỏe cá nhân, đặt lịch khám trực tuyến, tra cứu tiến trình điều trị và tư vấn sức khỏe qua AI.
- **Phạm vi dữ liệu**: **CHỈ DUY NHẤT dữ liệu cá nhân của chính mình** (`Self-Access Boundary`).
- **Chức năng được phép**:
  1. **Quản lý Tài khoản Cá nhân**: Đăng ký, đăng nhập, đổi mật khẩu, xem và cập nhật hồ sơ cá nhân (CCCD, SĐT, địa chỉ, nhóm máu) (`/api/v1/patients/me`).
  2. **Quản lý Dị ứng Cá nhân**: Tự cập nhật danh sách dị ứng thức ăn/thuốc của mình để bác sĩ nắm bắt khi khám (`GET/POST/DELETE /api/v1/patients/{id}/allergies`).
  3. **Đặt lịch Khám trực tuyến**: Chọn chuyên khoa, chọn bác sĩ mong muốn, tra cứu khung giờ còn trống trong ngày và đặt lịch hẹn khám (`POST /api/v1/appointments`).
  4. **Quản lý Phiếu Khám (My Appointments)**: Xem danh sách lịch hẹn cá nhân; xem **Phiếu Khám Điện Tử** có mã vạch/mã vé; in phiếu khám; chủ động hủy lịch khi bận (`PUT /api/v1/appointments/{id}/cancel`).
  5. **Xem Hồ sơ Sức khỏe Điện tử (EMR Cá nhân)**: Tra cứu lịch sử các lần khám bệnh của mình, xem đơn thuốc bác sĩ đã kê, xem kết quả cận lâm sàng và hóa đơn viện phí của mình.
  6. **AI Chatbot Trợ lý Sức khỏe 24/7**: Chat với AI để mô tả triệu chứng bằng ngôn ngữ tự nhiên, nhận gợi ý chuyên khoa phù hợp, hỗ trợ đặt lịch nhanh, tra cứu BHYT; nhận khuyến cáo khẩn cấp và gọi hotline **115** khi có triệu chứng nguy kịch.
- **Hành vi bị cấm**:
  - Tuyệt đối không được xem bất kỳ thông tin nào của bệnh nhân khác (chặn triệt để tại Backend bằng SpEL `#patientId == principal.patientId`).
  - Không được truy cập các phân hệ chuyên môn (Khám, Dược, Viện phí, Quản trị, Lịch trực nhân viên).
- **Giao diện làm việc (Frontend)**:
  - `PatientPortal`: Giao diện Cổng bệnh nhân – Đặt lịch khám (`BookingModal`), Phiếu khám cá nhân (`MyAppointmentsModal`), Hồ sơ sức khỏe & dị ứng (`PatientProfileModal`), Trợ lý ảo AI (`ChatWidget`).

---

## 3. Ma trận Phân quyền Toàn diện (RBAC Permission Matrix)

### 3.1 Bảng Ma trận 7 Roles x 11 Phân hệ Nghiệp vụ
*Ký hiệu:*
- **C**: Create (Tạo mới)
- **R**: Read (Xem danh sách / chi tiết)
- **U**: Update (Cập nhật / Sửa)
- **D**: Delete (Xóa mềm)
- **X**: Execute (Thao tác chuyên dụng: Khám, Kê đơn, Cấp phát, Thanh toán, Phân tích AI)
- **Self**: Chỉ thao tác trên dữ liệu thuộc sở hữu của chính tài khoản đăng nhập
- **-**: Bị cấm hoàn toàn (403 Forbidden)

| Phân hệ / Nghiệp vụ | ADMIN | RECEPTIONIST | DOCTOR | NURSE | PHARMACIST | ACCOUNTANT | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Quản lý Tài khoản & Phân quyền** | C, R, U, D | - | - | - | - | - | R (Self), U (Self) |
| **2. Hồ sơ Bệnh nhân (Profile)** | C, R, U, D | C, R, U | R | R | - | - | R (Self), U (Self) |
| **3. Tiền sử Dị ứng (Allergies)** | R | - | C, R, U, D | C, R, U | R | - | C (Self), R (Self), D (Self) |
| **4. Đặt & Quản lý Lịch khám** | C, R, U, D | C, R, U, X (Confirm) | R | R | - | - | C (Self), R (Self), U (Cancel) |
| **5. Khởi tạo & Điều phối Ca khám** | C, R | C, R, X (Check-in) | R | R | - | - | R (Self) |
| **6. Khám bệnh, Sinh hiệu, ICD-10** | R | - | C, R, U, X (Khám) | R, U (Sinh hiệu) | - | - | R (Self - ca hoàn tất) |
| **7. Kê đơn Thuốc Điện tử** | R | - | C, R, U, X (Kê đơn) | - | R | - | R (Self) |
| **8. Chỉ định & Kết quả CLS** | R | - | C, R (Chỉ định) | R, U, X (Nhập KQ) | - | - | R (Self) |
| **9. Kho Thuốc & Cấp phát Dược** | C, R, U | - | R (Xem kho) | - | C, R, U, X (Cấp phát) | - | - |
| **10. Viện phí & Hóa đơn** | C, R | - | R (Xem tổng) | - | - | C, R, U, X (Thu phí) | R (Self) |
| **11. Phân ca & Lịch trực Nhân viên** | C, R, U, D | R (Xem lịch) | R (Xem lịch) | R (Xem lịch) | R (Xem lịch) | R (Xem lịch) | - |
| **12. Báo cáo Thống kê & Doanh thu** | R, Export | - | R (Top bệnh) | - | R (Tồn kho) | R (Doanh thu) | - |
| **13. AI Chatbot Tư vấn 24/7** | R (Audit) | R | R | R | R | R | C, R, X (Tất cả bệnh nhân/Guest) |
| **14. AI Cảnh báo Dược & Chẩn đoán** | R (Audit) | - | C, R, X (Khám) | R (Xem cảnh báo) | R (Xem tương tác) | - | - |

---

### 3.2 Đặc tả Chi tiết Phân quyền từng API Endpoint Backend (`@PreAuthorize`)

Dưới đây là thiết kế chuẩn xác các biểu thức `@PreAuthorize` tương ứng cho toàn bộ hệ thống REST API theo chuẩn Spring Security:

#### A. Phân hệ Auth & Quản lý Người dùng
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `permitAll()` | Public cho bệnh nhân đăng ký |
| `POST` | `/api/v1/auth/login` | `permitAll()` | Public |
| `POST` | `/api/v1/auth/refresh-token` | `isAuthenticated()` | Cần refresh token hợp lệ |
| `GET` | `/api/v1/users` | `hasRole('ADMIN')` | Chỉ Admin |
| `POST` | `/api/v1/users` | `hasRole('ADMIN')` | Tạo tài khoản nhân viên |
| `PUT` | `/api/v1/users/{id}/status` | `hasRole('ADMIN')` | Khóa/Mở tài khoản |

#### B. Phân hệ Bệnh nhân & Dị ứng
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `GET` | `/api/v1/patients` | `hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')` | Tìm kiếm danh sách bệnh nhân |
| `POST` | `/api/v1/patients` | `hasAnyRole('RECEPTIONIST', 'ADMIN')` | Tạo hồ sơ bệnh nhân tại quầy |
| `GET` | `/api/v1/patients/{id}` | `hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN') or (hasRole('PATIENT') and @securityService.isCurrentPatient(#id, authentication))` | Self-access cho Patient |
| `PUT` | `/api/v1/patients/{id}` | `hasAnyRole('RECEPTIONIST', 'ADMIN') or (hasRole('PATIENT') and @securityService.isCurrentPatient(#id, authentication))` | Sửa thông tin cá nhân |
| `GET` | `/api/v1/patients/me` | `hasRole('PATIENT')` | Hồ sơ của tài khoản đang đăng nhập |
| `PUT` | `/api/v1/patients/me` | `hasRole('PATIENT')` | Cập nhật hồ sơ bản thân |
| `GET` | `/api/v1/patients/{id}/allergies` | `hasAnyRole('DOCTOR', 'NURSE', 'ADMIN') or (hasRole('PATIENT') and @securityService.isCurrentPatient(#id, authentication))` | Tra cứu dị ứng |
| `POST` | `/api/v1/patients/{id}/allergies` | `hasAnyRole('DOCTOR', 'NURSE') or (hasRole('PATIENT') and @securityService.isCurrentPatient(#id, authentication))` | Thêm dị ứng |
| `DELETE` | `/api/v1/patients/{id}/allergies/{allergyId}` | `hasAnyRole('DOCTOR', 'NURSE') or (hasRole('PATIENT') and @securityService.isCurrentPatient(#id, authentication))` | Xóa dị ứng |

#### C. Phân hệ Lịch khám (Appointments)
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `POST` | `/api/v1/appointments` | `hasAnyRole('PATIENT', 'RECEPTIONIST', 'ADMIN')` | Đặt lịch mới |
| `GET` | `/api/v1/appointments` | `hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')` | Danh sách lịch khám |
| `GET` | `/api/v1/appointments/me` | `hasRole('PATIENT')` | Lịch khám của chính bệnh nhân |
| `PATCH` | `/api/v1/appointments/{id}/cancel` | `hasAnyRole('RECEPTIONIST', 'ADMIN') or (hasRole('PATIENT') and @securityService.isAppointmentOwner(#id, authentication))` | Hủy lịch |
| `PATCH` | `/api/v1/appointments/{id}/confirm` | `hasAnyRole('RECEPTIONIST', 'ADMIN')` | Lễ tân xác nhận lịch |
| `GET` | `/api/v1/appointments/available-slots` | `isAuthenticated()` | Xem khung giờ còn trống |

#### D. Phân hệ Khám bệnh & Cận lâm sàng (Clinical Visits & Lab)
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `POST` | `/api/v1/visits` | `hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')` | Bắt đầu ca khám |
| `GET` | `/api/v1/visits` | `hasAnyRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN')` | Danh sách ca khám |
| `GET` | `/api/v1/visits/{id}` | `hasAnyRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN') or (hasRole('PATIENT') and @securityService.isVisitPatient(#id, authentication))` | Xem ca khám |
| `PUT` | `/api/v1/visits/{id}` | `hasAnyRole('DOCTOR', 'NURSE', 'ADMIN')` | Cập nhật sinh hiệu / ghi chú |
| `PUT` | `/api/v1/visits/{id}/complete` | `hasAnyRole('DOCTOR', 'ADMIN')` | Hoàn tất ca khám |
| `POST` | `/api/v1/visits/{id}/prescriptions` | `hasAnyRole('DOCTOR', 'ADMIN')` | Kê đơn thuốc |
| `GET` | `/api/v1/visits/{id}/prescriptions` | `hasAnyRole('DOCTOR', 'PHARMACIST', 'NURSE', 'ADMIN') or (hasRole('PATIENT') and @securityService.isVisitPatient(#id, authentication))` | Xem đơn thuốc |
| `POST` | `/api/v1/visits/{id}/lab-orders` | `hasAnyRole('DOCTOR', 'ADMIN')` | Chỉ định cận lâm sàng |
| `GET` | `/api/v1/visits/{id}/lab-orders` | `hasAnyRole('DOCTOR', 'NURSE', 'ADMIN') or (hasRole('PATIENT') and @securityService.isVisitPatient(#id, authentication))` | Xem danh sách chỉ định CLS |
| `PUT` | `/api/v1/lab-orders/{id}/result` | `hasAnyRole('NURSE', 'DOCTOR', 'ADMIN')` | Nhập kết quả xét nghiệm |

#### E. Phân hệ Kho Dược & Cấp phát (Pharmacy & Dispense)
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `GET` | `/api/v1/drugs` | `isAuthenticated()` | Danh mục thuốc khả dụng |
| `POST` | `/api/v1/drugs` | `hasAnyRole('PHARMACIST', 'ADMIN')` | Thêm thuốc mới vào kho |
| `PUT` | `/api/v1/drugs/{id}/stock` | `hasAnyRole('PHARMACIST', 'ADMIN')` | Nhập / Xuất kho thuốc |
| `GET` | `/api/v1/drugs/expiring-soon`| `hasAnyRole('PHARMACIST', 'ADMIN')` | Cảnh báo thuốc sắp hết hạn |
| `GET` | `/api/v1/drugs/low-stock` | `hasAnyRole('PHARMACIST', 'ADMIN')` | Cảnh báo thuốc tồn kho thấp |
| `POST` | `/api/v1/prescriptions/{id}/dispense` | `hasAnyRole('PHARMACIST', 'ADMIN')` | Cấp phát thuốc theo đơn |
| `GET` | `/api/v1/prescriptions/{id}/dispense` | `hasAnyRole('PHARMACIST', 'DOCTOR', 'ADMIN') or (hasRole('PATIENT') and @securityService.isPrescriptionPatient(#id, authentication))` | Xem phiếu cấp phát |

#### F. Phân hệ Viện phí & Hóa đơn (Billing & Invoices)
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `POST` | `/api/v1/invoices/generate/{visitId}` | `hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN')` | Sinh hóa đơn từ ca khám |
| `GET` | `/api/v1/invoices/{id}` | `hasAnyRole('ACCOUNTANT', 'ADMIN') or (hasRole('PATIENT') and @securityService.isInvoicePatient(#id, authentication))` | Xem chi tiết hóa đơn |
| `GET` | `/api/v1/invoices/visit/{visitId}` | `hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN') or (hasRole('PATIENT') and @securityService.isVisitPatient(#visitId, authentication))` | Tra cứu hóa đơn ca khám |
| `PUT` | `/api/v1/invoices/{id}/pay` | `hasAnyRole('ACCOUNTANT', 'ADMIN')` | Xác nhận thanh toán (Tiền mặt / VietQR) |
| `GET` | `/api/v1/invoices` | `hasAnyRole('ACCOUNTANT', 'ADMIN')` | Danh sách hóa đơn toàn viện |

#### G. Phân hệ Nhân sự & Lịch trực (HR & Schedules)
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật |
|---|---|---|---|
| `GET` | `/api/v1/staff` | `isAuthenticated()` | Danh bạ nhân viên y tế |
| `POST` | `/api/v1/schedules` | `hasRole('ADMIN')` | Xếp lịch trực mới |
| `POST` | `/api/v1/schedules/batch` | `hasRole('ADMIN')` | Xếp lịch trực hàng loạt theo tuần |
| `GET` | `/api/v1/schedules` | `isAuthenticated()` | Tra cứu lịch trực bệnh viện |
| `DELETE` | `/api/v1/schedules/{id}` | `hasRole('ADMIN')` | Hủy ca trực |

#### H. Phân hệ AI Gateway & Clinical Suggestions
| Method | Endpoint | Biểu thức `@PreAuthorize` | Ghi chú bảo mật & NFR-8 |
|---|---|---|---|
| `POST` | `/api/v1/chat/message` | `permitAll()` | Cho phép Guest & Patient chat |
| `GET` | `/api/v1/chat/sessions/{id}` | `isAuthenticated()` | Xem lịch sử chat |
| `POST` | `/api/v1/ai/clinical/check-interaction` | `hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')` | Cảnh báo tương tác thuốc |
| `POST` | `/api/v1/ai/clinical/check-allergy` | `hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')` | Cảnh báo dị ứng thuốc |
| `POST` | `/api/v1/ai/clinical/suggest-diagnosis` | `hasAnyRole('DOCTOR', 'ADMIN')` | Gợi ý chẩn đoán ICD-10 |
| `GET` | `/api/v1/ai/clinical/suggestions/{visitId}` | `hasAnyRole('DOCTOR', 'ADMIN')` | Xem audit log AI của ca khám |

---

## 4. Kiến trúc Kỹ thuật Triển khai Phân quyền Đa tầng

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      KIẾN TRÚC PHÂN QUYỀN ĐA TẦNG                      │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
 ┌────────────────────────────────────▼───────────────────────────────────┐
 │ TẦNG 1: FRONTEND (REACT 18)                                            │
 │ - AuthContext quản trị `user`, `roles`, helper `hasRole(r)`            │
 │ - Route Guard & View Guard: Chặn điều hướng trực tiếp bằng URL         │
 │ - Menu Navbar thông minh: Chỉ render module tương ứng với quyền        │
 │ - Quick Demo Switcher: Chuyển đổi nhanh 7 vai trò để kiểm thử đồ án   │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP Request + Authorization: Bearer <JWT>
 ┌────────────────────────────────────▼───────────────────────────────────┐
 │ TẦNG 2: BACKEND SECURITY (SPRING BOOT 3)                               │
 │ - SecurityConfig: Session Stateless, CSRF disable, CORS whitelist     │
 │ - JwtAuthFilter: Trích xuất Claims (`userId`, `username`, `roles`)     │
 │ - UserDetailsServiceImpl: Gán danh sách GrantedAuthority (ROLE_*)     │
 │ - Method Security: `@EnableMethodSecurity(prePostEnabled = true)`     │
 │ - SecurityService Evaluator: Thẩm định quyền sở hữu cá nhân (SpEL)    │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
 ┌────────────────────────────────────▼───────────────────────────────────┐
 │ TẦNG 3: DATABASE ACCESS & AUDIT (MYSQL 8)                              │
 │ - Khóa ngoại toàn vẹn dữ liệu: `users` <-> `user_roles` <-> `roles`    │
 │ - Nguyên tắc Soft Delete: `is_deleted = FALSE` trên mọi bảng EMR       │
 │ - Bảng truy vết độc lập: `ai_clinical_suggestions` (Audit Log NFR-8)   │
 └────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Tầng Backend: Cơ chế `SecurityService` cho Self-Access Control
Để thực hiện nguyên tắc bảo mật tối thượng: *"Bệnh nhân chỉ được xem dữ liệu của chính mình, Bác sĩ chỉ xem dữ liệu bệnh nhân mình phụ trách"*, hệ thống triển khai bean Spring `@Component("securityService")`:

```java
@Component("securityService")
@RequiredArgsConstructor
public class SecurityService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final InvoiceRepository invoiceRepository;

    /**
     * Kiểm tra người dùng đăng nhập có phải là chủ sở hữu của hồ sơ bệnh nhân không.
     */
    public boolean isCurrentPatient(Long patientId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        String username = authentication.getName();
        return patientRepository.findById(patientId)
                .map(patient -> patient.getUser() != null && patient.getUser().getUsername().equals(username))
                .orElse(false);
    }

    /**
     * Kiểm tra lịch hẹn có thuộc về bệnh nhân đang đăng nhập không.
     */
    public boolean isAppointmentOwner(Long appointmentId, Authentication authentication) {
        String username = authentication.getName();
        return appointmentRepository.findById(appointmentId)
                .map(apt -> apt.getPatient().getUser() != null && apt.getPatient().getUser().getUsername().equals(username))
                .orElse(false);
    }

    /**
     * Kiểm tra ca khám có thuộc về bệnh nhân đang đăng nhập không.
     */
    public boolean isVisitPatient(Long visitId, Authentication authentication) {
        String username = authentication.getName();
        return visitRepository.findById(visitId)
                .map(v -> v.getPatient().getUser() != null && v.getPatient().getUser().getUsername().equals(username))
                .orElse(false);
    }
}
```

### 4.2 Tầng Frontend: Quản lý Quyền và Điều hướng Giao diện
Trong `AuthContext.jsx`, bổ sung bộ helper functions chuẩn hóa cho cả 7 vai trò:

```javascript
// Trích xuất quyền linh hoạt hỗ trợ cả prefix ROLE_ và không prefix
const roles = user?.roles || [];
const hasRole = (r) => roles.includes(r) || roles.includes(`ROLE_${r}`);

const isAdmin = hasRole('ADMIN');
const isDoctor = hasRole('DOCTOR') || isAdmin;
const isReceptionist = hasRole('RECEPTIONIST') || isAdmin;
const isNurse = hasRole('NURSE') || isAdmin;
const isPharmacist = hasRole('PHARMACIST') || isAdmin;
const isAccountant = hasRole('ACCOUNTANT') || isAdmin;
const isPatient = hasRole('PATIENT');
```

---

## 5. Đánh giá Hiện trạng (Gap Analysis) & Lộ trình Thực hiện

### 5.1 Bảng Đánh giá Trạng thái Hiện tại của Codebase

| Vai trò (Role) | Backend Controller & Service | Flyway Seed DB | Frontend Component UI | Trạng thái tổng thể |
|---|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ Hoàn thành (`UserController`, `ScheduleController`, `@PreAuthorize`) | ✅ Seed `admin` (`V10`) | ✅ `AdminDashboardModal`, `StaffScheduleModal` | **Đầy đủ** |
| **DOCTOR** | ✅ Hoàn thành (`VisitController`, `AiClinicalController`) | ✅ Seed `bacsi` (`V13`) | ✅ `VisitDashboard`, `PrescriptionForm`, `LabOrderPanel` | **Đầy đủ** |
| **PHARMACIST** | ✅ Hoàn thành (`DrugController`, `DispenseController`) | ✅ Seed `duocsi` (`V13`) | ✅ `PharmacyDispenseModal` | **Đầy đủ** |
| **ACCOUNTANT** | ✅ Hoàn thành (`InvoiceController`, VietQR) | ✅ Seed `ketoan` (`V13`) | ✅ `InvoiceModal` | **Đầy đủ** |
| **PATIENT** | ✅ Hoàn thành (`AppointmentController`, `PatientController`) | ✅ Seed `benhnhan` (`V10`) | ✅ `BookingModal`, `MyAppointmentsModal`, `PatientProfileModal` | **Đầy đủ** |
| **RECEPTIONIST** | ⚠️ Đã có API Tiếp nhận & Lịch hẹn, nhưng `@PreAuthorize` chưa chuẩn hóa đồng bộ | ⚠️ Chưa có tài khoản seed chuyên biệt | ❌ **CHƯA CÓ MODAL RIÊNG**: Cần tạo `ReceptionDashboardModal` (Quầy tiếp đón) | **Cần bổ sung** |
| **NURSE** | ⚠️ Đã có API Sinh hiệu & Cận lâm sàng, nhưng `@PreAuthorize` còn thiếu role NURSE ở một số chỗ | ⚠️ Chưa có tài khoản seed chuyên biệt | ❌ **CHƯA CÓ MODAL RIÊNG**: Cần tạo `NurseStationModal` (Trạm điều dưỡng & Lab) | **Cần bổ sung** |

---

### 5.2 Lộ trình Thực hiện Chi tiết (4 Giai đoạn)

#### 🔹 Giai đoạn 1: Chuẩn hóa Backend RBAC & Bảo mật Dữ liệu (Backend Hardening)
1. **Rà soát và Cập nhật `@PreAuthorize`**:
   - Bổ sung `RECEPTIONIST` vào các endpoints tiếp nhận bệnh nhân và check-in ca khám trong `VisitController.java`.
   - Bổ sung `NURSE` vào endpoint nhập sinh hiệu (`PUT /api/v1/visits/{id}`) và nhập kết quả xét nghiệm (`PUT /api/v1/lab-orders/{id}/result`).
2. **Triển khai `SecurityService` (Self-Access Verification)**:
   - Tạo class `com.hospital.hmsai.security.SecurityService` để phục vụ các biểu thức SpEL kiểm tra chủ sở hữu dữ liệu.
   - Gắn biểu thức `@securityService.isCurrentPatient(...)` vào `PatientController.java`, `AppointmentController.java`, `InvoiceController.java`.
3. **Bổ sung Seed Data Flyway (`V15__seed_receptionist_nurse.sql`)**:
   - Thêm tài khoản mẫu:
     + Lễ tân: `letan` / `Receptionist@123` (LT. Hoàng Thùy Linh - Quầy Tiếp đón).
     + Điều dưỡng: `dieuduong` / `Nurse@123` (ĐD. Phạm Thu Hà - Khoa Khám bệnh & Cận lâm sàng).

#### 🔹 Giai đoạn 2: Bổ sung 2 Giao diện Chuyên môn còn thiếu trên Frontend
1. **Tạo `ReceptionDashboardModal.jsx` (Quầy Tiếp đón Lễ tân)**:
   - Tra cứu nhanh hồ sơ bệnh nhân theo CCCD/SĐT.
   - Tiếp nhận bệnh nhân tại quầy & tạo nhanh hồ sơ bệnh nhân mới.
   - Danh sách lịch hẹn hôm nay: 1-click **Xác nhận (Confirm)** và **Khởi tạo ca khám (Check-in)** đẩy thẳng vào hàng đợi bác sĩ.
2. **Tạo `NurseStationModal.jsx` (Trạm Điều dưỡng & Phòng Lab)**:
   - Danh sách bệnh nhân chờ khám: Bảng nhập nhanh các chỉ số sinh hiệu (Huyết áp, Mạch, Thân nhiệt, SpO2, Chiều cao, Cân nặng -> Tự động tính BMI).
   - Danh sách chỉ định cận lâm sàng: Nhập kết quả xét nghiệm (chỉ số, đánh giá bình thường/bất thường, kết luận) và lưu kết quả.

#### 🔹 Giai đoạn 3: Nâng cấp Điều hướng & Bộ chuyển đổi Tài khoản Dùng thử (Demo Switcher)
1. **Nâng cấp `AuthContext.jsx` & `authService.js`**:
   - Nạp đầy đủ 7 tài khoản seed vào `DEFAULT_SEEDS` để chạy offline/online mượt mà.
   - Cung cấp cờ phân quyền: `isAdmin`, `isDoctor`, `isReceptionist`, `isNurse`, `isPharmacist`, `isAccountant`, `isPatient`.
2. **Cập nhật `Navbar.jsx`**:
   - Hiển thị menu nghiệp vụ chính xác theo từng role:
     + Lễ tân -> Nút **"Tiếp đón & Lịch hẹn"** (`ReceptionDashboardModal`).
     + Bác sĩ -> Nút **"Phòng khám Bác sĩ"** (`VisitDashboard`).
     + Điều dưỡng -> Nút **"Trạm Điều dưỡng & Lab"** (`NurseStationModal`).
     + Dược sĩ -> Nút **"Kho Dược & Cấp phát"** (`PharmacyDispenseModal`).
     + Kế toán -> Nút **"Viện phí & Thu ngân"** (`InvoiceModal`).
     + Bệnh nhân -> Nút **"Phiếu khám của tôi"**, **"Hồ sơ sức khỏe"**, **"Đặt lịch khám"**.
     + Quản trị viên -> Hiển thị toàn bộ module để quản lý và kiểm tra.
3. **Cập nhật `AuthModal.jsx`**:
   - Thiết kế thanh **Quick Demo Switcher** trực quan với 7 nút 1-click đăng nhập nhanh tương ứng với 7 roles để phục vụ giảng viên/hội đồng chấm đồ án test tính năng thuận tiện nhất.

#### 🔹 Giai đoạn 4: Kiểm thử Tự động Phân quyền (Automated RBAC Testing)
1. **Backend Integration Tests**:
   - Viết test suite kiểm tra mã lỗi HTTP `403 Forbidden` khi role không phận sự cố tình gọi API nhạy cảm (vd: Bệnh nhân gọi API kê đơn thuốc, Kế toán gọi API nhập kết quả xét nghiệm).
   - Kiểm tra mã lỗi `401 Unauthorized` khi không truyền JWT Bearer token.
   - Kiểm tra tính đúng đắn của Self-Access (Bệnh nhân A không xem được hóa đơn/bệnh án của Bệnh nhân B).
2. **Frontend Component Tests (Vitest)**:
   - Viết test kiểm thử conditional rendering của `Navbar.jsx` theo 7 roles.
   - Viết test cho `ReceptionDashboardModal.jsx` và `NurseStationModal.jsx`.

---

## 6. Kế hoạch Kiểm thử Phân quyền (RBAC Testing & Validation Plan)

### 6.1 Ma trận Ca kiểm thử Bảo mật Phân quyền (Security Test Cases)

| Mã Test | Vai trò thực hiện | Hành động / Endpoint | Kết quả mong đợi | Mục tiêu kiểm định |
|---|---|---|:---:|---|
| **SEC-01** | Khách vãng lai (No Auth) | `GET /api/v1/patients` | `401 Unauthorized` | Ngăn chặn truy cập trái phép không token |
| **SEC-02** | `PATIENT` (Bệnh nhân A) | `GET /api/v1/patients/{idB}` | `403 Forbidden` | Bảo đảm nguyên tắc Self-Access |
| **SEC-03** | `PATIENT` | `POST /api/v1/visits/1/prescriptions` | `403 Forbidden` | Bệnh nhân không được kê đơn |
| **SEC-04** | `RECEPTIONIST` | `POST /api/v1/visits` | `201 Created` | Lễ tân được quyền check-in ca khám |
| **SEC-05** | `RECEPTIONIST` | `PUT /api/v1/visits/1/complete` | `403 Forbidden` | Lễ tân không được kết luận ca khám |
| **SEC-06** | `NURSE` | `PUT /api/v1/lab-orders/1/result` | `200 OK` | Điều dưỡng nhập kết quả CLS thành công |
| **SEC-07** | `NURSE` | `POST /api/v1/invoices/generate/1` | `403 Forbidden` | Điều dưỡng không được lập hóa đơn viện phí |
| **SEC-08** | `DOCTOR` | `POST /api/v1/visits/1/prescriptions` | `201 Created` | Bác sĩ kê đơn thuốc hợp lệ |
| **SEC-09** | `DOCTOR` | `POST /api/v1/prescriptions/1/dispense`| `403 Forbidden` | Bác sĩ không được tự ý xuất kho thuốc |
| **SEC-10** | `PHARMACIST` | `POST /api/v1/prescriptions/1/dispense`| `200 OK` | Dược sĩ cấp phát thuốc và trừ kho tự động |
| **SEC-11** | `ACCOUNTANT` | `PUT /api/v1/invoices/1/pay` | `200 OK` | Kế toán xác nhận thanh toán viện phí |
| **SEC-12** | `ACCOUNTANT` | `POST /api/v1/drugs` | `403 Forbidden` | Kế toán không được can thiệp danh mục thuốc |
| **SEC-13** | `ADMIN` | `POST /api/v1/schedules` | `201 Created` | Quản trị viên xếp lịch trực thành công |

---

## 7. Bảng Tổng hợp Tài khoản Dùng thử (Demo Accounts Specification)

Bảng thông tin 7 tài khoản mẫu chuẩn bị cho quá trình nghiệm thu, bảo vệ và chấm đồ án:

| STT | Vai trò (Role) | Username | Password | Họ và Tên đại diện | Đơn vị / Phòng ban | Chức năng demo chính |
|:---:|---|---|---|---|---|---|
| **1** | `ADMIN` | `admin` | `Admin@123` | TS. Trần Quản Trị | Ban Giám đốc | Quản trị người dùng, xếp lịch trực, xem báo cáo tổng hợp |
| **2** | `RECEPTIONIST`| `letan` | `Receptionist@123`| CN. Hoàng Thùy Linh| Quầy Tiếp đón | Tiếp đón bệnh nhân, tạo hồ sơ, check-in ca khám |
| **3** | `DOCTOR` | `bacsi` | `Doctor@123` | BSCKII. Nguyễn Văn Hùng | Khoa Nội tổng quát | Khám bệnh, AI gợi ý chẩn đoán, kê đơn & AI cảnh báo thuốc |
| **4** | `NURSE` | `dieuduong` | `Nurse@123` | ĐD. Phạm Thu Hà | Khoa Khám & Phòng Lab | Đo sinh hiệu, tính BMI, nhập kết quả cận lâm sàng |
| **5** | `PHARMACIST` | `duocsi` | `Pharmacist@123` | DS. Đỗ Thị Mai | Kho Dược Bệnh viện | Cấp phát thuốc theo đơn, trừ kho, cảnh báo thuốc hết hạn |
| **6** | `ACCOUNTANT` | `ketoan` | `Accountant@123` | KT. Trần Thị Hoa | Phòng Tài chính - Kế toán | Lập hóa đơn 3 phần, thu tiền mặt, tạo mã VietQR động |
| **7** | `PATIENT` | `benhnhan` | `Password@123` | Anh Trần Đức Minh | Khách hàng khám bệnh | Đặt lịch khám, xem phiếu khám điện tử, chat với AI 24/7 |

---

## 8. Kết luận & Cam kết Kỹ thuật
Bản kế hoạch này thiết lập khung chuẩn mực cao nhất về phân quyền truy cập (RBAC) và an toàn dữ liệu y tế cho dự án HMS-AI. Việc thực hiện đầy đủ 7 vai trò sẽ biến hệ thống thành một nền tảng quản lý bệnh viện hoàn chỉnh, chuyên nghiệp và sẵn sàng đạt điểm số tối đa trong học phần Project 1.
