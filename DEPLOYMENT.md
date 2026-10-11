# 🚀 Hướng dẫn Deploy – Mỹ Phát Hospital

## ⚠️ Trước khi push lên GitHub

1. **Tạo JWT_SECRET mạnh** (bắt buộc):
   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
   ```
   ```bash
   # Linux / Mac
   openssl rand -base64 32
   ```

2. **Cấu hình file `.env`** (từ `.env.example`):
   ```bash
   cp .env.example .env
   # Mở .env và điền JWT_SECRET, MYSQL_PASSWORD thật
   ```
   Chọn nguồn cơ sở dữ liệu trong `.env`: giữ `COMPOSE_PROFILES=local-db` để chạy MySQL đóng gói trong Docker, hoặc bỏ dòng đó và đặt `MYSQL_HOST/MYSQL_PORT/MYSQL_DB` để dùng **MySQL thật** (xem phần "Cơ sở dữ liệu thật" bên dưới).

3. **Kiểm tra không có secret bị commit**:
   ```bash
   git status              # .env KHÔNG được xuất hiện trong danh sách
   git diff --staged       # Không có password/secret trong staged files
   ```

---

## 🌐 Các lựa chọn Deploy miễn phí

### Option 1: Railway.app (⭐ Khuyến nghị nhất)

**Railway** hỗ trợ Docker Compose, MySQL, có free tier 5$/tháng credit.

```bash
# 1. Đăng ký tại https://railway.app
# 2. Kết nối GitHub repo
# 3. New Project → Deploy from GitHub repo
# 4. Add MySQL service từ Railway marketplace
# 5. Cấu hình Environment Variables trong Railway dashboard:
#    JWT_SECRET = <generated>
#    MYSQL_HOST / MYSQL_PORT / MYSQL_DB = <từ Railway MySQL>   (KHÔNG đặt COMPOSE_PROFILES)
#    MYSQL_USER = <từ Railway MySQL>
#    MYSQL_PASSWORD = <từ Railway MySQL>
#    MYSQL_SSL_MODE = REQUIRED
#    VITE_API_BASE_URL = https://<your-backend>.railway.app/api/v1
```

**Lưu ý Railway**:
- Mỗi service (backend, frontend, ai-service) deploy riêng
- Dùng `RAILWAY_STATIC_URL` cho frontend
- MySQL connection string lấy từ Railway dashboard

---

### Option 2: Render.com

**Render** hỗ trợ Docker, có free tier (spin down sau 15 phút idle).

```bash
# 1. Đăng ký tại https://render.com
# 2. New → Web Service → Connect GitHub
# 3. Chọn từng service (backend / frontend)
# 4. Set Environment Variables trong Render dashboard
# 5. Free MySQL: dùng PlanetScale (free) hoặc Render PostgreSQL (convert sang PostgreSQL)
```

**Blueprint file** (`render.yaml`) nếu muốn deploy tự động — tạo sau khi có repo.

---

### Option 3: Fly.io

**Fly.io** hỗ trợ Docker tốt, free tier 3 shared VMs.

```bash
# Cài flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd backend
fly launch --name myphat-backend --dockerfile Dockerfile

# Deploy frontend
cd ../frontend
fly launch --name myphat-frontend --dockerfile Dockerfile

# Set secrets
fly secrets set JWT_SECRET=<your-secret> --app myphat-backend
fly secrets set MYSQL_PASSWORD=<your-password> --app myphat-backend
fly secrets set MYSQL_HOST=<host> MYSQL_PORT=3306 MYSQL_DB=hmsai_db MYSQL_USER=<user> MYSQL_SSL_MODE=REQUIRED --app myphat-backend
```

---

### Option 4: VPS + Docker (Ổn định nhất cho production)

Dùng free VPS: **Oracle Cloud Free Tier** (2 VMs vĩnh viễn miễn phí) hoặc **Google Cloud Free Tier**.

```bash
# Trên VPS sau khi clone repo:
cp .env.example .env
nano .env                          # Điền secrets thật

# Generate JWT_SECRET
openssl rand -base64 32

# Chạy toàn bộ hệ thống
docker compose up -d --build

