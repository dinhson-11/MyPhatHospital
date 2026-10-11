-- =============================================================
-- KHÓA / ĐỔI MẬT KHẨU các tài khoản mẫu trước khi dùng CSDL thật.
-- Các migration Flyway (V10, V13, V15, V16) tạo sẵn tài khoản mẫu với mật khẩu CÔNG KHAI trong README
-- (admin / Admin@123, letan / Receptionist@123, ...). Trên DB thật điều này là lỗ hổng nghiêm trọng.
--
-- Chạy SAU lần khởi động backend đầu tiên (khi Flyway đã tạo xong bảng):
--   mysql -u hmsai_user -p hmsai_db < scripts/db/02_lock_demo_accounts.sql
--
-- Thứ tự an toàn:
--   1. Tạo tài khoản ADMIN THẬT của bệnh viện: đăng nhập `admin` -> Bảng điều khiển quản trị -> tab "Tài khoản"
--      -> "Thêm tài khoản" (vai trò Quản trị viên); hoặc API `POST /api/v1/users` qua Swagger UI (/swagger-ui.html);
--      hoặc đổi mật khẩu `admin` ở bước 1 bên dưới.
--   2. Đăng nhập thử bằng tài khoản thật.
--   3. Khóa các tài khoản mẫu (bước 2).
-- Lưu ý: bước 2 dùng trạng thái LOCKED (không xóa) để giữ nguyên lịch sử khám/hóa đơn nếu có.
-- =============================================================

-- Bước 1 (tùy chọn): đổi mật khẩu admin mẫu. Sinh BCrypt hash bằng một trong các cách:
--   * docker run --rm httpd:2 htpasswd -nbBC 10 "" 'MatKhauMoi' | tr -d ':\n' | sed 's/$2y/$2a/'
--   * https://bcrypt-generator.com  (cost 10, tiền tố $2a$)
-- UPDATE users SET password_hash = '<BCRYPT_HASH>' WHERE username = 'admin';

-- Bước 2: khóa mọi tài khoản mẫu (KHÔNG khóa `admin` nếu bạn đang dùng nó làm quản trị thật)
UPDATE users
   SET status = 'LOCKED'
 WHERE username IN ('letan', 'ketoan', 'dieuduong', 'benhnhan',
                    'bacsi', 'duocsi',
                    'bs.maianh', 'bs.nga', 'bs.vy', 'bs.dung', 'bs.sy', 'bs.hiep', 'bs.an', 'bs.toan',
                    'ds.quang');

SELECT username, status FROM users ORDER BY id;
