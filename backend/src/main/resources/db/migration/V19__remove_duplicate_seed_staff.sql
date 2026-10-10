-- =============================================
-- V19: Xóa hồ sơ trùng của cùng một nhân sự
--   bacsi   (tài khoản mẫu cũ)  -> gộp vào bs.maianh  (TS.BS Vi Mai Anh)
--   duocsi  (tài khoản mẫu cũ)  -> gộp vào ds.quang   (ThS.DS Lê Hải Quang)
-- Dữ liệu phát sinh (lịch hẹn, lượt khám, phiếu cấp phát) được chuyển sang hồ sơ chuẩn.
-- Lịch trực của hồ sơ trùng bị xóa vì V17 đã tạo lịch trực tương ứng cho hồ sơ chuẩn.
-- Đăng nhập thay thế: bs.maianh / Doctor@123, ds.quang / Pharmacist@123 (cùng mật khẩu cũ).
-- =============================================

-- 1. Chuyển dữ liệu phát sinh: bacsi -> bs.maianh
UPDATE appointments t
JOIN staff_profiles o ON o.id = t.doctor_id
JOIN users ou ON ou.id = o.user_id AND ou.username = 'bacsi'
JOIN users nu ON nu.username = 'bs.maianh'
JOIN staff_profiles n ON n.user_id = nu.id
SET t.doctor_id = n.id;

UPDATE visits t
JOIN staff_profiles o ON o.id = t.doctor_id
JOIN users ou ON ou.id = o.user_id AND ou.username = 'bacsi'
JOIN users nu ON nu.username = 'bs.maianh'
JOIN staff_profiles n ON n.user_id = nu.id
SET t.doctor_id = n.id;

-- 2. Chuyển dữ liệu phát sinh: duocsi -> ds.quang
UPDATE dispenses t
JOIN staff_profiles o ON o.id = t.dispensed_by
JOIN users ou ON ou.id = o.user_id AND ou.username = 'duocsi'
JOIN users nu ON nu.username = 'ds.quang'
JOIN staff_profiles n ON n.user_id = nu.id
SET t.dispensed_by = n.id;

UPDATE appointments t
JOIN staff_profiles o ON o.id = t.doctor_id
JOIN users ou ON ou.id = o.user_id AND ou.username = 'duocsi'
JOIN users nu ON nu.username = 'ds.quang'
JOIN staff_profiles n ON n.user_id = nu.id
SET t.doctor_id = n.id;

-- 3. Xóa lịch trực, hồ sơ nhân viên, vai trò và tài khoản trùng
DELETE ss FROM staff_schedules ss
JOIN staff_profiles sp ON sp.id = ss.staff_id
JOIN users u ON u.id = sp.user_id
WHERE u.username IN ('bacsi', 'duocsi');

DELETE sp FROM staff_profiles sp
JOIN users u ON u.id = sp.user_id
WHERE u.username IN ('bacsi', 'duocsi');

DELETE ur FROM user_roles ur
JOIN users u ON u.id = ur.user_id
WHERE u.username IN ('bacsi', 'duocsi');

DELETE FROM users WHERE username IN ('bacsi', 'duocsi');
