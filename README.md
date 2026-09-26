# 🏥 HMS-AI – Hospital Management System with AI

Hệ thống Quản lý Bệnh viện tích hợp AI – Đồ án học phần Project 1.

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
|---|---|
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

# Tạo file .env (copy từ mẫu và sửa)
cp .env.example .env

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
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/v3/api-docs
- **AI Service Docs**: http://localhost:8000/docs

## 🔐 Tài khoản mặc định

| Username | Password | Role |
|---|---|---|
| admin | Admin@123 | ADMIN |

## 📁 Cấu trúc dự án

```
thanhSonHospital/
├── backend/                    # Spring Boot Backend
│   ├── src/main/java/com/hospital/hmsai/
│   │   ├── config/             # Security, CORS, Swagger
│   │   ├── security/           # JWT filter, service
│   │   ├── common/             # ApiResponse, exceptions
│   │   └── ...                 # Modules (auth, patient, ...)
│   ├── src/main/resources/
│   │   ├── db/migration/       # Flyway SQL migrations
│   │   ├── application.yml     # Common config
│   │   ├── application-dev.yml # Dev profile
│   │   └── application-prod.yml# Prod profile
│   ├── Dockerfile
│   └── pom.xml
├── ai-service/                 # Python FastAPI AI Service
│   ├── routers/                # API endpoints
│   ├── models/                 # Pydantic models
│   ├── services/               # Business logic
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React Frontend (sẽ setup)
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 📅 Lộ trình phát triển

| Sprint | Tuần | Nội dung |
|---|---|---|
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
