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
> **Hotline:** 0789 065 493 &nbsp;|&nbsp; **Email:** <myphathospital@gmail.com>  
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
- 🔐 **Phân quyền 7 vai trò** — RBAC chi tiết, mỗi nhân viên chỉ thấy đúng chức năng của mình
- 🏥 **Lịch trực bác sĩ** — Xếp lịch, theo dõi ca trực theo tuần/tháng
- 💊 **Quản lý kho dược** — Cấp phát, cảnh báo hết hạn, tồn kho theo thời gian thực
- 💳 **Hóa đơn 3 phần** — Tích hợp BHYT, thanh toán tiền mặt & VietQR động
- 📊 **Dashboard báo cáo** — KPI, doanh thu, top chẩn đoán theo ngày/tháng/quý

---

## ✨ Tính năng

| Module | Mô tả |
| -------- | ------- |
| **🔑 Authentication** | Đăng nhập JWT, refresh token, tự động logout sau 30 phút |
| **👥 Lễ tân** | Tiếp đón, tạo hồ sơ bệnh nhân, check-in ca khám |
| **🩺 Khám bệnh** | Ghi kết quả khám, kê đơn thuốc, cận lâm sàng, AI gợi ý chẩn đoán |
| **💉 Điều dưỡng** | Đo sinh hiệu, tính BMI, nhập kết quả xét nghiệm |
| **💊 Dược** | Kho thuốc, cấp phát theo đơn, cảnh báo tương tác AI |
| **💰 Kế toán** | Lập hóa đơn, BHYT, thu tiền mặt, tạo QR thanh toán |
| **📅 Đặt lịch** | Bệnh nhân tự đặt lịch online, chọn bác sĩ theo khoa |
| **👨‍⚕️ Lịch trực** | Admin xếp lịch ca trực, bác sĩ xem lịch của mình |
| **📈 Báo cáo** | Thống kê doanh thu, lượt khám, hiệu suất bác sĩ |
| **🤖 AI Service** | Chatbot NLP, drug interaction checker, diagnosis suggestion |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   Browser  ──►  React 18 + Vite (port 3000 / 80)       │
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
│    (V1 – V17)         │   │   · Chatbot (rule-based NLP) │
└───────────────────────┘   │   · Drug interaction checker │
                            │   · Diagnosis suggestion     │
                            │   · ML Triage model          │
                            └─────────────────────────────┘
```

**Triển khai**: Docker Compose (4 containers) — `mysql` · `backend` · `ai-service` · `frontend`

---

## 🛠️ Tech Stack

| Layer | Công nghệ | Version |
| ------- | ----------- | --------- |
| **Frontend** | React, Vite, Axios, CSS Modules | React 18 |
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
│   │   ├── db/migration/             # Flyway SQL (V1 – V17)
│   │   ├── application.yml           # Config chung
│   │   ├── application-dev.yml       # Config môi trường dev
│   │   └── application-prod.yml      # Config môi trường prod (git-ignored)
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
├── docker-compose.yml                # Orchestration toàn bộ services
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

# 4. Build & khởi động toàn bộ services
docker-compose up -d --build

# 5. Kiểm tra trạng thái
docker-compose ps
```

Sau khoảng 60 giây (backend khởi động + Flyway chạy migration):

| Service | URL |
| --------- | ----- |
| 🌐 Frontend | <http://localhost:3000> |
| ⚙️ Backend API | <http://localhost:8080> |
| 📖 Swagger UI | <http://localhost:8080/swagger-ui.html> |
| 🤖 AI Service | <http://localhost:8000/docs> |

### Chạy riêng từng service (Development)

<details>
<summary><b>Backend (Spring Boot)</b></summary>

```bash
cd backend

# Cần MySQL đang chạy (hoặc chạy chỉ MySQL bằng Docker)
docker-compose up -d mysql

# Chạy dev mode
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev \
  -DMYSQL_USER=root \
  -DMYSQL_PASSWORD=root \
  -DJWT_SECRET=<your-secret>
```

</details>

<details>
<summary><b>Frontend (React + Vite)</b></summary>

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
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
| ------ | ------- | ------- |
| `MYSQL_ROOT_PASSWORD` | Mật khẩu root MySQL | `StrongRoot@2024!` |
| `MYSQL_USER` | Database user | `hmsai_user` |
| `MYSQL_PASSWORD` | Mật khẩu database | `StrongDb@2024!` |
| `JWT_SECRET` | **Bắt buộc** — khóa ký JWT 256-bit | `openssl rand -base64 32` |
| `AI_SERVICE_URL` | URL của AI Service | `http://ai-service:8000` |
| `LLM_API_KEY` | API key LLM bên ngoài (tuỳ chọn) | `sk-...` |
| `VITE_API_BASE_URL` | URL backend cho frontend | `http://localhost:8080/api/v1` |
| `FRONTEND_PORT` | Port expose frontend | `3000` |

> ⚠️ **Không bao giờ commit file `.env` thật lên git.** File này đã được `.gitignore` chặn.

---

## 👤 Tài khoản Demo

Hệ thống cung cấp sẵn **7 tài khoản mẫu** cho 7 vai trò:

| # | Username | Password | Vai trò | Chức năng |
| :-: | ---------- | ---------- | --------- | ----------- |
| 1 | `admin` | `Admin@123` | **ADMIN** | Quản trị hệ thống, xếp lịch trực, báo cáo tổng thể |
| 2 | `letan` | `Receptionist@123` | **RECEPTIONIST** | Tiếp đón, tạo hồ sơ, check-in ca khám |
| 3 | `bacsi` | `Doctor@123` | **DOCTOR** | Khám bệnh, kê đơn, AI chẩn đoán & cảnh báo thuốc |
| 4 | `dieuduong` | `Nurse@123` | **NURSE** | Đo sinh hiệu, tính BMI, nhập cận lâm sàng |
| 5 | `duocsi` | `Pharmacist@123` | **PHARMACIST** | Kho dược, cấp phát, cảnh báo hết hạn |
| 6 | `ketoan` | `Accountant@123` | **ACCOUNTANT** | Hóa đơn, thu tiền, VietQR, BHYT |
| 7 | `benhnhan` | `Password@123` | **PATIENT** | Đặt lịch, xem lịch sử khám, AI chatbot |

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
| ---------- | --------- | --------- |
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
./mvnw test

# AI Service — Pytest
cd ai-service
pytest
```

---

## 🗄️ Database Migrations

Schema được quản lý bằng **Flyway**. Các migration file nằm tại `backend/src/main/resources/db/migration/`:

| Version | Nội dung |
| --------- | ---------- |
| V1 – V5 | Schema cơ bản: users, patients, appointments |
| V6 – V10 | Clinical: visits, prescriptions, lab results |
| V11 – V12 | Billing, pharmacy |
| V13 | Staff schedules schema |
| V14 | Patient blood type |
| V15 | Seed: receptionist, nurse accounts |
| V16 | Sync Mỹ Phát doctors & roles |
| V17 | Sync staff schedules (232 shifts) |

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
| - | - |
| 🏥 **Bệnh viện** | Mỹ Phát Hospital |
| 📍 **Địa chỉ** | 1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang |
| 📞 **Hotline** | 0789 065 493 |
| 📧 **Email** | <myphathospital@gmail.com> |
| 📘 **Facebook** | [facebook.com/MyPhatHospital](https://www.facebook.com/MyPhatHospital) |

---

<div align="center">

Made with ❤️ for **Mỹ Phát Hospital** · 2019–2026

</div>
