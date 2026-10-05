# 🏥 Mỹ Phát Hospital – Hệ thống Quản lý Bệnh viện

Hệ thống Quản lý Bệnh viện **Mỹ Phát Hospital** – tích hợp AI, phân quyền đa vai trò, hỗ trợ vận hành thực tế.

## 📋 Tổng quan

Hệ thống hỗ trợ quản lý toàn bộ quy trình khám chữa bệnh tại cơ sở y tế, tích hợp AI:

- **AI Chatbot**: tư vấn bệnh nhân, gợi ý chuyên khoa theo triệu chứng
- **AI Cảnh báo lâm sàng**: cảnh báo tương tác thuốc, gợi ý chẩn đoán tham khảo

## 🏗️ Kiến trúc

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│ Frontend (React)│────▶│ Backend          │────▶│ MySQL 8    │
│ :3000           │     │ Spring Boot :8080│     │ :3306      │
└─────────────────┘     └──────────────────┘     └────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ AI Service       │
                        │ FastAPI :8000    │
                        └──────────────────┘
```

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
| --- | --- |
| Backend | Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA |
| CSDL | MySQL 8 |
| Migration | Flyway |
| AI Service | Python 3.11, FastAPI |
| Frontend | React 18 (sẽ setup) |
| Auth | JWT (jjwt) |
| API Docs | Swagger UI (springdoc-openapi) |
| Container | Docker, Docker Compose |

## 🚀 Cách chạy

### Cách 1: Docker Compose (khuyến nghị)

```bash
# Clone project
git clone <repo-url>
cd thanhSonHospital

# Tạo file .env từ mẫu
cp .env.example .env

# ⚠️  BẮT BUỘC: Tạo JWT_SECRET mạnh trước khi chạy
# Linux/Mac:
#   openssl rand -base64 32
# Windows (PowerShell):
#   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
# Dán kết quả vào JWT_SECRET trong file .env

# Build & start tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f backend
docker-compose logs -f ai-service

# Stop
docker-compose down
```

### Cách 2: Chạy riêng từng service

#### 1. MySQL

```bash
# Tạo database
mysql -u root -p -e "CREATE DATABASE hmsai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 2. Backend (Spring Boot)

```bash
cd backend

# Chạy dev mode
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Hoặc build JAR
mvn clean package -DskipTests
java -jar target/hmsai-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
```

#### 3. AI Service (FastAPI)

```bash
cd ai-service

# Tạo virtual environment
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# Cài dependencies
pip install -r requirements.txt

# Chạy
uvicorn main:app --reload --port 8000
```

#### 4. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

## 📖 API Documentation

Sau khi chạy backend, truy cập:

- **Swagger UI**: <http://localhost:8080/swagger-ui.html>
- **OpenAPI JSON**: <http://localhost:8080/v3/api-docs>
- **AI Service Docs**: <http://localhost:8000/docs>

## 📚 Tài liệu Dự án (Docs)

