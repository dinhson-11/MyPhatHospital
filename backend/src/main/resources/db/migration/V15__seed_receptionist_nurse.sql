-- =============================================
-- V15: Seed tài khoản mẫu cho Lễ tân (RECEPTIONIST) và Điều dưỡng (NURSE)
-- Hoàn thiện 7 roles cho hệ thống phân quyền y tế HMS-AI
-- =============================================

-- 1. Tạo tài khoản users cho Lễ tân và Điều dưỡng
-- Password chuẩn: Receptionist@123, Nurse@123 (BCrypt hash)
INSERT IGNORE INTO users (username, password_hash, full_name, email, phone, status) VALUES
('letan', '$2a$10$7Z2N7nQJ5EHQv0gZ5M6iZ.T3QhJm0nJ3F5kG3qK2jF9X9n1bE8e2m', 'CN. Hoàng Thùy Linh', 'receptionist.linh@hospital.com', '0945678901', 'ACTIVE'),
('dieuduong', '$2a$10$7Z2N7nQJ5EHQv0gZ5M6iZ.T3QhJm0nJ3F5kG3qK2jF9X9n1bE8e2m', 'ĐD. Phạm Thu Hà', 'nurse.ha@hospital.com', '0956789012', 'ACTIVE');

-- 2. Gán role tương ứng
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'RECEPTIONIST' WHERE u.username = 'letan';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'NURSE' WHERE u.username = 'dieuduong';

-- 3. Tạo hồ sơ staff_profiles
INSERT IGNORE INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Tiếp đón, Điều phối lịch & Thủ tục hành chính BHYT', 'CCHN-004512-BYT' 
FROM users u WHERE u.username = 'letan';

INSERT IGNORE INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Điều dưỡng lâm sàng & Chăm sóc sinh hiệu bệnh nhân', 'CCHN-007823-BYT' 
FROM users u WHERE u.username = 'dieuduong';
