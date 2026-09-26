-- =============================================
-- V10: Seed data – roles, departments, sample admin user
-- =============================================

-- 7 Roles theo SRS
INSERT INTO roles (id, code, name) VALUES
(1, 'ADMIN', 'Quản trị viên'),
(2, 'DOCTOR', 'Bác sĩ'),
(3, 'NURSE', 'Điều dưỡng'),
(4, 'PHARMACIST', 'Dược sĩ'),
(5, 'RECEPTIONIST', 'Lễ tân'),
(6, 'ACCOUNTANT', 'Kế toán'),
(7, 'PATIENT', 'Bệnh nhân');

-- Departments (chuyên khoa)
INSERT INTO departments (id, name, description) VALUES
(1, 'Nội tổng quát', 'Khoa Nội tổng quát'),
(2, 'Ngoại tổng quát', 'Khoa Ngoại tổng quát'),
(3, 'Sản phụ khoa', 'Khoa Sản phụ khoa'),
(4, 'Nhi', 'Khoa Nhi'),
(5, 'Tim mạch', 'Khoa Tim mạch'),
(6, 'Tiêu hóa', 'Khoa Tiêu hóa'),
(7, 'Cấp cứu', 'Khoa Cấp cứu'),
(8, 'Da liễu', 'Khoa Da liễu'),
(9, 'Mắt', 'Khoa Mắt'),
(10, 'Tai mũi họng', 'Khoa Tai mũi họng');

-- Admin user mặc định (password: Admin@123 – BCrypt encoded)
-- Sẽ cập nhật hash chính xác khi chạy Sprint 1
INSERT INTO users (id, username, password_hash, full_name, email, phone, status) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Quản trị viên', 'admin@hospital.com', '0900000000', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1);  -- admin -> ADMIN role
