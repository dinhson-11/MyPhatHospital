# Thiết kế Cơ sở dữ liệu – HMS-AI (MySQL)

## 1. Nguyên tắc thiết kế
- Chuẩn hóa tới 3NF, khóa chính dùng `BIGINT AUTO_INCREMENT`.
- Naming: `snake_case`, tên bảng số nhiều (`patients`, `appointments`...).
- Mọi bảng nghiệp vụ có `created_at`, `updated_at`; xóa mềm bằng `is_deleted` khi cần giữ lịch sử.
- Khóa ngoại đặt tên `fk_<bảng con>_<bảng cha>`.

## 2. Danh sách bảng chính

### 2.1 Nhóm Tài khoản & phân quyền
```sql
users (
  id BIGINT PK AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  status ENUM('ACTIVE','LOCKED') DEFAULT 'ACTIVE',
  created_at DATETIME, updated_at DATETIME
)

roles (
  id BIGINT PK, code VARCHAR(30) UNIQUE, -- ADMIN, DOCTOR, NURSE, PHARMACIST, RECEPTIONIST, ACCOUNTANT, PATIENT
  name VARCHAR(100)
)

user_roles (
  user_id BIGINT FK->users.id,
  role_id BIGINT FK->roles.id,
  PRIMARY KEY(user_id, role_id)
)

departments (
  id BIGINT PK, name VARCHAR(100), description VARCHAR(255)
)

staff_profiles (
  id BIGINT PK,
  user_id BIGINT FK->users.id UNIQUE,
  department_id BIGINT FK->departments.id,
  specialty VARCHAR(100),      -- chuyên khoa (cho bác sĩ)
  license_no VARCHAR(50)
)
```

### 2.2 Nhóm Bệnh nhân & EMR
```sql
patients (
  id BIGINT PK,
  user_id BIGINT FK->users.id NULL,       -- null nếu bệnh nhân chưa có tài khoản (lễ tân tạo hộ)
  patient_code VARCHAR(20) UNIQUE,
  full_name VARCHAR(150),
  dob DATE, gender ENUM('MALE','FEMALE','OTHER'),
  national_id VARCHAR(20),
  address VARCHAR(255),
  phone VARCHAR(20),
  created_at DATETIME
)

patient_allergies (
  id BIGINT PK,
  patient_id BIGINT FK->patients.id,
  allergen VARCHAR(150),          -- vd: Penicillin
  severity ENUM('MILD','MODERATE','SEVERE'),
  note VARCHAR(255)
)

medical_records (
  id BIGINT PK,
  patient_id BIGINT FK->patients.id,
  visit_id BIGINT FK->visits.id,
  summary TEXT,
  created_at DATETIME
)
```

### 2.3 Nhóm Lịch khám & khám bệnh
```sql
appointments (
  id BIGINT PK,
  patient_id BIGINT FK->patients.id,
  doctor_id BIGINT FK->staff_profiles.id,
  department_id BIGINT FK->departments.id,
  scheduled_at DATETIME,
  status ENUM('BOOKED','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW'),
  source ENUM('PATIENT','RECEPTIONIST','AI_CHATBOT'),
  created_at DATETIME
)

visits (
  id BIGINT PK,
  appointment_id BIGINT FK->appointments.id NULL,
  patient_id BIGINT FK->patients.id,
  doctor_id BIGINT FK->staff_profiles.id,
  visit_time DATETIME,
  chief_complaint VARCHAR(255),    -- lý do khám
  vital_signs JSON,                -- nhiệt độ, huyết áp, mạch...
  diagnosis_code VARCHAR(20),      -- ICD-10
  diagnosis_note TEXT,
  status ENUM('IN_PROGRESS','COMPLETED')
)

prescriptions (
  id BIGINT PK,
  visit_id BIGINT FK->visits.id,
  created_at DATETIME
)

prescription_items (
  id BIGINT PK,
  prescription_id BIGINT FK->prescriptions.id,
  drug_id BIGINT FK->drugs.id,
  dosage VARCHAR(100),     -- vd: 500mg x2/ngày
  quantity INT,
  instruction VARCHAR(255)
)
```

