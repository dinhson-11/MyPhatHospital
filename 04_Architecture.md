# Thiết kế Kiến trúc – HMS-AI

## 1. Kiểu kiến trúc
**Layered Monolith + AI Service tách rời** (phù hợp quy mô đồ án môn học, dễ code/deploy, nhưng vẫn tách AI để dễ thay đổi mô hình/công nghệ AI độc lập).

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│      FRONTEND (SPA)         │        │      MOBILE (tuỳ chọn)    │
│  React / Vue                │        │                           │
└──────────────┬───────────────┘        └─────────────┬─────────────┘
               │ REST/HTTPS + JWT                      │
               ▼                                       ▼
        ┌───────────────────────────────────────────────────┐
        │            BACKEND – Spring Boot (Monolith)        │
        │  ┌───────────────────────────────────────────────┐│
        │  │ Controller Layer (REST API)                    ││
        │  ├───────────────────────────────────────────────┤│
        │  │ Service Layer (Business Logic)                 ││
        │  ├───────────────────────────────────────────────┤│
        │  │ Repository Layer (Spring Data JPA)              ││
        │  └───────────────────────────────────────────────┘│
        │  Module: Auth | Patient | Appointment | Clinical    │
        │  Pharmacy | Billing | HR | Reporting | AI-Gateway    │
        └───────────────┬───────────────────────┬────────────┘
                         │                       │
                         ▼                       ▼
                ┌────────────────┐      ┌─────────────────────┐
                │   MySQL DB     │      │   AI SERVICE (Python)│
                │  (dữ liệu chính)│      │  FastAPI             │
                └────────────────┘      │ - Chatbot (LLM API/  │
                                         │   rule-based NLP)    │
                                         │ - Drug interaction   │
                                         │   checker (rule/DB)  │
                                         │ - Diagnosis suggestion│
                                         │   (rule-based/ML nhỏ)│
                                         └──────────┬───────────┘
                                                     ▼
                                         ┌─────────────────────┐
                                         │ LLM API bên ngoài    │
                                         │ (nếu dùng, vd OpenAI)│
                                         └─────────────────────┘
```

Tùy chọn thêm (nếu còn thời gian): Redis cache cho slot lịch khám; message queue (RabbitMQ) nếu muốn xử lý bất đồng bộ AI.

## 2. Phân lớp Backend (Spring Boot)

```
com.hospital.hmsai
├── config/            (Security, CORS, Swagger config)
├── security/          (JWT filter, UserDetailsService)
├── common/            (ApiResponse, exception handler, enums)
├── auth/              (controller, service)
├── user/
├── patient/
├── appointment/
├── clinical/          (visit, prescription, lab)
├── pharmacy/
├── billing/
├── hr/                (staff, schedule)
├── reporting/
└── ai/
    ├── AiGatewayController.java     -- REST expose cho frontend
    ├── AiClientService.java         -- gọi sang AI Service (RestTemplate/WebClient)
    └── dto/
```

Mỗi module con theo mẫu: `Controller -> Service -> Repository -> Entity`, dùng DTO để tách khỏi entity khi trả về client.

## 3. AI Service (tách riêng, Python FastAPI)
Lý do tách riêng: ngôn ngữ Python có hệ sinh thái NLP/ML mạnh hơn, tránh làm nặng backend chính, dễ thay đổi mô hình AI mà không ảnh hưởng module nghiệp vụ.

- `/chat` : nhận câu hỏi bệnh nhân → phân loại intent (rule-based hoặc gọi LLM) → trả gợi ý chuyên khoa/câu trả lời.
- `/check-interaction`: nhận danh sách tên thuốc → tra bảng `drug_interactions` (đồng bộ/qua API) hoặc rule cứng → trả cảnh báo.
- `/suggest-diagnosis`: nhận triệu chứng + tiền sử → rule-based scoring hoặc mô hình phân loại đơn giản (vd Naive Bayes/Decision Tree train trên tập dữ liệu mẫu) → trả top-3 chẩn đoán khả dĩ kèm confidence.

Giao tiếp: Backend Spring Boot gọi AI Service qua REST nội bộ (`http://ai-service:8000`), có timeout + fallback (nếu AI service lỗi, hệ thống vẫn cho bác sĩ tiếp tục thao tác, chỉ ẩn phần gợi ý).

## 4. Bảo mật
- JWT (access token 15–30 phút, refresh token dài hơn).
- `Spring Security` + `@PreAuthorize` theo role ở tầng Controller/Service.
- Mã hóa mật khẩu BCrypt.
- HTTPS ở môi trường triển khai thật; giới hạn CORS theo domain frontend.
- Ghi log truy cập dữ liệu EMR nhạy cảm (ai xem hồ sơ nào, lúc nào).

## 5. Triển khai (Deployment)
```
┌───────────────┐     ┌────────────────────┐     ┌───────────────┐
│  Nginx (proxy)│──▶  │ Spring Boot (Docker)│──▶  │  MySQL (Docker)│
└───────────────┘     └────────────────────┘     └───────────────┘
        │                       │
        │                       ▼
        │             ┌────────────────────┐
        └───────────▶ │ AI Service (Docker) │
                       └────────────────────┘
```
Đóng gói bằng Docker Compose cho môi trường demo/đồ án: 3 container (backend, ai-service, mysql) + frontend build tĩnh phục vụ qua Nginx.

## 6. Công nghệ đề xuất
| Thành phần | Công nghệ |
|---|---|
| Backend | Java 17, Spring Boot 3, Spring Security, Spring Data JPA |
| CSDL | MySQL 8 |
| AI Service | Python 3.11, FastAPI, scikit-learn (nếu cần ML nhẹ) |
| Frontend | React + Axios (hoặc theo lựa chọn nhóm) |
| Auth | JWT (jjwt library) |
| Tài liệu API | springdoc-openapi (Swagger UI) |
| Container | Docker, Docker Compose |
| Build/test | Maven, JUnit 5, Mockito |

## 7. Ánh xạ với các Diagram cần nộp (theo yêu cầu học phần)
- **Component Diagram**: các module trên (Auth, Patient, Appointment, Clinical, Pharmacy, Billing, HR, Reporting, AI-Gateway, AI Service) chính là các component.
- **Deployment Diagram**: sơ đồ mục 5 ở trên (Nginx – Backend – MySQL – AI Service, mỗi node là 1 container).
