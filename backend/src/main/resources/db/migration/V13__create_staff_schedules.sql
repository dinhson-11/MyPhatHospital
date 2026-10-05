-- =============================================
-- V13: Tạo bảng staff_schedules, nâng cấp bảng invoices và seed dữ liệu Sprint 8
-- =============================================

-- 1. Bảng staff_schedules (Lịch trực nhân viên y tế - FR-8)
CREATE TABLE IF NOT EXISTS staff_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    shift ENUM('MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY') NOT NULL,
    room_no VARCHAR(50),
    note VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedules_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id),
    CONSTRAINT fk_schedules_departments FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT uk_staff_schedule UNIQUE (staff_id, work_date, shift)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_schedules_date ON staff_schedules(work_date);
CREATE INDEX idx_schedules_staff_date ON staff_schedules(staff_id, work_date);

-- 2. Nâng cấp bảng invoices (bổ sung thông tin thanh toán đa phương thức - FR-7)
-- MySQL 8 KHÔNG hỗ trợ "ADD COLUMN IF NOT EXISTS" (chỉ có ở MariaDB) → dùng information_schema để idempotent.
SET @sql = (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'payment_method'),
    'SELECT 1',
    'ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(30) NULL AFTER status'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'transaction_code'),
    'SELECT 1',
    'ALTER TABLE invoices ADD COLUMN transaction_code VARCHAR(100) NULL AFTER payment_method'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'paid_at'),
    'SELECT 1',
    'ALTER TABLE invoices ADD COLUMN paid_at DATETIME NULL AFTER transaction_code'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Tạo tài khoản mẫu cho Dược sĩ, Kế toán và Bác sĩ nếu chưa có
-- Không hardcode id: tránh đụng user đã đăng ký; tham chiếu theo username / role code.
-- Password chuẩn: Pharmacist@123, Accountant@123, Doctor@123 (BCrypt hash)
INSERT IGNORE INTO users (username, password_hash, full_name, email, phone, status) VALUES
('duocsi', '$2a$10$7Z2N7nQJ5EHQv0gZ5M6iZ.T3QhJm0nJ3F5kG3qK2jF9X9n1bE8e2m', 'DS. Đỗ Thị Mai', 'duocsi@hospital.com', '0912345678', 'ACTIVE'),
('ketoan', '$2a$10$7Z2N7nQJ5EHQv0gZ5M6iZ.T3QhJm0nJ3F5kG3qK2jF9X9n1bE8e2m', 'KT. Trần Thị Hoa', 'ketoan@hospital.com', '0923456789', 'ACTIVE'),
('bacsi', '$2a$10$7Z2N7nQJ5EHQv0gZ5M6iZ.T3QhJm0nJ3F5kG3qK2jF9X9n1bE8e2m', 'BSCKII. Nguyễn Văn Hùng', 'doctor.hung@hospital.com', '0934567890', 'ACTIVE');

-- Gán role tương ứng
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'PHARMACIST' WHERE u.username = 'duocsi';
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'ACCOUNTANT' WHERE u.username = 'ketoan';
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'DOCTOR' WHERE u.username = 'bacsi';

-- Tạo hồ sơ staff_profiles (uk_staff_profiles_user_id đảm bảo không trùng)
INSERT IGNORE INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Nội tổng quát & Tim mạch', 'CCHN-001284-BYT' FROM users u WHERE u.username = 'bacsi';
INSERT IGNORE INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Dược lâm sàng & Quản lý kho dược', 'CCHN-003391-BYT' FROM users u WHERE u.username = 'duocsi';

-- 4. Seed dữ liệu lịch trực tuần mẫu (FR-8) – uk_staff_schedule chống trùng
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, CURRENT_DATE, 'MORNING', 'P.201 - Khám Nội', 'Trực khám bệnh buổi sáng'
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.username = 'bacsi';
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'AFTERNOON', 'P.201 - Khám Nội', 'Trực khám theo lịch hẹn'
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.username = 'bacsi';
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'NIGHT', 'P.Cấp cứu', 'Trực cấp cứu ban đêm'
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.username = 'bacsi';
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, CURRENT_DATE, 'MORNING', 'Kho Dược A', 'Cấp phát thuốc ngoại trú'
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.username = 'duocsi';
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'MORNING', 'Kho Dược A', 'Kiểm kê tồn kho'
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.username = 'duocsi';

-- 5. Cập nhật vài loại thuốc có tồn kho thấp và sắp hết hạn để test cảnh báo (FR-6.3)
UPDATE drugs SET stock_quantity = 15 WHERE code = 'DRUG-WAR-5';       -- Thuốc sắp hết hàng (tồn <= 20)
UPDATE drugs SET expiry_date = DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY) WHERE code = 'DRUG-DIAZ-5'; -- Sắp hết hạn trong 20 ngày
UPDATE drugs SET stock_quantity = 8, expiry_date = DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY) WHERE code = 'DRUG-DIGO-025'; -- Vừa tồn thấp vừa sắp hết hạn
