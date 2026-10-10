-- =============================================
-- V18: Thống nhất dữ liệu bác sĩ / khoa phòng
--  1. Chuyển lịch hẹn từ hồ sơ trùng (tài khoản mẫu cũ) sang hồ sơ chuẩn của cùng một người
--  2. Xóa các khoa legacy của V10 (id 4-9) nếu không còn dữ liệu tham chiếu
-- Không xóa user/staff_profiles để giữ nguyên tài khoản đăng nhập mẫu (bacsi, duocsi).
-- Danh mục công khai (/api/v1/public/doctors) tự khử trùng lặp theo họ tên.
-- =============================================

-- 1. bacsi  -> bs.maianh (cùng "TS.BS Vi Mai Anh")
UPDATE appointments a
JOIN staff_profiles old_sp ON old_sp.id = a.doctor_id
JOIN users old_u ON old_u.id = old_sp.user_id AND old_u.username = 'bacsi'
JOIN users new_u ON new_u.username = 'bs.maianh'
JOIN staff_profiles new_sp ON new_sp.user_id = new_u.id
SET a.doctor_id = new_sp.id;

-- 2. duocsi -> ds.quang (cùng "ThS.DS Lê Hải Quang")
UPDATE appointments a
JOIN staff_profiles old_sp ON old_sp.id = a.doctor_id
JOIN users old_u ON old_u.id = old_sp.user_id AND old_u.username = 'duocsi'
JOIN users new_u ON new_u.username = 'ds.quang'
JOIN staff_profiles new_sp ON new_sp.user_id = new_u.id
SET a.doctor_id = new_sp.id;

-- 3. Xóa khoa legacy không còn được tham chiếu
DELETE FROM departments
WHERE id IN (4, 5, 6, 7, 8, 9)
  AND NOT EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.department_id = departments.id)
  AND NOT EXISTS (SELECT 1 FROM appointments ap WHERE ap.department_id = departments.id)
  AND NOT EXISTS (SELECT 1 FROM staff_schedules ss WHERE ss.department_id = departments.id);
