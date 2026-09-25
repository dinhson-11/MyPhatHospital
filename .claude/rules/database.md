# Rule: Database & Migration

## Quy ước bảng

### Naming
- Tên bảng: `snake_case`, **số nhiều** (`patients`, `appointments`, `drug_interactions`)
- Tên cột: `snake_case` (`full_name`, `created_at`, `patient_id`)
- Khóa ngoại: `fk_<bảng_con>_<bảng_cha>` (vd: `fk_appointments_patients`)
- Index: `idx_<bảng>_<cột>` (vd: `idx_patients_code`)

### Cấu trúc bắt buộc
- Khóa chính: `id BIGINT AUTO_INCREMENT PRIMARY KEY`
- Timestamps: `created_at DATETIME`, `updated_at DATETIME`
- Soft delete: `is_deleted BOOLEAN DEFAULT FALSE` (khi cần)
- Charset: `utf8mb4` (hỗ trợ tiếng Việt đầy đủ)
- Engine: `InnoDB`

### Chuẩn hóa
- Tối thiểu chuẩn 3NF
- Tránh redundant data giữa các bảng
- Dùng foreign key constraint để đảm bảo toàn vẹn dữ liệu

## Entity Mapping (JPA)

### Quy tắc
- Entity name = PascalCase số ít (`Patient`, `Appointment`)
- `@Table(name = "snake_case_plural")` bắt buộc
- `@Column(name = "snake_case")` cho cột không match field name
- Dùng `@Enumerated(EnumType.STRING)` cho ENUM
- Dùng `@PrePersist` / `@PreUpdate` cho auto timestamps
- JSON column dùng `@JdbcTypeCode(SqlTypes.JSON)` hoặc converter

### Quan hệ
- `@ManyToOne` với `@JoinColumn` — chỉ định rõ foreign key column
- `@OneToMany` thường dùng `mappedBy`, fetch LAZY
- Tránh cascade mà không cân nhắc kỹ (đặc biệt `CascadeType.REMOVE`)

## Migration (Flyway)

### Quy tắc
- File migration: `V<N>__<description>.sql` (hai underscore)
- KHÔNG BAO GIỜ sửa migration đã apply → tạo migration mới
- Migration PHẢI idempotent khi có thể
- Seed data tách thành migration riêng (`V9__seed_roles.sql`)
- Test migration trên MySQL 8.x trước khi commit

### Thứ tự migration đề xuất
1. `V1__create_users_roles.sql` – users, roles, user_roles
2. `V2__create_departments_staff.sql` – departments, staff_profiles
3. `V3__create_patients.sql` – patients, patient_allergies
4. `V4__create_appointments.sql` – appointments
5. `V5__create_visits_prescriptions.sql` – visits, prescriptions, prescription_items
6. `V6__create_lab.sql` – lab_orders, lab_results
7. `V7__create_drugs_pharmacy.sql` – drugs, drug_interactions, dispenses
8. `V8__create_billing.sql` – invoices, invoice_items
9. `V9__create_ai_tables.sql` – chat_sessions, chat_messages, ai_clinical_suggestions
10. `V10__seed_data.sql` – roles, departments, sample drugs
