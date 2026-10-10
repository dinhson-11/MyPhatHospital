# Luồng hoạt động của hệ thống Mỹ Phát Hospital (HMS-AI)

> Tài liệu mô tả **cách hệ thống chạy** từ lúc khởi động đến từng nghiệp vụ. Xem thêm [SRS_myPhatHospital.docx](SRS_myPhatHospital.docx) (đặc tả yêu cầu) và [README.md](README.md) (cài đặt).
> Các sơ đồ dùng [Mermaid](https://mermaid.js.org/), hiển thị trực tiếp trên GitHub, VS Code (cài extension Markdown Mermaid) và các trình xem Markdown hỗ trợ Mermaid.

## Mục lục

1. [Tổng quan kiến trúc và dữ liệu đi qua hệ thống](#1-tổng-quan-kiến-trúc)
2. [Khởi động hệ thống](#2-khởi-động-hệ-thống)
3. [Hành trình của một bệnh nhân (end-to-end)](#3-hành-trình-của-một-bệnh-nhân-end-to-end)
4. [Luồng xác thực và phiên đăng nhập](#4-luồng-xác-thực-và-phiên-đăng-nhập)
5. [Luồng đặt lịch khám trực tuyến](#5-luồng-đặt-lịch-khám-trực-tuyến)
6. [Luồng AI Chatbot](#6-luồng-ai-chatbot)
7. [Luồng tiếp đón và check-in](#7-luồng-tiếp-đón-và-check-in)
8. [Luồng khám bệnh, kê đơn, xét nghiệm](#8-luồng-khám-bệnh-kê-đơn-xét-nghiệm)
9. [Luồng cấp phát thuốc](#9-luồng-cấp-phát-thuốc)
10. [Luồng hóa đơn và thanh toán](#10-luồng-hóa-đơn-và-thanh-toán)
11. [Luồng lịch trực nhân viên](#11-luồng-lịch-trực-nhân-viên)
12. [Luồng quản trị người dùng và báo cáo](#12-luồng-quản-trị-người-dùng-và-báo-cáo)
13. [Máy trạng thái của các đối tượng nghiệp vụ](#13-máy-trạng-thái-của-các-đối-tượng-nghiệp-vụ)
14. [Quy tắc giờ làm việc](#14-quy-tắc-giờ-làm-việc)
15. [Phân quyền: ai làm được gì](#15-phân-quyền-ai-làm-được-gì)
16. [Cơ chế dự phòng khi một thành phần lỗi](#16-cơ-chế-dự-phòng-khi-một-thành-phần-lỗi)

---

## 1. Tổng quan kiến trúc

Bốn thành phần chạy bằng Docker Compose (`mysql`, `backend`, `ai-service`, `frontend`):

```mermaid
flowchart LR
    U["Trình duyệt<br/>Khách / Bệnh nhân / Nhân viên"] -->|HTTP| FE["Frontend<br/>React + Vite (Nginx)<br/>cổng 3000"]
    FE -->|"REST /api/v1 + JWT"| BE["Backend<br/>Spring Boot 3.3<br/>cổng 8080"]
    BE -->|JDBC| DB[("MySQL 8.0<br/>Flyway V1–V19")]
    BE -->|"REST /api/v1/ai/*"| AI["AI Service<br/>FastAPI<br/>cổng 8000"]
    AI -. "mô hình ML + luật từ khóa" .-> AI
```

| Thành phần | Vai trò chính |
|---|---|
| **Frontend** | Một trang React, hai chế độ hiển thị: **portal** (cổng công khai) và **workspace** (không gian làm việc nhân viên). Không dùng router; chức năng mở bằng hộp thoại (modal). |
| **Backend** | Toàn bộ nghiệp vụ, xác thực JWT, phân quyền theo vai trò, truy cập cơ sở dữ liệu, gọi AI Service. Mọi phản hồi dạng `{success, data, message}`. |
| **AI Service** | Chatbot, phân loại triệu chứng vào khoa, kiểm tra tương tác thuốc/dị ứng, gợi ý chẩn đoán tham khảo. |
| **MySQL** | Lưu dữ liệu; lược đồ do Flyway quản lý, Hibernate chỉ `validate`. |

**Hai chế độ giao diện** (quyết định trong `App.jsx`):

```mermaid
flowchart TD
    A[Mở website] --> B{"Đã đăng nhập<br/>và là nhân viên?"}
    B -- Không --> P["Portal<br/>giới thiệu, khoa, bác sĩ,<br/>đặt lịch, chatbot"]
    B -- Có --> C{"Bấm nút Workspace?"}
    C -- Không --> P
    C -- Có --> W["Workspace<br/>tiếp đón, ca khám, kho dược,<br/>hóa đơn, lịch trực, báo cáo"]
```

> Lịch trực **chỉ có ở Workspace**, không xuất hiện ở Portal.

---

## 2. Khởi động hệ thống

```mermaid
sequenceDiagram
    autonumber
    participant D as Docker Compose
    participant M as MySQL
    participant B as Backend
    participant A as AI Service
    participant F as Frontend
    participant Br as Trình duyệt

    D->>M: Khởi động, chờ healthcheck
    D->>B: Khởi động khi MySQL healthy
    B->>M: Flyway chạy migration V1..V19 (chỉ phần chưa chạy)
    B->>M: Hibernate validate lược đồ
    D->>A: Khởi động AI Service, nạp mô hình ML
    D->>F: Khởi động Nginx phục vụ frontend
    Br->>F: Mở website
    F->>B: GET /public/doctors (không kèm token)
    B-->>F: Danh sách bác sĩ thật (id = staff_profiles.id)
    F->>F: Đồng bộ id bác sĩ vào nội dung trình bày,<br/>sau đó mới render giao diện (chờ tối đa 3,5 giây)
```

Điểm cần nhớ:

- **Nguồn dữ liệu duy nhất là cơ sở dữ liệu.** Frontend giữ nội dung trình bày (ảnh, mô tả bác sĩ), còn **mã bác sĩ thật** lấy từ API và ghép theo `username` (`bs.maianh`, `bs.nga`, ...).
- Nếu backend chưa sẵn sàng, frontend vẫn mở được nhưng **đặt lịch sẽ báo lỗi kết nối** thay vì tạo vé giả (xem [mục 16](#16-cơ-chế-dự-phòng-khi-một-thành-phần-lỗi)).

---

## 3. Hành trình của một bệnh nhân (end-to-end)

```mermaid
flowchart TD
    S([Bệnh nhân]) --> A["Xem cổng thông tin / hỏi AI Chatbot"]
    A --> B["Đặt lịch khám trực tuyến<br/>(trạng thái BOOKED)"]
    B --> C["Lễ tân xác nhận lịch<br/>(CONFIRMED)"]
    C --> D["Đến bệnh viện: lễ tân check-in<br/>tạo ca khám (IN_PROGRESS)"]
    D --> E["Điều dưỡng đo sinh hiệu"]
    E --> F["Bác sĩ khám, chẩn đoán<br/>(AI gợi ý tham khảo)"]
    F --> G{"Cần xét nghiệm?"}
    G -- Có --> H["Chỉ định (ORDERED) → nhập kết quả (RESULTED)"]
    G -- Không --> I
    H --> I["Bác sĩ kê đơn<br/>(kiểm tra tương tác thuốc/dị ứng)"]
    I --> J["Hoàn tất ca khám (COMPLETED)"]
    J --> K["Dược sĩ cấp phát thuốc<br/>(trừ tồn kho)"]
    K --> L["Kế toán lập hóa đơn<br/>(PENDING) và thu tiền (PAID)"]
    L --> M["Dữ liệu vào báo cáo<br/>KPI, doanh thu, chẩn đoán"]
    M --> Z([Kết thúc])
```

| Bước | Vai trò thực hiện | Mục |
|---|---|---|
| Đặt lịch | Khách / Bệnh nhân | [5](#5-luồng-đặt-lịch-khám-trực-tuyến) |
| Xác nhận lịch, check-in | Lễ tân | [7](#7-luồng-tiếp-đón-và-check-in) |
| Sinh hiệu, khám, kê đơn, xét nghiệm | Điều dưỡng, Bác sĩ | [8](#8-luồng-khám-bệnh-kê-đơn-xét-nghiệm) |
| Cấp phát thuốc | Dược sĩ | [9](#9-luồng-cấp-phát-thuốc) |
| Thanh toán | Kế toán | [10](#10-luồng-hóa-đơn-và-thanh-toán) |

---

## 4. Luồng xác thực và phiên đăng nhập

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant F as Frontend
    participant B as Backend
    participant DB as MySQL

    U->>F: Nhập tên đăng nhập + mật khẩu
    F->>B: POST /auth/login
    B->>DB: Tìm user, so khớp mật khẩu (BCrypt)
    alt Sai thông tin
        B-->>F: 401 / thông báo không chính xác
        F-->>U: Hiển thị lỗi (không có đăng nhập thử offline)
    else Tài khoản bị khóa
        B-->>F: "Tài khoản đã bị khóa"
    else Hợp lệ
        B-->>F: user + accessToken (30 phút) + refreshToken (7 ngày)
        F->>F: Lưu phiên, nạp giao diện theo vai trò
    end

    Note over F,B: Mỗi yêu cầu sau đó kèm Authorization: Bearer token
    F->>B: Gọi API nghiệp vụ
    B->>B: JwtAuthFilter xác thực + kiểm tra vai trò (@PreAuthorize)
    alt Access token hết hạn
        F->>B: POST /auth/refresh-token
        B-->>F: Cặp token mới (nếu refresh token còn hạn và tài khoản không bị khóa)
    end
    U->>F: Đăng xuất / không hoạt động 30 phút
    F->>F: Xóa phiên, về cổng thông tin
```

- **Đăng ký** (`POST /auth/register`): tạo tài khoản vai trò `PATIENT`, mật khẩu ≥ 8 ký tự có chữ hoa, chữ thường, chữ số; tên đăng nhập 3–50 ký tự, không trùng; email không trùng.
- Nhân viên **không tự đăng ký**; tài khoản do Quản trị viên cấp.
- Chế độ đăng nhập offline chỉ dùng được khi **máy chủ không phản hồi** và chạy ở môi trường dev; khi máy chủ trả 401 thì **không** có ngoại lệ.

---

## 5. Luồng đặt lịch khám trực tuyến

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách / Bệnh nhân
    participant F as Frontend (BookingModal)
    participant B as Backend (/public)
    participant DB as MySQL

    K->>F: Bấm "Đặt lịch khám" (từ trang chủ, thẻ bác sĩ, hoặc chatbot)
    F->>F: Tính khung giờ theo mùa của ngày chọn (07:00… hoặc 07:30…)
    K->>F: Nhập họ tên, SĐT, khoa, (bác sĩ), ngày, khung giờ, triệu chứng
    F->>B: POST /public/appointments (không kèm token)
    B->>B: 1) Giờ bắt đầu phải thuộc khung giờ làm việc và ở tương lai
    B->>DB: 2) Khoa tồn tại?
    B->>DB: 3) Bác sĩ là DOCTOR và thuộc khoa đã chọn?<br/>(không chọn bác sĩ → tự phân công bác sĩ của khoa)
    B->>DB: 4) Tìm hồ sơ theo họ tên + SĐT, chưa có thì tạo mã BN-yyMMdd-nnn
    B->>DB: 5) Bác sĩ đã có lịch trùng giờ?
    alt Hợp lệ
        B->>DB: Lưu appointment (BOOKED, nguồn PATIENT)
        B-->>F: 201 + lịch hẹn (mã, bác sĩ, khoa, giờ)
        F-->>K: Phiếu khám điện tử (có thể in)
    else Không hợp lệ / trùng lịch
        B-->>F: Lỗi kèm lý do cụ thể
        F-->>K: Hiển thị lý do, KHÔNG tạo phiếu giả
    end
```

Sau khi đặt: bệnh nhân đã đăng nhập xem và hủy lịch qua `GET /appointments/me` và `PATCH /appointments/{id}/cancel`; nhân viên quản lý lịch ở [mục 7](#7-luồng-tiếp-đón-và-check-in).

---

## 6. Luồng AI Chatbot

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant F as Frontend (ChatWidget)
    participant B as Backend (/chat)
    participant A as AI Service
    participant DB as MySQL

    U->>F: Nhập triệu chứng / câu hỏi
    F->>B: POST /chat/message
    B->>DB: Tạo hoặc dùng phiên chat, lưu tin nhắn người dùng
    B->>A: POST /api/v1/ai/chat/message
    alt AI Service trả lời
        A->>A: Phân loại ý định
        Note over A: Khẩn cấp → cảnh báo gọi 115<br/>FAQ (giờ khám, BHYT, chi phí, đặt lịch) → trả lời có sẵn<br/>Triệu chứng → mô hình ML + luật từ khóa → khoa thật
        A-->>B: reply + khoa gợi ý + cờ nút đặt lịch + lời miễn trừ
    else AI Service lỗi / quá hạn
        B->>B: Dùng bộ luật dự phòng nội bộ (cùng danh mục khoa thật)
    end
    B->>DB: Lưu tin nhắn AI
    B-->>F: Câu trả lời
    F-->>U: Hiển thị + thẻ khoa gợi ý
    U->>F: Bấm "Đặt khám khoa này"
    F->>F: Mở BookingModal với khoa đã chọn
```

- Khoa gợi ý luôn là **khoa thật** của bệnh viện (Khám bệnh/Cấp cứu ban đầu, Ngoại khoa, Sản - Phụ khoa, Tai Mũi Họng, Y học cổ truyền – PHCN, Thẩm mỹ/Tạo hình & Da liễu). Các ca tim mạch, nhi, tiêu hóa, hô hấp, thần kinh quy về **Khoa Khám bệnh / Cấp cứu ban đầu**.
- Kết quả chatbot chỉ mang tính tham khảo, luôn kèm lời miễn trừ trách nhiệm.

---

## 7. Luồng tiếp đón và check-in

```mermaid
flowchart TD
    A([Bệnh nhân đến bệnh viện]) --> B["Lễ tân tìm hồ sơ<br/>(tên / SĐT / mã BN)"]
    B --> C{"Đã có hồ sơ?"}
    C -- Chưa --> D["Tạo hồ sơ mới<br/>POST /patients<br/>sinh mã BN-yyMMdd-nnn"]
    C -- Rồi --> E
    D --> E{"Có lịch hẹn?"}
    E -- Có --> F["Xác nhận lịch<br/>PATCH /appointments/{id}/confirm<br/>BOOKED → CONFIRMED"]
    E -- Không --> G["Lễ tân có thể tạo lịch hộ<br/>POST /appointments (nguồn RECEPTIONIST)"]
    F --> H
    G --> H["Check-in: tạo ca khám<br/>POST /visits (patientId, doctorId, lý do)"]
    H --> I["Ca khám IN_PROGRESS<br/>vào hàng chờ điều dưỡng + bác sĩ"]
```

Lễ tân còn xử lý: hủy lịch, đánh dấu `NO_SHOW`, xem khung giờ trống của bác sĩ (`GET /appointments/available-slots`).

---

## 8. Luồng khám bệnh, kê đơn, xét nghiệm

```mermaid
sequenceDiagram
    autonumber
    actor N as Điều dưỡng
    actor D as Bác sĩ
    participant B as Backend
    participant A as AI Service
    participant DB as MySQL

    N->>B: PUT /visits/{id} (mạch, huyết áp, nhiệt độ, nhịp thở, SpO2, cân nặng, chiều cao)
    B->>DB: Lưu sinh hiệu (từ chối nếu ca đã COMPLETED)
    D->>B: GET /visits/{id} (xem sinh hiệu, dị ứng, lịch sử)
    D->>B: PUT /visits/{id} (lý do, mã + ghi chú chẩn đoán)
    opt Gợi ý chẩn đoán
        D->>B: POST /ai/clinical/visits/{id}/suggest-diagnosis
        B->>A: Gửi triệu chứng, sinh hiệu
        A-->>B: Chẩn đoán tham khảo
        B-->>D: Hiển thị + lưu gợi ý
    end
    opt Xét nghiệm
        D->>B: POST /visits/{id}/lab-orders (loại xét nghiệm)
        B->>DB: Lab order ORDERED
        N->>B: PUT /lab-orders/{id}/result
        B->>DB: Lưu kết quả, RESULTED
    end
    D->>B: POST /visits/{id}/prescriptions (thuốc, liều, số lượng, hướng dẫn)
    B->>A: Kiểm tra tương tác thuốc + dị ứng
    A-->>B: Mức MILD / MODERATE / SEVERE
    B-->>D: Cảnh báo; bác sĩ điều chỉnh đơn nếu cần
    B->>DB: Lưu đơn thuốc
    D->>B: PATCH /visits/{id}/complete
    B->>DB: COMPLETED (khóa chỉnh sửa)
```

- Cảnh báo AI là **tham khảo**, quyết định cuối cùng thuộc bác sĩ. Nếu AI Service không phản hồi, hệ thống dùng dữ liệu tương tác thuốc trong cơ sở dữ liệu.
- Ca khám đã `COMPLETED` **không sửa được nữa**; đây là điều kiện để lập hóa đơn và thống kê chẩn đoán.

---

## 9. Luồng cấp phát thuốc

```mermaid
flowchart TD
    A([Dược sĩ chọn đơn thuốc]) --> B{"Đơn đã cấp phát?"}
    B -- Rồi --> X1["Từ chối: đã cấp phát trước đó"]
    B -- Chưa --> C{"Đơn có danh mục thuốc?"}
    C -- Không --> X2["Từ chối: đơn rỗng"]
    C -- Có --> D["Hiển thị cảnh báo tương tác thuốc (nếu có)"]
    D --> E{"Đủ tồn kho<br/>từng thuốc?"}
    E -- Không --> X3["Từ chối, nêu tên + mã thuốc thiếu"]
    E -- Đủ --> F["Trừ tồn kho<br/>lưu phiếu cấp phát (người cấp, thời gian)"]
    F --> G([Giao thuốc cho bệnh nhân])
```

API: `POST /prescriptions/{id}/dispense`. Quản lý kho: `GET /drugs`, `POST /drugs`, `PUT /drugs/{id}/stock`, cảnh báo `GET /drugs/expiring-soon`, `GET /drugs/low-stock`.

---

## 10. Luồng hóa đơn và thanh toán

> Chi tiết thay đổi và lý do: xem [NANG_CAP_HE_THONG.md](NANG_CAP_HE_THONG.md).

```mermaid
sequenceDiagram
    autonumber
    actor KT as Kế toán / Thu ngân
    participant B as Backend
    participant DB as MySQL
    actor BN as Bệnh nhân

    KT->>B: GET /invoices/uninvoiced-visits (hàng chờ: ca khám COMPLETED chưa có hóa đơn)
    KT->>B: POST /invoices/generate/{visitId}
    B->>DB: Ca khám phải COMPLETED; đã có hóa đơn PENDING/PAID thì trả lại hóa đơn đó
    B->>DB: Tạo hóa đơn PENDING (mã HDyyMMdd######):<br/>SERVICE + DRUG (SL × đơn giá) + LAB (theo bảng giá nhóm)
    B->>B: Áp dụng BHYT → BHYT chi trả + người bệnh cùng chi trả
    B-->>KT: Hóa đơn (tổng chi phí, BHYT, số phải thu)
    KT->>BN: Báo số tiền phải trả, chọn hình thức
    alt Tiền mặt
        KT->>B: PUT /invoices/{id}/pay {CASH, amountReceived}
        B->>B: amountReceived ≥ số phải thu, máy chủ tính tiền thừa
    else VietQR / chuyển khoản / thẻ POS
        KT->>B: GET /invoices/{id}/payment-qr (số tiền + nội dung "MPH <mã HĐ>" do máy chủ sinh)
        BN-->>KT: Chuyển khoản / quẹt thẻ
        KT->>B: PUT /invoices/{id}/pay {method, transactionCode bắt buộc}
        B->>DB: Mã giao dịch không được trùng hóa đơn khác
    end
    B->>DB: PAID + thu ngân + thời điểm (khóa lạc quan chống thu trùng)
    B-->>KT: Phiếu thu (in kèm số tiền bằng chữ)
    opt Sai sót
        KT->>B: PATCH /invoices/{id}/cancel {reason} (chỉ PENDING)
        Note over KT,B: Hoàn tiền PATCH /invoices/{id}/refund {reason} – chỉ ADMIN, chỉ PAID
    end
    KT->>B: GET /invoices/summary?date= (đối soát cuối ca theo phương thức)
```

**BHYT** (thẻ do lễ tân nhập trên hồ sơ bệnh nhân, bệnh nhân không tự khai):

| Điều kiện | Kết quả |
|---|---|
| Không có thẻ / mã thẻ sai định dạng / chưa nhập hạn / thẻ hết hạn vào ngày khám | Người bệnh tự chi trả 100%, ghi lý do trên hóa đơn |
| Khám vào Chủ nhật | Không áp dụng BHYT (bệnh viện khám BHYT Thứ 2 – Thứ 7) |
| Tổng chi phí < 15% lương cơ sở (mặc định 351.000 đ) | BHYT chi trả 100% |
| Còn lại | Theo chữ số thứ 3 của mã thẻ: 1, 2, 5 → 100%; 3 → 95%; 4 → 80% |

Phí khám 150.000 đ (cấu hình `billing.consultation-fee`). Phí cận lâm sàng theo nhóm: huyết học 80.000; sinh hóa 120.000; X-quang 150.000; siêu âm 180.000; CT/MRI 500.000; loại khác 100.000 đồng. Bệnh nhân xem hóa đơn của chính mình qua `GET /invoices/me`; không xem được hóa đơn của người khác (403).

---

## 11. Luồng lịch trực nhân viên

```mermaid
flowchart TD
    subgraph QTV["Quản trị viên"]
        A["Xếp ca: POST /schedules<br/>hoặc hàng loạt /schedules/batch"] --> B{"Nhân viên đã có ca<br/>cùng ngày + cùng ca?"}
        B -- Có --> X["Báo lỗi trùng ca"]
        B -- Không --> C["Lưu ca trực"]
        C --> H["Hủy ca: DELETE /schedules/{id}"]
    end
    subgraph NV["Nhân viên (6 vai trò)"]
        D["Mở Workspace → Lịch trực"] --> E["GET /schedules<br/>lọc theo nhân viên / khoa / tuần"]
    end
    C --> E
    G["Khách / Bệnh nhân"] -. "403, không hiển thị ở cổng công khai" .-> E
```

Ca trực: `MORNING`, `AFTERNOON`, `NIGHT`, `FULL_DAY`. Chỉ **Quản trị viên** xếp/hủy ca; các vai trò nhân viên còn lại chỉ xem.

---

## 12. Luồng quản trị người dùng và báo cáo

**Quản trị người dùng** (`/users`, chỉ ADMIN):

```mermaid
flowchart LR
    A["Danh sách người dùng<br/>GET /users"] --> B["Thêm: POST /users"]
    A --> C["Sửa / gán vai trò: PUT /users/{id}"]
    A --> D["Khóa: PATCH /users/{id}/lock"]
    D --> E["Tài khoản bị khóa:<br/>không đăng nhập, không refresh token"]
    A --> F["Mở khóa: PATCH /users/{id}/unlock"]
```

**Báo cáo** (`/reports`):

| API | Ai xem | Nội dung |
|---|---|---|
| `GET /reports/kpi-summary` | ADMIN | KPI tổng hợp |
| `GET /reports/visits-summary` | ADMIN | Tổng hợp lượt khám |
| `GET /reports/revenue` | ADMIN, ACCOUNTANT | Doanh thu theo khoảng thời gian |
| `GET /reports/top-diagnoses` | ADMIN, DOCTOR | Chẩn đoán phổ biến |

---

## 13. Máy trạng thái của các đối tượng nghiệp vụ

```mermaid
stateDiagram-v2
    direction LR
    state "Lịch hẹn" as AP {
        [*] --> BOOKED: đặt lịch
        BOOKED --> CONFIRMED: lễ tân / bác sĩ xác nhận
        BOOKED --> CANCELLED: hủy
        CONFIRMED --> CANCELLED: hủy
        CONFIRMED --> COMPLETED: bác sĩ hoàn tất
        CONFIRMED --> NO_SHOW: không đến
    }
```

```mermaid
stateDiagram-v2
    direction LR
    state "Ca khám" as V {
        [*] --> IN_PROGRESS: check-in
        IN_PROGRESS --> COMPLETED: bác sĩ hoàn tất (khóa chỉnh sửa)
    }
    state "Xét nghiệm" as L {
        [*] --> ORDERED: bác sĩ chỉ định
        ORDERED --> RESULTED: nhập kết quả
    }
    state "Hóa đơn" as I {
        [*] --> PENDING: lập hóa đơn (ca khám COMPLETED)
        PENDING --> PAID: thu tiền (có mã giao dịch)
        PENDING --> CANCELLED: hủy (bắt buộc lý do)
        PAID --> REFUNDED: hoàn tiền (ADMIN, bắt buộc lý do)
    }
```

---

## 14. Quy tắc giờ làm việc

Nguồn dữ liệu duy nhất: `WorkingHours.java` (backend), `hospitalHours.js` (frontend), `hospital_catalog.py` (AI Service).

| Mục | Quy định |
|---|---|
| Khám bệnh | **Thứ 2 – Chủ nhật** |
| Mùa hè (01/04 – 31/10) | Sáng 07:00 – 11:00, chiều 13:00 – 17:30 |
| Mùa đông (01/11 – 31/03) | Lùi 30 phút: sáng 07:30 – 11:30, chiều 13:30 – 18:00 |
| Khám BHYT | Thứ 2 – Thứ 7 |
| Cấp cứu và điều trị | 24/24, kể cả ngày lễ |
| Khung khám | 30 phút; đặt lịch công khai chỉ nhận giờ bắt đầu đúng khung |

```mermaid
flowchart LR
    A["Chọn ngày khám"] --> B{"Tháng 4 – 10?"}
    B -- Có --> C["Khung mùa hè<br/>07:00…10:30, 13:00…17:00"]
    B -- Không --> D["Khung mùa đông<br/>07:30…11:00, 13:30…17:30"]
    C --> E["Hiển thị trong BookingModal<br/>và kiểm tra lại ở backend"]
    D --> E
```

---

## 15. Phân quyền: ai làm được gì

| Chức năng | Khách | Bệnh nhân | Lễ tân | Điều dưỡng | Bác sĩ | Dược sĩ | Kế toán | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Thông tin công khai, đặt lịch, chatbot | ✔ | ✔ | | | | | | |
| Lịch hẹn của tôi, hồ sơ cá nhân | | ✔ | | | | | | |
| Hồ sơ bệnh nhân | | | ✔ | | tra cứu | | | ✔ |
| Quản lý lịch hẹn | | | ✔ | | ✔ | | | ✔ |
| Check-in, ca khám, sinh hiệu | | | ✔ | ✔ | ✔ | | | ✔ |
| Chẩn đoán, kê đơn, chỉ định xét nghiệm | | | | | ✔ | | | ✔ |
| Nhập kết quả xét nghiệm | | | | ✔ | ✔ | | | ✔ |
| AI hỗ trợ lâm sàng | | | | | ✔ | ✔ | | ✔ |
| Cấp phát thuốc, kho dược | | | | | tra cứu | ✔ | | ✔ |
| Lập hóa đơn, thu tiền | | | | | lập HĐ | | ✔ | ✔ |
| **Lịch trực, danh bạ nhân sự** | | | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Xếp / hủy lịch trực | | | | | | | | ✔ |
| Quản lý người dùng | | | | | | | | ✔ |
| Báo cáo | | | | | chẩn đoán | | doanh thu | ✔ |

Phân quyền được kiểm tra ở **hai lớp**: giao diện ẩn chức năng không thuộc vai trò, và backend chặn bằng `@PreAuthorize` (trả 403).

---

## 16. Cơ chế dự phòng khi một thành phần lỗi

| Tình huống | Hành vi của hệ thống |
|---|---|
| Backend không phản hồi lúc mở trang | Frontend vẫn hiển thị nội dung tĩnh; đặt lịch báo **lỗi kết nối**, không tạo phiếu giả |
| Backend trả lỗi nghiệp vụ khi đặt lịch (trùng lịch, giờ sai, sai khoa) | Hiển thị đúng lý do từ backend |
| Sai mật khẩu (backend trả 401) | Từ chối, không dùng tài khoản mẫu offline |
| Access token hết hạn | Tự gọi `/auth/refresh-token`; refresh hỏng thì yêu cầu đăng nhập lại |
| AI Service lỗi / quá hạn (chatbot) | Backend dùng bộ luật dự phòng nội bộ, vẫn trả lời kèm khoa gợi ý |
| AI Service lỗi (kiểm tra thuốc) | Dùng dữ liệu tương tác thuốc trong cơ sở dữ liệu |
| Mô hình ML không chắc chắn | Chuyển sang luật từ khóa; không khớp thì gợi ý Khoa Khám bệnh / Cấp cứu ban đầu |
| Từ khóa khẩn cấp | Cảnh báo gọi 115 và hotline 0789 065 493 |
| Thuốc không đủ tồn kho | Dừng cấp phát, nêu tên và mã thuốc thiếu |
| Hóa đơn đã thanh toán / đã hủy / đã hoàn tiền | Từ chối thanh toán lại |
| Mất kết nối khi thu tiền | Báo lỗi "CHƯA được lưu", không ghi nhận đã thu ở máy trạm (không còn chế độ thanh toán offline) |
| Hai thu ngân thu cùng một hóa đơn | Người thứ hai nhận lỗi 409, yêu cầu tải lại |
| Chưa cấu hình tài khoản VietQR | Ẩn mã QR, thu bằng tiền mặt / thẻ / chuyển khoản có mã giao dịch |
| Ca khám đã hoàn tất | Từ chối chỉnh sửa |

> **Lưu ý đã biết:** tài khoản bệnh nhân tự đăng ký chưa tự động có hồ sơ bệnh nhân; hồ sơ được tạo khi đặt lịch hoặc khi lễ tân tiếp đón. Vì vậy "Lịch hẹn của tôi" và "Hồ sơ của tôi" chỉ dùng được sau khi tài khoản được liên kết với hồ sơ.
