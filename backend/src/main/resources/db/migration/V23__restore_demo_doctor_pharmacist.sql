-- =============================================
-- V23: Khôi phục tài khoản mẫu bs.maianh (Bác sĩ) và ds.quang (Dược sĩ)
--
-- Nguyên nhân: V16 UPDATE tài khoản cũ `bacsi`/`duocsi` sang email của bs.maianh/ds.quang TRƯỚC khi
-- INSERT IGNORE hai tài khoản chuẩn → trùng email (uk_users_email) nên INSERT bị bỏ qua im lặng.
-- Sau đó V19 xóa `bacsi`/`duocsi` → hệ thống KHÔNG còn Dược sĩ nào và không còn TS.BS Vi Mai Anh
-- (đăng nhập bs.maianh / ds.quang trả 401; không cấp phát thuốc được).
--
-- Ngoài ra: tài khoản mẫu `benhnhan` (V16) chưa có hồ sơ bệnh nhân nên `/patients/me` trả 404 và "Lịch hẹn của tôi"
-- không dùng được; migration này tạo hồ sơ liên kết (BN-DEMO-001) nếu chưa có.
--
-- Migration này idempotent: tài khoản/hồ sơ đã tồn tại thì giữ nguyên. Mật khẩu mẫu: Doctor@123, Pharmacist@123
-- (CHỈ dùng dev/demo – khóa bằng scripts/db/02_lock_demo_accounts.sql trước khi dùng CSDL thật).
-- =============================================

-- 1. Tài khoản
INSERT IGNORE INTO users (username, password_hash, full_name, email, phone, status) VALUES
('bs.maianh', '$2a$10$idf2Xfdm4Azhf3PcFSt7heT.4Hba80hV7QoIy1lsmcZWnhvatWlZ.', 'TS.BS Vi Mai Anh', 'bs.maianh@myphathospital.com', '0912111222', 'ACTIVE'),
('ds.quang', '$2a$10$3gcX01kjMn4Ic3XfE4hYLO/N1VgH/f2indF4NZ8GNZAlxg/YVfk/K', 'ThS.DS Lê Hải Quang', 'ds.quang@myphathospital.com', '0978666555', 'ACTIVE');

-- 2. Vai trò
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'DOCTOR' WHERE u.username = 'bs.maianh';
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'PHARMACIST' WHERE u.username = 'ds.quang';

-- 3. Hồ sơ nhân viên (uk_staff_profiles_user_id chống trùng)
INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 1, 'Trưởng khoa Khám bệnh / Cấp cứu ban đầu • Chuyên gia Nội tổng quát', 'CCHN-001289-BYT'
FROM users u WHERE u.username = 'bs.maianh'
ON DUPLICATE KEY UPDATE user_id = user_id;

INSERT INTO staff_profiles (user_id, department_id, specialty, license_no)
SELECT u.id, 12, 'Trưởng Phòng Dược • Quản lý kho GPP & Dược lâm sàng', 'CCHN-009012-BYT'
FROM users u WHERE u.username = 'ds.quang'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- 4. Lịch trực tuần hiện tại và tuần kế tiếp (uk_staff_schedule chống trùng)
SET @mon = DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY);

-- TS.BS Vi Mai Anh: Thứ 2 – Thứ 7 sáng + chiều; trực đêm Thứ 4 và Chủ nhật
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 1, DATE_ADD(@mon, INTERVAL (w.week_offset + d.day_offset) DAY), d.shift,
       'Phòng khám ban đầu 101 (Tầng 1)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (SELECT 0 AS week_offset UNION ALL SELECT 7) w
CROSS JOIN (
    SELECT 0 AS day_offset, 'MORNING' AS shift, 'Trực khám bệnh ban đầu buổi sáng' AS note UNION ALL
    SELECT 0, 'AFTERNOON', 'Khám nội tổng quát & hội chẩn' UNION ALL
    SELECT 1, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 1, 'AFTERNOON', 'Khám nội tổng quát & hẹn khám' UNION ALL
    SELECT 2, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 2, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 2, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7' UNION ALL
    SELECT 3, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 3, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 4, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 4, 'AFTERNOON', 'Khám nội tổng quát' UNION ALL
    SELECT 5, 'MORNING', 'Trực khám ban đầu buổi sáng' UNION ALL
    SELECT 5, 'AFTERNOON', 'Khám nội tổng quát cuối tuần' UNION ALL
    SELECT 6, 'NIGHT', 'Trực Cấp cứu ban đêm 24/7'
) d
WHERE u.username = 'bs.maianh';

-- ThS.DS Lê Hải Quang: Thứ 2 – Thứ 7 sáng + chiều
INSERT IGNORE INTO staff_schedules (staff_id, department_id, work_date, shift, room_no, note)
SELECT sp.id, 12, DATE_ADD(@mon, INTERVAL (w.week_offset + d.day_offset) DAY), d.shift,
       'Phòng Dược Tầng 1 (Khu A)', d.note
FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
CROSS JOIN (SELECT 0 AS week_offset UNION ALL SELECT 7) w
CROSS JOIN (
    SELECT 0 AS day_offset, 'MORNING' AS shift, 'Cấp phát thuốc BHYT & ngoại trú' AS note UNION ALL
    SELECT 0, 'AFTERNOON', 'Tư vấn dược lâm sàng & tương tác thuốc' UNION ALL
    SELECT 1, 'MORNING', 'Cấp phát thuốc GPP theo đơn' UNION ALL
    SELECT 1, 'AFTERNOON', 'Kiểm tra nhiệt độ bảo quản kho thuốc' UNION ALL
    SELECT 2, 'MORNING', 'Cấp phát thuốc BHYT & ngoại trú' UNION ALL
    SELECT 2, 'AFTERNOON', 'Kiểm kê tồn kho & hạn dùng' UNION ALL
    SELECT 3, 'MORNING', 'Cấp phát thuốc GPP theo đơn' UNION ALL
    SELECT 3, 'AFTERNOON', 'Tư vấn dùng thuốc kháng sinh an toàn' UNION ALL
    SELECT 4, 'MORNING', 'Cấp phát thuốc BHYT & ngoại trú' UNION ALL
    SELECT 4, 'AFTERNOON', 'Dự trù cơ số thuốc cấp cứu' UNION ALL
    SELECT 5, 'MORNING', 'Cấp phát thuốc ngoại trú cuối tuần' UNION ALL
    SELECT 5, 'AFTERNOON', 'Tổng kết xuất nhập tồn tuần'
) d
WHERE u.username = 'ds.quang';

-- 5. Hồ sơ bệnh nhân cho tài khoản mẫu benhnhan (uk_patients_code + NOT EXISTS chống trùng)
INSERT INTO patients (user_id, patient_code, full_name, dob, gender, phone)
SELECT u.id, 'BN-DEMO-001', u.full_name, '1990-05-15', 'MALE', u.phone
FROM users u
WHERE u.username = 'benhnhan'
  AND NOT EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM patients p2 WHERE p2.patient_code = 'BN-DEMO-001');
