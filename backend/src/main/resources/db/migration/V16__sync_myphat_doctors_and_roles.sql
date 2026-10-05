-- ==============================================================
-- V16: Đồng bộ tài khoản người dùng & chức năng 7 vai trò (Roles)
-- Khớp chuẩn danh sách Bác sĩ Mỹ Phát Hospital và các Chuyên khoa
-- ==============================================================

-- Mở rộng độ dài specialty cho staff_profiles nếu cần
ALTER TABLE staff_profiles MODIFY COLUMN specialty VARCHAR(255);

-- 1. Cập nhật và bổ sung các phòng ban/chuyên khoa chuẩn Mỹ Phát Hospital
INSERT INTO departments (id, name, description) VALUES
(1, 'Khoa Khám bệnh / Cấp cứu ban đầu', 'Tiếp nhận khám, chẩn đoán, điều trị các bệnh lý nội khoa, ngoại khoa thông thường và xử lý sơ cứu kịp thời.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(2, 'Ngoại khoa & Phẫu thuật / Tiểu phẫu', 'Thực hiện một số thủ thuật ngoại khoa nhỏ như phẫu thuật hội chứng ống cổ tay, xử lý tuyến mồ hôi nách, điều trị vết thương nông.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(3, 'Sản - Phụ khoa', 'Khám, tư vấn quản lý thai kỳ và điều trị các bệnh phụ khoa thường gặp.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(10, 'Tai Mũi Họng', 'Khám và điều trị các bệnh lý về đường hô hấp, dây thanh quản, khàn tiếng.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(12, 'Phòng Dược & Cung ứng thuốc', 'Quản lý, cung ứng thuốc đạt chuẩn GPP và tư vấn sử dụng thuốc an toàn, hợp lý cho bệnh nhân.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(13, 'Khoa Y học cổ truyền – Phục hồi chức năng', 'Chuyên trị các bệnh lý về cơ xương khớp như đau khớp gối, đau cổ vai gáy, đau lưng, thoát vị đĩa đệm bằng phương pháp vật lý trị liệu và Đông y.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(14, 'Dịch vụ Thẩm mỹ / Tạo hình', 'Có bác sĩ chuyên trách hỗ trợ các dịch vụ như nâng mũi và tái tạo thẩm mỹ da.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(15, 'Khoa Chẩn đoán hình ảnh', 'Siêu âm (siêu âm thai, siêu âm tổng quát) và các dịch vụ chụp chiếu kỹ thuật số giúp phát hiện chính xác bệnh lý.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(16, 'Khoa Xét nghiệm', 'Thực hiện đầy đủ xét nghiệm máu, nước tiểu, test nhanh cúm A/B, xét nghiệm ký sinh trùng (như Demodex).')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO departments (id, name, description) VALUES
(17, 'Dịch vụ Bảo hiểm Y tế (BHYT)', 'Phòng khám áp dụng thanh toán và đảm bảo đúng quyền lợi bảo hiểm y tế cho người dân khi đến khám từ Thứ 2 đến Thứ 7 hàng tuần.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 2. Cập nhật các tài khoản vai trò chuẩn mặc định (Password BCrypt chuẩn)
-- admin: Admin@123 -> $2a$10$t7TnMICOR3hr2luWHZZZVu4Fd4QmGIzQypilbmV/q7IS5WzCA.y2W
UPDATE users SET 
  full_name = 'Ban Giám Đốc Mỹ Phát Hospital', 
  email = 'myphathospital@gmail.com', 
  phone = '0789065493',
  password_hash = '$2a$10$t7TnMICOR3hr2luWHZZZVu4Fd4QmGIzQypilbmV/q7IS5WzCA.y2W',
  status = 'ACTIVE'
WHERE username = 'admin';

-- bacsi: Doctor@123 -> $2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.
UPDATE users SET 
  full_name = 'TS.BS Vi Mai Anh', 
  email = 'bs.maianh@myphathospital.com', 
  phone = '0912111222',
  password_hash = '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.',
  status = 'ACTIVE'
WHERE username = 'bacsi';

-- duocsi: Pharmacist@123 -> $2a$10$3gcX01kjMn4Ic3XfE4hYLO/N1VgH/f2indF4NZ8GNZAlxg/YVfk/K
UPDATE users SET 
  full_name = 'ThS.DS Lê Hải Quang', 
  email = 'ds.quang@myphathospital.com', 
  phone = '0978666555',
  password_hash = '$2a$10$3gcX01kjMn4Ic3XfE4hYLO/N1VgH/f2indF4NZ8GNZAlxg/YVfk/K',
  status = 'ACTIVE'
WHERE username = 'duocsi';

-- letan: Receptionist@123 -> $2a$10$2nbRHT527P205xPPqiUs2ucz2I7pFmLtcYw5wAE7QzC.n2djkQ5TO
UPDATE users SET 
  full_name = 'CN. Hoàng Thùy Linh', 
  email = 'letan.linh@myphathospital.com', 
  phone = '0945678901',
  password_hash = '$2a$10$2nbRHT527P205xPPqiUs2ucz2I7pFmLtcYw5wAE7QzC.n2djkQ5TO',
  status = 'ACTIVE'
WHERE username = 'letan';

-- dieuduong: Nurse@123 -> $2a$10$NPgyG7Nrj3xhXAifYde.2usgYOX1eBqWx2245X/1ieOCyNaSNj9lG
UPDATE users SET 
  full_name = 'ĐD. Phạm Thu Hà', 
  email = 'nurse.ha@myphathospital.com', 
  phone = '0956789012',
  password_hash = '$2a$10$NPgyG7Nrj3xhXAifYde.2usgYOX1eBqWx2245X/1ieOCyNaSNj9lG',
  status = 'ACTIVE'
WHERE username = 'dieuduong';

-- ketoan: Accountant@123 -> $2a$10$LbvKzQ2PcTM3s9STElMY9eYBNAy8y1ZT432WeQUBjhKS6Gzw/EiB.
UPDATE users SET 
  full_name = 'KT. Trần Thị Hoa', 
  email = 'ketoan.hoa@myphathospital.com', 
  phone = '0923456789',
  password_hash = '$2a$10$LbvKzQ2PcTM3s9STElMY9eYBNAy8y1ZT432WeQUBjhKS6Gzw/EiB.',
  status = 'ACTIVE'
WHERE username = 'ketoan';

-- 3. Tạo tài khoản mẫu Bệnh nhân: benhnhan (Password@123 -> $2a$10$sueTqK8uYdF8xRqOfzUeb.ncPmgDcoOFgUycCr0ssrpDf6zWXnseK)
INSERT IGNORE INTO users (username, password_hash, full_name, email, phone, status) VALUES
('benhnhan', '$2a$10$sueTqK8uYdF8xRqOfzUeb.ncPmgDcoOFgUycCr0ssrpDf6zWXnseK', 'Trần Đức Minh', 'minh.tran@gmail.com', '0912345678', 'ACTIVE');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'PATIENT' WHERE u.username = 'benhnhan';

-- 4. Bổ sung tài khoản cho từng Bác sĩ & Dược sĩ Mỹ Phát Hospital
-- Mật khẩu Bác sĩ: Doctor@123 ($2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.)
-- Mật khẩu Dược sĩ: Pharmacist@123 ($2a$10$3gcX01kjMn4Ic3XfE4hYLO/N1VgH/f2indF4NZ8GNZAlxg/YVfk/K)
INSERT IGNORE INTO users (username, password_hash, full_name, email, phone, status) VALUES
('bs.maianh', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'TS.BS Vi Mai Anh', 'bs.maianh@myphathospital.com', '0912111222', 'ACTIVE'),
('bs.nga', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'BSCKII. Lê Thị Nga', 'bs.nga@myphathospital.com', '0912222333', 'ACTIVE'),
('bs.vy', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'BSCKII. Phạm Lan Vy', 'bs.vy@myphathospital.com', '0912333444', 'ACTIVE'),
('bs.dung', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'ThS.BS Hoàng Thị Dung', 'bs.dung@myphathospital.com', '0912444555', 'ACTIVE'),
('bs.sy', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'BS. Nguyễn Văn Sỹ', 'bs.sy@myphathospital.com', '0912555666', 'ACTIVE'),
('bs.hiep', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'ThS.BS Lê Tuấn Hiệp', 'bs.hiep@myphathospital.com', '0912666777', 'ACTIVE'),
('bs.an', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'TS.BS Trần Thị An', 'bs.an@myphathospital.com', '0912777888', 'ACTIVE'),
('bs.toan', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'ThS.BS Hoàng Văn Toán', 'bs.toan@myphathospital.com', '0912888999', 'ACTIVE'),
('ds.quang', '$2a$10$3gcX01kjMn4Ic3XfE4hYLO/N1VgH/f2indF4NZ8GNZAlxg/YVfk/K', 'ThS.DS Lê Hải Quang', 'ds.quang@myphathospital.com', '0978666555', 'ACTIVE');

-- 5. Gán Role DOCTOR cho các bác sĩ và PHARMACIST cho dược sĩ
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'DOCTOR' 
WHERE u.username IN ('bs.maianh', 'bs.nga', 'bs.vy', 'bs.dung', 'bs.sy', 'bs.hiep', 'bs.an', 'bs.toan');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'PHARMACIST' 
WHERE u.username = 'ds.quang';

-- 6. Cập nhật hồ sơ staff_profiles
-- Bác sĩ TS.BS Vi Mai Anh
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Trưởng khoa Khám bệnh / Cấp cứu ban đầu • Chuyên gia Nội tổng quát', 'CCHN-001289-BYT'
FROM users u WHERE u.username IN ('bacsi', 'bs.maianh')
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ BSCKII. Lê Thị Nga
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 2, 'Trưởng khoa Ngoại khoa & Phẫu thuật / Tiểu phẫu', 'CCHN-002341-BYT'
FROM users u WHERE u.username = 'bs.nga'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ BSCKII. Phạm Lan Vy
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 3, 'Bác sĩ phụ trách Sản - Phụ khoa • Khám thai & Phụ khoa', 'CCHN-003456-BYT'
FROM users u WHERE u.username = 'bs.vy'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ ThS.BS Hoàng Thị Dung
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 10, 'Trưởng khoa Tai Mũi Họng • Hô hấp & Thanh quản', 'CCHN-004567-BYT'
FROM users u WHERE u.username = 'bs.dung'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ BS. Nguyễn Văn Sỹ
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 13, 'Bác sĩ phụ trách Khoa YHCT – Phục hồi chức năng • Cơ xương khớp', 'CCHN-005678-BYT'
FROM users u WHERE u.username = 'bs.sy'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ ThS.BS Lê Tuấn Hiệp
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 14, 'Bác sĩ chuyên trách Thẩm mỹ / Tạo hình • Nâng mũi & Da liễu', 'CCHN-006789-BYT'
FROM users u WHERE u.username = 'bs.hiep'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ TS.BS Trần Thị An
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 15, 'Bác sĩ phụ trách Khoa Chẩn đoán hình ảnh • Siêu âm 4D & Tim mạch', 'CCHN-007890-BYT'
FROM users u WHERE u.username = 'bs.an'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Bác sĩ ThS.BS Hoàng Văn Toán
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 16, 'Bác sĩ phụ trách Khoa Xét nghiệm • Huyết học, Sinh hóa & Tiêu hóa', 'CCHN-008901-BYT'
FROM users u WHERE u.username = 'bs.toan'
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);

-- Dược sĩ ThS.DS Lê Hải Quang
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 12, 'Trưởng Phòng Dược • Quản lý kho GPP & Dược lâm sàng', 'CCHN-009012-BYT'
FROM users u WHERE u.username IN ('duocsi', 'ds.quang')
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), specialty = VALUES(specialty), license_no = VALUES(license_no);