Hệ thống tài liệu đặc tả và thiết kế kỹ thuật được lưu trữ chi tiết:
- [01_SRS.md](file:///d:/01_Work/Projects/thanhSonHospital/01_SRS.md) – Đặc tả yêu cầu phần mềm (SRS).
- [02_API_Design.md](file:///d:/01_Work/Projects/thanhSonHospital/02_API_Design.md) – Thiết kế REST API chuẩn OpenAPI/Swagger.
- [03_DB_Design.md](file:///d:/01_Work/Projects/thanhSonHospital/03_DB_Design.md) – Thiết kế Cơ sở dữ liệu và Flyway Migrations.
- [04_Architecture.md](file:///d:/01_Work/Projects/thanhSonHospital/04_Architecture.md) – Kiến trúc hệ thống phân tầng và AI Service tách rời.
- [05_RBAC_Role_Permissions_Plan.md](file:///d:/01_Work/Projects/thanhSonHospital/05_RBAC_Role_Permissions_Plan.md) – **Kế hoạch chi tiết phân quyền (RBAC) & Ma trận chức năng 7 vai trò**.
- [Coding_Plan.md](file:///d:/01_Work/Projects/thanhSonHospital/Coding_Plan.md) – Kế hoạch code chi tiết từng Sprint.

## 🔐 7 Tài khoản Dùng thử (Demo Accounts)

Hệ thống cung cấp sẵn 7 tài khoản mẫu đại diện cho 7 vai trò để kiểm thử và thuyết trình đồ án:

| STT | Username | Password | Role | Tên hiển thị & Chức năng |
|:---:|---|---|---|---|
| 1 | `admin` | `Admin@123` | `ADMIN` | TS. Quản Trị Viên – Quản trị người dùng, xếp lịch trực, báo cáo tổng thể |
| 2 | `letan` | `Receptionist@123` | `RECEPTIONIST` | CN. Hoàng Thùy Linh – Tiếp đón, tạo hồ sơ, check-in ca khám |
| 3 | `bacsi` | `Doctor@123` | `DOCTOR` | BSCKII. Nguyễn Văn Hùng – Khám bệnh, chẩn đoán AI, kê đơn & cảnh báo AI |
| 4 | `dieuduong`| `Nurse@123` | `NURSE` | ĐD. Phạm Thu Hà – Đo sinh hiệu, tính BMI, nhập kết quả cận lâm sàng |
| 5 | `duocsi` | `Pharmacist@123` | `PHARMACIST` | DS. Đỗ Thị Mai – Kho Dược, cấp phát thuốc trừ kho, cảnh báo hết hạn |
| 6 | `ketoan` | `Accountant@123` | `ACCOUNTANT` | KT. Trần Thị Hoa – Lập hóa đơn 3 phần, thu tiền mặt, tạo VietQR động |
| 7 | `benhnhan` | `Password@123` | `PATIENT` | Anh Trần Đức Minh – Cổng bệnh nhân: đặt lịch, xem vé, hồ sơ sức khỏe, AI chat |

## 📁 Cấu trúc dự án

```
thanhSonHospital/
├── backend/                     # Spring Boot Backend
│   ├── src/main/java/com/hospital/hmsai/
│   │   ├── auth/                # JWT, login
│   │   ├── patient/             # Quản lý bệnh nhân
│   │   ├── appointment/         # Đặt lịch khám
│   │   ├── clinical/            # Khám bệnh, kê đơn
│   │   ├── pharmacy/            # Kho dược, cấp phát
│   │   ├── billing/             # Hóa đơn, thanh toán
│   │   ├── hr/                  # Nhân sự, lịch trực
│   │   └── reporting/           # Báo cáo
│   ├── src/main/resources/
│   │   ├── db/migration/        # Flyway SQL migrations (V1–V17)
│   │   ├── application.yml      # Common config (NO secrets)
│   │   ├── application-dev.yml  # Dev profile
│   │   └── application-prod.yml # Prod profile (git-ignored)
│   ├── Dockerfile
│   └── pom.xml
├── ai-service/                  # Python FastAPI AI Service
│   ├── routers/                 # API endpoints
│   ├── services/                # Business logic (chatbot, diagnosis)
│   ├── models/                  # Pydantic models + trained ML models
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # React + Vite Frontend
│   ├── public/                  # Static assets, images
│   ├── src/
│   │   ├── components/          # UI components by module
│   │   ├── services/            # API service clients
│   │   ├── context/             # Auth context
│   │   └── tests/               # Vitest unit tests
│   ├── nginx.conf               # Nginx config for Docker
│   └── Dockerfile
├── docker-compose.yml           # Multi-service orchestration
├── .env.example                 # ✅ Safe template – commit this
├── .env                         # ❌ Real secrets – git-ignored
├── .gitignore
└── README.md
```

## 📅 Lộ trình phát triển

| Sprint | Tuần | Nội dung |
| --- | --- | --- |
| 0 | 1 | ✅ Khởi tạo project, DB schema, config |
| 1 | 2 | Auth & phân quyền (JWT/RBAC) |
| 2 | 3 | Bệnh nhân & EMR |
| 3 | 4 | Đặt lịch khám |
| 4 | 5-6 | Khám bệnh, kê đơn, cận lâm sàng |
| 5 | 7 | AI: Cảnh báo tương tác thuốc |
| 6 | 8 | AI: Gợi ý chẩn đoán |
| 7 | 9 | AI: Chatbot |
| 8 | 10 | Nhà thuốc, viện phí, nhân sự |
| 9 | 11 | Báo cáo, kiểm thử |
| 10 | 12 | Đóng gói & báo cáo |

## 👥 Tác nhân hệ thống

Bệnh nhân • Lễ tân • Bác sĩ • Điều dưỡng • Dược sĩ • Kế toán • Quản trị viên

## 📝 License

Đồ án học phần – Project 1
