# HMS-AI – Hospital Management System with AI

## Identity
Đây là dự án **Hệ thống Quản lý Bệnh viện tích hợp AI** (HMS-AI) cho đồ án học phần Project 1. Hệ thống bao gồm 3 thành phần chính:
- **Backend**: Java 17 + Spring Boot 3 (REST API, monolith)
- **AI Service**: Python 3.11 + FastAPI (Chatbot, Drug Interaction, Diagnosis Suggestion)
- **Frontend**: React + Axios (SPA)

## Critical Rules
- **KHÔNG BAO GIỜ** hardcode thông tin nhạy cảm (database credentials, JWT secret, API keys) trực tiếp trong code. Luôn dùng environment variables hoặc `application.yml` với profile.
- **LUÔN LUÔN** thêm disclaimer "Chỉ mang tính tham khảo" cho mọi output AI (chatbot, cảnh báo thuốc, gợi ý chẩn đoán) – đây là yêu cầu bắt buộc (NFR-8).
- **LUÔN LUÔN** log mọi gợi ý AI vào bảng `ai_clinical_suggestions` để audit/truy vết.
- **KHÔNG BAO GIỜ** xóa cứng (hard delete) dữ liệu bệnh nhân hoặc hồ sơ y tế. Luôn dùng soft delete (`is_deleted`).
- **KHÔNG** để API trả dữ liệu EMR/hồ sơ bệnh án mà không kiểm tra phân quyền.
- **LUÔN** validate input ở cả Controller (Bean Validation) và Service layer.

## Tech Stack & Versions
| Thành phần | Công nghệ | Version |
|---|---|---|
| Backend | Java + Spring Boot | Java 17, Spring Boot 3.x |
| CSDL | MySQL | 8.x |
| AI Service | Python + FastAPI | Python 3.11, FastAPI |
| Frontend | React + Axios | React 18+ |
| Auth | JWT (jjwt) | — |
| API Docs | springdoc-openapi | Swagger UI |
| Container | Docker, Docker Compose | — |
| Build/Test | Maven, JUnit 5, Mockito | — |
| Migration | Flyway hoặc Liquibase | — |

## Project Structure (Backend)
```
com.hospital.hmsai
├── config/            # Security, CORS, Swagger config
├── security/          # JWT filter, UserDetailsService
├── common/            # ApiResponse, exception handler, enums, base entity
├── auth/              # controller, service, dto
├── user/              # controller, service, repository, entity, dto
├── patient/           # controller, service, repository, entity, dto
├── appointment/       # controller, service, repository, entity, dto
├── clinical/          # visit, prescription, lab
├── pharmacy/          # drugs, dispense, stock
├── billing/           # invoice, payment
├── hr/                # staff, schedule
├── reporting/         # statistics endpoints
└── ai/                # AiGatewayController, AiClientService, dto
```

## API Conventions
- Base path: `/api/v1`
- Format: JSON, `Content-Type: application/json`
- Auth: `Authorization: Bearer <JWT>`
- Response chuẩn: `{ "success": true, "data": {}, "message": "OK" }`
- Error chuẩn: `{ "success": false, "errorCode": "...", "message": "...", "details": [] }`
- HTTP codes: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- Phân trang: `?page=0&size=20&sort=createdAt,desc`

## Database Conventions
- Naming: `snake_case`, tên bảng **số nhiều** (`patients`, `appointments`)
- Khóa chính: `BIGINT AUTO_INCREMENT`
- Mọi bảng có `created_at`, `updated_at`
- Xóa mềm: `is_deleted` flag
- Khóa ngoại: `fk_<bảng_con>_<bảng_cha>`
- Chuẩn hóa tới 3NF

## Java Code Style
- Dùng Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`) cho entity/DTO.
- Mỗi module: `Controller -> Service (interface + impl) -> Repository -> Entity`
- DTO tách biệt Entity khi trả về client. Dùng `@Valid` cho request DTO.
- Exception handling tập trung qua `@ControllerAdvice` / `@RestControllerAdvice`.
- `@PreAuthorize("hasRole('...')")` cho phân quyền ở Controller.
- Logging dùng SLF4J (`@Slf4j` từ Lombok).

## Python AI Service Code Style
- Type hints cho tất cả function parameters và return types.
- Pydantic models cho request/response.
- Dùng `async def` cho endpoints FastAPI.
- Error handling trả JSON format nhất quán với backend chính.

## Roles (RBAC)
7 roles: `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `NURSE`, `PHARMACIST`, `ACCOUNTANT`, `PATIENT`

## Common Commands
```bash
# Backend
mvn spring-boot:run -Dspring.profiles.active=dev
mvn test
mvn clean package -DskipTests

# AI Service
uvicorn main:app --reload --port 8000

# Frontend
npm run dev

# Docker
docker-compose up -d
docker-compose logs -f backend
```

## Modules Priority (MVP)
1. ✅ Auth/RBAC (Sprint 1)
2. ✅ Patient/EMR (Sprint 2)
3. ✅ Appointment (Sprint 3)
4. ✅ Clinical Visit/Prescription (Sprint 4)
5. ✅ AI Drug Interaction & Allergy Warning (Sprint 5)
6. ✅ AI Diagnosis Suggestion (Sprint 6)
7. ✅ AI Chatbot (Sprint 7)
8. ⬜ Pharmacy/Billing/HR (Sprint 8 - rút gọn)
9. ⬜ Reporting (Sprint 9)
