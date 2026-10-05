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
#    MYSQL_USER = <từ Railway MySQL>
#    MYSQL_PASSWORD = <từ Railway MySQL>
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
docker-compose up -d --build

# Kiểm tra
docker-compose ps
docker-compose logs -f backend
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

## 📋 Checklist trước khi push GitHub

- [ ] `.env` KHÔNG có trong `git status`
- [ ] `JWT_SECRET` trong `.env.example` là placeholder, không phải secret thật
- [ ] `application-prod.yml` không có secret hardcoded
- [ ] `docker-compose.yml` không có secret hardcoded
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
