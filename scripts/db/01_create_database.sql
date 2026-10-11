-- =============================================================
-- Tạo database + tài khoản ứng dụng cho HMS-AI trên MySQL 8 THẬT.
-- Chạy MỘT LẦN bằng tài khoản quản trị (root) của máy chủ MySQL:
--   mysql -u root -p < scripts/db/01_create_database.sql
-- TRƯỚC KHI CHẠY: thay <MAT_KHAU_MANH> bằng mật khẩu mạnh, giống MYSQL_PASSWORD trong .env.
-- Schema do Flyway tự tạo khi backend khởi động lần đầu (V1 -> V23) – KHÔNG chạy schema.sql.
-- =============================================================

CREATE DATABASE IF NOT EXISTS hmsai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Backend chạy trong Docker kết nối từ địa chỉ mạng của Docker, KHÔNG phải 'localhost',
-- nên tài khoản phải cho phép host '%' (hoặc thu hẹp lại theo dải IP của máy chủ ứng dụng).
CREATE USER IF NOT EXISTS 'hmsai_user'@'%'         IDENTIFIED BY '<MAT_KHAU_MANH>';
CREATE USER IF NOT EXISTS 'hmsai_user'@'localhost' IDENTIFIED BY '<MAT_KHAU_MANH>';

-- Flyway cần quyền DDL (tạo/sửa bảng) trên đúng database này; không cấp quyền trên database khác.
GRANT ALL PRIVILEGES ON hmsai_db.* TO 'hmsai_user'@'%';
GRANT ALL PRIVILEGES ON hmsai_db.* TO 'hmsai_user'@'localhost';
FLUSH PRIVILEGES;
