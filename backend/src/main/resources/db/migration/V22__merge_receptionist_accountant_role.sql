-- =============================================
-- V22: Gộp vai trò KẾ TOÁN (ACCOUNTANT) vào LỄ TÂN (RECEPTIONIST)
-- Vai trò sau gộp: RECEPTIONIST = "Lễ tân - Kế toán"
--   (tiếp đón, đặt lịch, thu viện phí, đối soát ca, báo cáo doanh thu).
-- Idempotent: chạy an toàn trên DB đã/chưa có tài khoản Kế toán.
-- =============================================

-- 1. Đổi tên hiển thị của vai trò còn lại
UPDATE roles SET name = 'Lễ tân - Kế toán' WHERE code = 'RECEPTIONIST';

-- 2. Chuyển mọi tài khoản đang giữ vai trò ACCOUNTANT sang RECEPTIONIST (INSERT IGNORE tránh trùng khóa chính)
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT ur.user_id, rec.id
  FROM user_roles ur
  JOIN roles acc ON acc.id = ur.role_id AND acc.code = 'ACCOUNTANT'
  JOIN roles rec ON rec.code = 'RECEPTIONIST';

-- 3. Xóa vai trò ACCOUNTANT (user_roles tham chiếu bị xóa theo ON DELETE CASCADE)
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM (SELECT id FROM roles WHERE code = 'ACCOUNTANT') r);
DELETE FROM roles WHERE code = 'ACCOUNTANT';
