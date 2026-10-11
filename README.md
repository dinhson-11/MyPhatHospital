<div align="center">

<img src="frontend/public/logo.png" alt="Mỹ Phát Hospital Logo" width="120" />

# 🏥 Mỹ Phát Hospital — Hospital Management System

**Hệ thống Quản lý Bệnh viện tích hợp AI | Spring Boot · React · FastAPI · Docker**

[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> **Địa chỉ:** 1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang  
> **Hotline:** 0789 065 493 &nbsp;|&nbsp; **Email:** myphathospital@gmail.com  
> **Facebook:** [facebook.com/MyPhatHospital](https://www.facebook.com/MyPhatHospital)

</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Tech Stack](#-tech-stack)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
- [Biến môi trường](#-biến-môi-trường)
- [Dùng cơ sở dữ liệu thật](#-dùng-cơ-sở-dữ-liệu-thật)
- [Tài khoản Demo](#-tài-khoản-demo)
- [API Documentation](#-api-documentation)
- [Deploy](#-deploy)
- [Contributing](#-contributing)

---

## 🎯 Tổng quan

**Mỹ Phát Hospital HMS** là hệ thống quản lý bệnh viện toàn diện, được xây dựng theo kiến trúc microservice hiện đại. Hệ thống số hóa toàn bộ quy trình vận hành của phòng khám — từ tiếp đón bệnh nhân, đặt lịch khám, khám bệnh, kê đơn, cấp phát thuốc, đến thanh toán và báo cáo — tích hợp AI hỗ trợ lâm sàng.

### Điểm nổi bật

- 🤖 **AI Chatbot** — Tư vấn triệu chứng, gợi ý khoa khám phù hợp 24/7
- ⚕️ **AI Cảnh báo lâm sàng** — Phát hiện tương tác thuốc nguy hiểm, gợi ý chẩn đoán tham khảo
- 🔐 **Phân quyền 6 vai trò** (Quản trị, Bác sĩ, Điều dưỡng, Dược sĩ, Lễ tân - Kế toán, Bệnh nhân) — RBAC chi tiết, mỗi nhân viên chỉ thấy đúng chức năng của mình
- 🏥 **Lịch trực bác sĩ** — Xếp lịch, theo dõi ca trực theo tuần/tháng
- 💊 **Quản lý kho dược** — Cấp phát, cảnh báo hết hạn, tồn kho theo thời gian thực
- 💳 **Hóa đơn 3 phần** — Tích hợp BHYT, thanh toán tiền mặt & VietQR động
- 📊 **Dashboard báo cáo** — KPI, doanh thu, top chẩn đoán theo ngày/tháng/quý

---

## ✨ Tính năng

| Module | Mô tả |
|--------|-------|
| **🔑 Authentication** | Đăng nhập JWT, refresh token, access token 30 phút, tự động logout sau 15 phút không thao tác |
| **👥 Lễ tân - Kế toán** | Tiếp đón, tạo hồ sơ bệnh nhân, check-in ca khám; lập hóa đơn, BHYT, thu viện phí (tiền mặt, VietQR, chuyển khoản, thẻ), đối soát ca và xem doanh thu |
| **🩺 Khám bệnh** | Ghi kết quả khám, kê đơn thuốc, cận lâm sàng, AI gợi ý chẩn đoán |
| **💉 Điều dưỡng** | Đo sinh hiệu, tính BMI, nhập kết quả xét nghiệm |
| **💊 Dược** | Kho thuốc, cấp phát theo đơn, cảnh báo tương tác AI |
| **📅 Đặt lịch** | Bệnh nhân tự đặt lịch online, chọn bác sĩ theo khoa |
| **👨‍⚕️ Lịch trực** | Admin xếp lịch ca trực, bác sĩ xem lịch của mình |
| **🛡️ Quản trị tài khoản** | Admin tạo, sửa, khóa/mở khóa tài khoản và gán vai trò ngay trên giao diện (tab "Tài khoản" của Bảng điều khiển quản trị) |
| **📈 Báo cáo** | Thống kê doanh thu, lượt khám, hiệu suất bác sĩ |
| **🤖 AI Service** | Chatbot NLP, drug interaction checker, diagnosis suggestion |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   Browser  ──►  React 19 + Vite (port 3000 / 80)       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND LAYER                          │
│   Spring Boot 3.3  ──  Spring Security + JWT            │
│   REST API  /api/v1/*           (port 8080)             │
│                                                         │
│   Modules: auth · patient · appointment · clinical      │
│            pharmacy · billing · hr · reporting · ai     │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
                ▼                     ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│    MySQL 8.0          │   │   AI Service (FastAPI)       │
│    Flyway Migrations  │   │   port 8000                 │
│    (V1 – V23)           │   │   · Chatbot (rule-based NLP) │
└───────────────────────┘   │   · Drug interaction checker │
                            │   · Diagnosis suggestion     │
                            │   · ML Triage model          │
                            └─────────────────────────────┘
```

**Triển khai**: Docker Compose — `backend` · `ai-service` · `frontend` và `mysql` (tùy chọn). Có thể bỏ container `mysql` để nối backend vào **MySQL thật** (xem [Dùng cơ sở dữ liệu thật](#-dùng-cơ-sở-dữ-liệu-thật)).

---

## 🛠️ Tech Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| **Frontend** | React, Vite, Tailwind CSS (build-time, chạy offline), Axios | React 19 |
| **Backend** | Spring Boot, Spring Security, Spring Data JPA | 3.3.x |
| **Authentication** | JWT (jjwt), BCrypt | — |
| **AI Service** | FastAPI, scikit-learn, SQLAlchemy | Python 3.11 |
| **Database** | MySQL, Flyway Migrations | 8.0 |
| **API Docs** | Swagger UI (springdoc-openapi) | 2.x |
| **Container** | Docker, Docker Compose | — |
| **Proxy** | Nginx (production) | Alpine |

---

## 📁 Cấu trúc dự án

```
thanhSonHospital/
│
├── backend/                          # Spring Boot REST API
│   ├── src/main/java/com/hospital/hmsai/
│   │   ├── auth/                     # JWT login, token refresh
│   │   ├── patient/                  # Hồ sơ bệnh nhân
│   │   ├── appointment/              # Đặt lịch khám
│   │   ├── clinical/                 # Khám bệnh, kê đơn
│   │   ├── pharmacy/                 # Kho dược, cấp phát
│   │   ├── billing/                  # Hóa đơn, thanh toán
│   │   ├── hr/                       # Nhân sự, lịch trực
│   │   ├── reporting/                # Báo cáo thống kê
│   │   └── ai/                       # Gateway gọi AI Service
│   ├── src/main/resources/
│   │   ├── db/migration/             # Flyway SQL (V1 – V23)
│   │   ├── application.yml           # Config chung
│   │   ├── application-dev.yml       # Config môi trường dev
│   │   └── application-prod.yml      # Config môi trường prod (đọc MYSQL_* từ biến môi trường)
│   └── Dockerfile
│
├── ai-service/                       # Python FastAPI AI Service
│   ├── routers/                      # Endpoints: chat, diagnosis, drug
│   ├── services/                     # Business logic AI
│   ├── models/                       # ML models (not committed)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                         # React + Vite SPA
│   ├── public/                       # Static assets, ảnh bệnh viện
│   ├── src/
│   │   ├── components/               # UI components theo module
│   │   │   ├── home/                 # Landing page sections
│   │   │   ├── layout/               # Navbar, Footer
│   │   │   ├── modals/               # Booking, Auth, Profile...
│   │   │   ├── clinical/             # Khám bệnh workspace
│   │   │   ├── billing/              # Hóa đơn
│   │   │   ├── pharmacy/             # Dược
│   │   │   ├── hr/                   # Lịch trực
│   │   │   └── reporting/            # Dashboard báo cáo
│   │   ├── services/                 # API clients (axios)
│   │   ├── context/                  # Auth, Toast context
│   │   └── tests/                    # Vitest unit tests
│   ├── nginx.conf                    # Nginx config for Docker
│   └── Dockerfile
│
├── docker-compose.yml                # Orchestration (mysql đóng gói là tùy chọn: profile local-db)
├── scripts/db/                       # SQL tạo DB thật + khóa tài khoản mẫu
├── docs/
│   ├── reports/                      # Tài liệu .docx (SRS, use case, thiết kế CSDL, kiến trúc & API, kiểm thử...)
│   ├── database/                     # schema.sql, seed.sql (bản tham chiếu; Flyway mới là nguồn chính)
│   ├── assets/                       # Hình ảnh phục vụ tài liệu
│   └── LUONG_HOAT_DONG.md            # Luồng hoạt động nghiệp vụ
├── .env.example                      # ✅ Template biến môi trường (safe to commit)
├── .env                              # ❌ Secrets thật (git-ignored)
├── .gitignore
├── .gitattributes
├── DEPLOYMENT.md                     # Hướng dẫn deploy chi tiết
└── README.md
```

---

## 🚀 Bắt đầu nhanh

### Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24.x
- [Git](https://git-scm.com/)

### Chạy với Docker Compose (Khuyến nghị)

```bash
# 1. Clone repository
git clone https://github.com/<your-org>/thanhSonHospital.git
cd thanhSonHospital

# 2. Tạo file .env từ template
cp .env.example .env

# 3. Tạo JWT_SECRET mạnh (bắt buộc)
# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
# Linux / Mac:
# openssl rand -base64 32

# Điền JWT_SECRET và MYSQL_PASSWORD vào file .env
# (mặc định .env.example dùng MySQL đóng gói sẵn: COMPOSE_PROFILES=local-db.
#  Muốn dùng MySQL thật: xem mục "Dùng cơ sở dữ liệu thật" bên dưới)

# 4. Build & khởi động toàn bộ services
docker compose up -d --build

# 5. Kiểm tra trạng thái
docker compose ps
```

Sau khoảng 60 giây (backend khởi động + Flyway chạy migration):

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8080 |
| 📖 Swagger UI | http://localhost:8080/swagger-ui.html |
| 🤖 AI Service | http://localhost:8000/docs |

### Chạy riêng từng service (Development)

<details>
<summary><b>Backend (Spring Boot)</b></summary>

```bash
cd backend

# Cần MySQL đang chạy: MySQL cài trên máy (mặc định localhost:3306) hoặc chỉ MySQL của Docker
docker compose up -d mysql          # cổng máy chủ = MYSQL_HOST_PORT (mặc định 3308)

# Chạy dev mode (đổi MYSQL_HOST / MYSQL_PORT / MYSQL_DB cho khớp DB bạn dùng)
MYSQL_PORT=3308 MYSQL_USER=hmsai_user MYSQL_PASSWORD=<mật khẩu> JWT_SECRET=<your-secret> \
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Windows PowerShell: dùng .\mvnw.cmd thay cho ./mvnw (biến môi trường đặt bằng $env:MYSQL_PORT="3308" ...)
```
</details>

<details>
<summary><b>Frontend (React + Vite)</b></summary>

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```
</details>

<details>
<summary><b>AI Service (FastAPI)</b></summary>

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
</details>

---

## ⚙️ Biến môi trường

Copy `.env.example` → `.env` và cấu hình:

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `COMPOSE_PROFILES` | `local-db` = chạy MySQL đóng gói sẵn trong Docker. **Bỏ trống/xóa** khi dùng DB thật | `local-db` |
| `MYSQL_ROOT_PASSWORD` | Mật khẩu root của MySQL đóng gói (chỉ khi `local-db`) | `StrongRoot@2024!` |
| `MYSQL_HOST_PORT` | Cổng máy chủ mở cho MySQL đóng gói (chỉ khi `local-db`) | `3308` |
| `MYSQL_HOST` | Máy chủ MySQL **thật** (mặc định `mysql` = container đóng gói) | `host.docker.internal` |
| `MYSQL_PORT` | Cổng MySQL thật | `3306` |
| `MYSQL_DB` | Tên database | `hmsai_db` |
| `MYSQL_USER` | Tài khoản ứng dụng (không dùng root) | `hmsai_user` |
| `MYSQL_PASSWORD` | Mật khẩu tài khoản ứng dụng | `StrongDb@2024!` |
| `MYSQL_SSL_MODE` | `DISABLED` / `PREFERRED` (mặc định) / `REQUIRED` / `VERIFY_CA` | `REQUIRED` |
| `JWT_SECRET` | **Bắt buộc** — khóa ký JWT 256-bit | `openssl rand -base64 32` |
| `AI_SERVICE_URL` | URL của AI Service | `http://ai-service:8000` |
| `LLM_API_KEY` | API key LLM bên ngoài (tuỳ chọn) | `sk-...` |
| `VITE_API_BASE_URL` | URL backend mà trình duyệt gọi; nhúng LÚC BUILD frontend (đổi giá trị → `docker compose up -d --build frontend`) | `http://localhost:8080/api/v1` |
| `VITE_SHOW_DEMO_ACCOUNTS` | `true` = hiện khối "Tài khoản thử nghiệm" (tên đăng nhập + mật khẩu, bấm để điền sẵn) trên form đăng nhập. Biến này được nhúng LÚC BUILD frontend. Đặt `false` khi dùng DB thật | `true` |
| `CORS_ALLOWED_ORIGINS` | Origin của giao diện web được phép gọi API (CORS), phân tách bằng dấu phẩy. Đổi khi dùng tên miền/cổng khác | `https://benhvien.example.com` |
| `SWAGGER_ENABLED` | `false` = tắt Swagger UI và `/v3/api-docs` công khai (nên tắt khi dùng DB thật) | `true` |
| `VIETQR_BANK_BIN`, `VIETQR_BANK_NAME`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` | Tài khoản nhận tiền VietQR (BIN theo NAPAS: Vietcombank `970436`, MB `970422`…; tên chủ tài khoản VIẾT HOA KHÔNG DẤU). Để trống = tắt mã QR. Lấy BIN + số tài khoản bằng cách giải mã mã QR của ứng dụng ngân hàng | `970436`, `Vietcombank`, `0123456789`, `NGUYEN VAN A` |
| `VIETQR_DEMO` | `true` = hiện cảnh báo "tài khoản DEMO, không chuyển tiền thật" (chỉ dùng với tài khoản giả); `false` khi dùng tài khoản thật | `false` |
| `FRONTEND_PORT` | Port expose frontend | `3000` |
| `BACKEND_PORT` | Port expose backend | `8080` |

> ⚠️ **Không bao giờ commit file `.env` thật lên git.** File này đã được `.gitignore` chặn.

---

## 🗄️ Dùng cơ sở dữ liệu thật

Mặc định, `.env.example` chạy MySQL đóng gói trong Docker (dữ liệu nằm trong volume `myphathospital_mysql_data`). Để dùng **MySQL thật** (máy chủ riêng, cloud hoặc MySQL cài sẵn trên máy):

1. **Tạo database và tài khoản** (một lần, bằng tài khoản root của MySQL thật): sửa mật khẩu trong [`scripts/db/01_create_database.sql`](scripts/db/01_create_database.sql) rồi chạy
   ```bash
   mysql -u root -p < scripts/db/01_create_database.sql
   ```
   Script tạo `hmsai_db` (utf8mb4) và tài khoản `hmsai_user` cho cả host `%` lẫn `localhost`. Backend chạy trong Docker kết nối từ địa chỉ mạng Docker, **không** phải `localhost`, nên tài khoản chỉ có host `localhost` sẽ bị từ chối.
2. **Sửa `.env`**: xóa (hoặc chú thích) dòng `COMPOSE_PROFILES=local-db`, rồi đặt
   ```dotenv
   MYSQL_HOST=host.docker.internal   # MySQL cài trên chính máy này; máy khác/cloud: tên miền hoặc IP
   MYSQL_PORT=3306
   MYSQL_DB=hmsai_db
   MYSQL_USER=hmsai_user
   MYSQL_PASSWORD=<mật khẩu đã dùng ở bước 1>
   MYSQL_SSL_MODE=REQUIRED           # DB cloud/production
   ```
3. **Khởi động**: `docker compose up -d --build`. Container `mysql` không chạy; backend nối thẳng vào máy chủ đã chỉ định và Flyway tự tạo/nâng cấp schema (V1 → V23).
4. **Trước khi dùng thật**: các migration tạo sẵn tài khoản mẫu có mật khẩu công khai (bảng bên dưới). Đăng nhập bằng tài khoản quản trị thật rồi chạy [`scripts/db/02_lock_demo_accounts.sql`](scripts/db/02_lock_demo_accounts.sql) để đổi mật khẩu `admin` và khóa các tài khoản mẫu.

> ⚠️ Flyway chỉ nên trỏ vào database **trống** hoặc database đã do Flyway quản lý (có bảng `flyway_schema_history`). Không trỏ vào database có sẵn bảng của hệ thống khác. **Sao lưu** (`mysqldump`) trước mỗi lần nâng cấp phiên bản.
>
> ⚠️ **V19 xóa** các tài khoản mẫu cũ `bacsi` và `duocsi` cùng lịch trực của chúng. Nếu CSDL thật còn dữ liệu (lịch hẹn, ca khám) gắn với hai tài khoản này, hãy **sao lưu và kiểm tra trước** khi nâng cấp từ phiên bản trước V19.
>
> Nếu DB thật đã chạy bản V20 cũ trước khi file này được sửa, Flyway báo `checksum mismatch` ở V20. Chạy `flyway repair` (hoặc cập nhật `checksum` của version 20 trong `flyway_schema_history`) rồi khởi động lại.

---

## 👤 Tài khoản Demo

> Chỉ dùng cho môi trường dev/demo. **Không** để các tài khoản này hoạt động trên CSDL thật (xem mục trên).
>
> Các tài khoản này được hiển thị ngay trên **form đăng nhập** (khối "Tài khoản thử nghiệm", bấm để điền sẵn) khi `VITE_SHOW_DEMO_ACCOUNTS=true` hoặc khi chạy `npm run dev`. Sau khi đổi biến này cần build lại: `docker compose up -d --build frontend`. Mặc định (biến không đặt) khối này bị loại khỏi bản build.

Hệ thống có **6 vai trò**. Vai trò **Lễ tân - Kế toán** (mã `RECEPTIONIST`) gộp hai vai trò cũ Lễ tân và Kế toán: một người vừa tiếp đón, đặt lịch, vừa lập hóa đơn và thu viện phí.

| # | Username | Password | Vai trò | Chức năng |
|:-:|----------|----------|---------|-----------|
| 1 | `admin` | `Admin@123` | **ADMIN** | Quản trị hệ thống, xếp lịch trực, báo cáo tổng thể, hoàn tiền hóa đơn |
| 2 | `letan` | `Receptionist@123` | **RECEPTIONIST** (Lễ tân - Kế toán) | Tiếp đón, tạo hồ sơ, check-in; lập hóa đơn, thu tiền, VietQR, BHYT, đối soát ca, báo cáo doanh thu |
| 3 | `bs.maianh` (và `bs.nga`, `bs.vy`, `bs.dung`, `bs.sy`, `bs.hiep`, `bs.an`, `bs.toan`) | `Doctor@123` | **DOCTOR** | Khám bệnh, kê đơn, AI chẩn đoán & cảnh báo thuốc |
| 4 | `dieuduong` | `Nurse@123` | **NURSE** | Đo sinh hiệu, tính BMI, nhập cận lâm sàng |
| 5 | `ds.quang` | `Pharmacist@123` | **PHARMACIST** | Kho dược, cấp phát, cảnh báo hết hạn |
| 6 | `benhnhan` | `Password@123` | **PATIENT** | Đặt lịch, xem lịch sử khám và hóa đơn, AI chatbot |

> Tài khoản `ketoan` (Kế toán cũ) nếu còn trong CSDL đã được migration **V22** chuyển sang vai trò Lễ tân - Kế toán; đăng nhập bằng `ketoan / Accountant@123` vẫn dùng được với quyền của vai trò này.

### Ma trận quyền chính

| Chức năng | Admin | Bác sĩ | Điều dưỡng | Dược sĩ | Lễ tân - Kế toán | Bệnh nhân |
|-----------|:-----:|:------:|:----------:|:-------:|:----------------:|:---------:|
| Tạo/sửa hồ sơ bệnh nhân | ✔ | – | – | – | ✔ | chỉ hồ sơ của mình |
| Đặt lịch, hủy lịch | ✔ | – | – | – | ✔ | lịch của mình |
| Xác nhận lịch hẹn | ✔ | ✔ | – | – | ✔ | – |
| Mở ca khám, xem danh sách ca khám | ✔ | ✔ | ✔ | – | ✔ | – |
| Khám bệnh, kê đơn, chỉ định xét nghiệm | ✔ | ✔ (ca của mình) | – | – | – | – |
| Ghi sinh hiệu, nhập kết quả xét nghiệm | ✔ | ✔ | ✔ | – | – | – |
| Cấp phát thuốc, quản lý kho | ✔ | – | – | ✔ | – | – |
| Lập hóa đơn | ✔ | ✔ | – | – | ✔ | – |
| Thu tiền, hủy hóa đơn, mã QR, đối soát ca | ✔ | – | – | – | ✔ | – |
| Xem hóa đơn | ✔ | ✔ | – | – | ✔ | hóa đơn của mình |
| Hoàn tiền hóa đơn đã thu | ✔ | – | – | – | – | – |
| Báo cáo doanh thu | ✔ | – | – | – | ✔ | – |
| KPI, lượt khám | ✔ | – | – | – | – | – |
| Top chẩn đoán | ✔ | ✔ | – | – | – | – |
| Quản lý tài khoản, xếp lịch trực | ✔ | – | – | – | – | – |
| Xem lịch trực | ✔ | ✔ | ✔ | ✔ | ✔ | – |

---

## 📖 API Documentation

Backend tự động sinh tài liệu API qua **Swagger UI**:

- **Swagger UI**: [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON**: [`http://localhost:8080/v3/api-docs`](http://localhost:8080/v3/api-docs)
- **AI Service Docs**: [`http://localhost:8000/docs`](http://localhost:8000/docs)

### Xác thực API

```bash
# 1. Lấy JWT token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# 2. Gọi API với token
curl http://localhost:8080/api/v1/patients \
  -H "Authorization: Bearer <token>"
```

---

## 🌐 Deploy

Xem hướng dẫn chi tiết deploy lên các nền tảng miễn phí trong [**DEPLOYMENT.md**](DEPLOYMENT.md):

| Nền tảng | Phù hợp | Ghi chú |
|----------|---------|---------|
| [Railway.app](https://railway.app) | ⭐ Khuyến nghị | Docker Compose, MySQL built-in, free tier |
| [Render.com](https://render.com) | Dễ dùng | Free tier spin-down sau 15 phút idle |
| [Fly.io](https://fly.io) | Linh hoạt | 3 VMs miễn phí, Docker native |
| Oracle Cloud Free Tier | Production | 2 VMs vĩnh viễn, ổn định nhất |

---

## 🧪 Tests

```bash
# Frontend — Vitest
cd frontend
npm run test

# Backend — JUnit 5 + Mockito
cd backend
./mvnw test        # Windows: .\mvnw.cmd test

# AI Service — Pytest
cd ai-service
pytest
```

---

## 🗄️ Database Migrations

Schema được quản lý bằng **Flyway**. Các migration file nằm tại `backend/src/main/resources/db/migration/`:

| Version | Nội dung |
|---------|----------|
| V1 – V9 | Schema: users/roles, khoa & nhân viên, bệnh nhân, lịch hẹn, ca khám & đơn thuốc, cận lâm sàng, kho thuốc, viện phí, bảng AI |
| V10 – V12 | Dữ liệu mẫu, ghi chú triệu chứng lịch hẹn, tương tác thuốc |
| V13 | Lịch trực nhân viên (staff_schedules) |
| V14 | Nhóm máu bệnh nhân |
| V15 – V19 | Dữ liệu tiếp đón/điều dưỡng, đồng bộ bác sĩ & lịch trực, dọn khoa/nhân viên trùng |
| V20 | Nâng cấp viện phí: BHYT, mã hóa đơn, thanh toán, hủy/hoàn tiền, ràng buộc 1 hóa đơn hiệu lực/ca khám |
| V21 | Ràng buộc an toàn y khoa: lý do kê đơn, 1 lần cấp phát/đơn, tồn kho không âm, 1 ca khám/lịch hẹn |
| V22 | Gộp vai trò Kế toán (`ACCOUNTANT`) vào Lễ tân (`RECEPTIONIST`, tên hiển thị "Lễ tân - Kế toán"); tài khoản Kế toán cũ được chuyển vai trò |
| V23 | Khôi phục tài khoản mẫu `bs.maianh` (Bác sĩ) và `ds.quang` (Dược sĩ): V16 không tạo được hai tài khoản này do trùng email, sau đó V19 xóa tài khoản cũ nên CSDL mới không có Dược sĩ nào |

> V20/V21 có bước **dọn dữ liệu trùng** trước khi thêm ràng buộc. Sao lưu CSDL trước khi nâng cấp; đã có test chạy trên MySQL 8 thật
> (`MySqlMigrationConstraintsTest`, cần Docker).

---

## 🤝 Contributing

1. Fork repository
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: mô tả thay đổi"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Mở Pull Request

**Commit convention**: [Conventional Commits](https://www.conventionalcommits.org/)
```
feat:     Tính năng mới
fix:      Sửa lỗi
chore:    Cấu hình, dependencies
docs:     Tài liệu
refactor: Refactor code
test:     Tests
```

---

## 📞 Liên hệ & Hỗ trợ

| | |
|-|-|
| 🏥 **Bệnh viện** | Mỹ Phát Hospital |
| 📍 **Địa chỉ** | 1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang |
| 📞 **Hotline** | 0789 065 493 |
| 📧 **Email** | myphathospital@gmail.com |
| 📘 **Facebook** | [facebook.com/MyPhatHospital](https://www.facebook.com/MyPhatHospital) |

---

<div align="center">

Made with ❤️ for **Mỹ Phát Hospital** · 2024–2026

</div>
