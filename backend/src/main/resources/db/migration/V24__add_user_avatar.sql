-- =============================================
-- V24: Ảnh đại diện tài khoản
-- Ảnh lưu trên Cloudinary (CDN); DB chỉ giữ link hiển thị và mã ảnh (để xóa ảnh cũ).
-- =============================================

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER phone;
ALTER TABLE users ADD COLUMN avatar_public_id VARCHAR(255) NULL AFTER avatar_url;