# Kiểm tra
docker compose ps
docker compose logs -f backend
```

**Cấu hình Nginx reverse proxy** (nếu muốn HTTPS):
```nginx
server {
    listen 443 ssl;
    server_name myphathospital.com;
    
    location /api/ {
        proxy_pass http://localhost:8080;
    }
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## 🗄️ Cơ sở dữ liệu thật

Backend (profile `prod` trong Docker) đọc kết nối từ biến môi trường, không đặt cứng trong mã:

| Biến | Ý nghĩa | Mặc định |
|------|---------|----------|
| `MYSQL_HOST` | Máy chủ MySQL | `mysql` (container đóng gói) |
| `MYSQL_PORT` | Cổng | `3306` |
| `MYSQL_DB` | Tên database | `hmsai_db` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Tài khoản ứng dụng | `hmsai_user` / (đặt trong `.env`) |
| `MYSQL_SSL_MODE` | `DISABLED`, `PREFERRED`, `REQUIRED`, `VERIFY_CA`, `VERIFY_IDENTITY` | `PREFERRED` |

Các bước dùng DB thật:

1. Trên MySQL 8 thật, chạy [`scripts/db/01_create_database.sql`](scripts/db/01_create_database.sql) bằng tài khoản root (sau khi thay mật khẩu) để tạo `hmsai_db` và tài khoản `hmsai_user` (host `%` và `localhost`).
2. Trong `.env`: xóa/chú thích `COMPOSE_PROFILES=local-db`, đặt `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SSL_MODE`.
   - MySQL cài trên **chính máy chạy Docker**: `MYSQL_HOST=host.docker.internal`. Không dùng `localhost` vì trong container đó là chính container backend.
   - MySQL trên máy khác hoặc dịch vụ cloud: dùng tên miền/IP, mở cổng 3306 cho máy chủ ứng dụng và dùng `MYSQL_SSL_MODE=REQUIRED`.
3. `docker compose up -d --build`. Flyway tự tạo schema (V1 → V23) ở lần chạy đầu và chỉ chạy phần còn thiếu ở các lần sau.
4. Chạy [`scripts/db/02_lock_demo_accounts.sql`](scripts/db/02_lock_demo_accounts.sql) để đổi mật khẩu `admin` và khóa các tài khoản mẫu (mật khẩu của chúng công khai trong README).
5. **Sao lưu định kỳ** bằng `mysqldump --single-transaction hmsai_db > backup.sql`, và luôn sao lưu trước khi nâng cấp phiên bản vì các migration có thể sửa dữ liệu.

> Flyway chỉ nên trỏ vào database trống hoặc database đã do Flyway quản lý. Nếu DB đã chạy bản V20 cũ và báo `checksum mismatch`, chạy `flyway repair` rồi khởi động lại.

---

## 📋 Checklist trước khi push GitHub

- [ ] `.env` KHÔNG có trong `git status`
- [ ] `JWT_SECRET` trong `.env.example` là placeholder, không phải secret thật
- [ ] `application-prod.yml` không có secret hardcoded
- [ ] `docker-compose.yml` không có secret hardcoded
- [ ] Trước khi dùng DB thật: đã chạy `scripts/db/02_lock_demo_accounts.sql` (khóa tài khoản mẫu)
- [ ] `CORS_ALLOWED_ORIGINS` chỉ gồm địa chỉ thật của giao diện web (mặc định chỉ có localhost); không dùng `*`
- [ ] Cân nhắc `SWAGGER_ENABLED=false` để không công khai tài liệu API
- [ ] Trước khi dùng DB thật: `VITE_SHOW_DEMO_ACCOUNTS=false` trong `.env` rồi build lại frontend (`docker compose up -d --build frontend`) để form đăng nhập không hiển thị tài khoản demo
- [ ] `node_modules/` và `target/` không được tracked
- [ ] `*.joblib` (ML model) không được tracked

```bash
# Chạy lệnh này để kiểm tra lần cuối trước khi push:
git status
git ls-files | Select-String -Pattern "\.env$|password|secret" -CaseSensitive:$false
```

---

## 🔗 Tài nguyên

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Fly.io Docs](https://fly.io/docs)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [PlanetScale (Free MySQL)](https://planetscale.com)
