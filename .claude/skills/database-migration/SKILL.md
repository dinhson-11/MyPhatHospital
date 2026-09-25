---
name: database-migration
description: Tạo database migration script (Flyway/Liquibase) hoặc schema SQL mới. Sử dụng khi cần thêm/sửa bảng, cột, index trong MySQL.
---

# Skill: Tạo Database Migration

## Khi nào dùng
Sử dụng khi cần thêm bảng mới, sửa cột, thêm index, hoặc tạo dữ liệu seed cho database MySQL.

## Tham chiếu
Luôn tham chiếu `03_DB_Design.md` trước khi tạo migration.

## Quy ước Naming

### Flyway
```
src/main/resources/db/migration/
├── V1__create_users_roles.sql
├── V2__create_patients_allergies.sql
├── V3__create_appointments_visits.sql
├── V4__create_prescriptions_drugs.sql
├── V5__create_lab_orders_results.sql
├── V6__create_pharmacy_dispenses.sql
├── V7__create_invoices.sql
├── V8__create_chat_ai_tables.sql
├── V9__seed_roles_departments.sql
└── V10__seed_sample_drugs.sql
```
Format: `V<version>__<description>.sql` (hai dấu gạch dưới)

### Liquibase (nếu dùng)
```yaml
# changelog-master.yaml
databaseChangeLog:
  - include:
      file: db/changelog/001-create-users-roles.yaml
  - include:
      file: db/changelog/002-create-patients.yaml
```

## Quy ước Schema

### Bảng
```sql
CREATE TABLE <table_name> (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- ... columns ...
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Quy tắc bắt buộc
- Tên bảng: `snake_case`, **số nhiều** (`patients`, `appointments`)
- Khóa chính: `id BIGINT AUTO_INCREMENT`
- Timestamps: `created_at`, `updated_at` cho mọi bảng
- Charset: `utf8mb4` (hỗ trợ tiếng Việt)
- Engine: `InnoDB` (hỗ trợ foreign key, transaction)
- Khóa ngoại: `fk_<bảng_con>_<bảng_cha>`

### Foreign Key
```sql
ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_patients 
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    ADD CONSTRAINT fk_appointments_staff_profiles 
    FOREIGN KEY (doctor_id) REFERENCES staff_profiles(id);
```

### Index
```sql
-- Index đề xuất (xem 03_DB_Design.md mục 4)
CREATE INDEX idx_appointments_doctor_scheduled 
    ON appointments(doctor_id, scheduled_at);
CREATE INDEX idx_patients_code ON patients(patient_code);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE UNIQUE INDEX idx_drug_interactions_pair 
    ON drug_interactions(drug_a_id, drug_b_id);
```

## Seed Data mẫu
```sql
-- Roles (bắt buộc)
INSERT INTO roles (id, code, name) VALUES
(1, 'ADMIN', 'Quản trị viên'),
(2, 'DOCTOR', 'Bác sĩ'),
(3, 'NURSE', 'Điều dưỡng'),
(4, 'PHARMACIST', 'Dược sĩ'),
(5, 'RECEPTIONIST', 'Lễ tân'),
(6, 'ACCOUNTANT', 'Kế toán'),
(7, 'PATIENT', 'Bệnh nhân');

-- Departments (mẫu)
INSERT INTO departments (id, name, description) VALUES
(1, 'Nội tổng quát', 'Khoa Nội'),
(2, 'Ngoại tổng quát', 'Khoa Ngoại'),
(3, 'Sản phụ khoa', 'Khoa Sản'),
(4, 'Nhi', 'Khoa Nhi'),
(5, 'Tim mạch', 'Khoa Tim mạch'),
(6, 'Tiêu hóa', 'Khoa Tiêu hóa'),
(7, 'Cấp cứu', 'Khoa Cấp cứu');
```

## Checklist
- [ ] Tên bảng/cột đúng snake_case
- [ ] Charset `utf8mb4` cho tiếng Việt
- [ ] Foreign key có constraint name đúng quy ước
- [ ] Index cho các cột query thường xuyên
- [ ] Seed data cho roles, departments (bắt buộc)
- [ ] Migration version number không trùng
- [ ] Test migration chạy được trên MySQL 8