### 2.4 Nhóm Cận lâm sàng
```sql
lab_orders (
  id BIGINT PK,
  visit_id BIGINT FK->visits.id,
  test_type VARCHAR(100),
  status ENUM('ORDERED','RESULTED'),
  ordered_at DATETIME
)

lab_results (
  id BIGINT PK,
  lab_order_id BIGINT FK->lab_orders.id,
  result_text TEXT,
  result_file_url VARCHAR(255),
  resulted_at DATETIME
)
```

### 2.5 Nhóm Nhà thuốc & kho
```sql
drugs (
  id BIGINT PK,
  code VARCHAR(30) UNIQUE,
  name VARCHAR(150),
  unit VARCHAR(30),          -- viên, chai...
  price DECIMAL(12,2),
  stock_quantity INT,
  expiry_date DATE
)

drug_interactions (        -- dữ liệu tham chiếu cho AI cảnh báo
  id BIGINT PK,
  drug_a_id BIGINT FK->drugs.id,
  drug_b_id BIGINT FK->drugs.id,
  severity ENUM('MILD','MODERATE','SEVERE'),
  description VARCHAR(255)
)

dispenses (
  id BIGINT PK,
  prescription_id BIGINT FK->prescriptions.id,
  dispensed_by BIGINT FK->staff_profiles.id,
  dispensed_at DATETIME
)
```

### 2.6 Nhóm Viện phí
```sql
invoices (
  id BIGINT PK,
  patient_id BIGINT FK->patients.id,
  visit_id BIGINT FK->visits.id,
  total_amount DECIMAL(12,2),
  status ENUM('PENDING','PAID','CANCELLED'),
  created_at DATETIME
)

invoice_items (
  id BIGINT PK,
  invoice_id BIGINT FK->invoices.id,
  item_type ENUM('SERVICE','DRUG','LAB'),
  ref_id BIGINT,           -- id tham chiếu (drug_id, lab_order_id...)
  description VARCHAR(255),
  amount DECIMAL(12,2)
)
```

### 2.7 Nhóm AI
```sql
chat_sessions (
  id BIGINT PK,
  patient_id BIGINT FK->patients.id NULL,   -- null nếu khách vãng lai
  started_at DATETIME,
  ended_at DATETIME
)

chat_messages (
  id BIGINT PK,
  session_id BIGINT FK->chat_sessions.id,
  sender ENUM('USER','AI'),
  message TEXT,
  intent VARCHAR(50),          -- vd: SYMPTOM_CHECK, BOOKING, FAQ
  created_at DATETIME
)

ai_clinical_suggestions (     -- log gợi ý AI cho bác sĩ (audit)
  id BIGINT PK,
  visit_id BIGINT FK->visits.id,
  suggestion_type ENUM('DRUG_INTERACTION','ALLERGY_ALERT','DIAGNOSIS_SUGGESTION'),
  input_snapshot JSON,          -- dữ liệu đầu vào lúc gọi AI
  output_content JSON,          -- kết quả AI trả về
  confidence_score DECIMAL(5,2),
  created_at DATETIME
)
```

## 3. Quan hệ chính (tóm tắt)
- `patients` 1–N `appointments`, `visits`, `patient_allergies`
- `visits` 1–1 `prescriptions` (một lượt khám có thể có 1 đơn), 1–N `lab_orders`
- `prescriptions` 1–N `prescription_items` N–1 `drugs`
- `drugs` N–N `drugs` qua bảng `drug_interactions` (self-reference)
- `visits` 1–N `ai_clinical_suggestions`
- `staff_profiles` 1–1 `users`, N–1 `departments`

## 4. Index đề xuất
- `appointments(doctor_id, scheduled_at)` – kiểm tra trùng lịch.
- `patients(patient_code)`, `patients(phone)`.
- `drugs(code)`.
- `drug_interactions(drug_a_id, drug_b_id)` unique composite (kiểm tra nhanh khi kê đơn).

## 5. Ghi chú thiết kế cho AI
- `patient_allergies` + `drug_interactions` là input chính cho FR-11.1/11.2.
- `ai_clinical_suggestions.input_snapshot` lưu lại triệu chứng + tiền sử tại thời điểm gọi AI để phục vụ audit/giải trình, đúng yêu cầu NFR-8.
