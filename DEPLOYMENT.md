# Hướng dẫn deploy – Mỹ Phát Hospital

Hệ thống gồm 4 phần: **frontend** (React/Vite + Nginx), **backend** (Spring Boot 17, cổng 8080), **ai-service** (FastAPI, cổng 8000) và **MySQL 8** (schema do Flyway tự tạo khi backend khởi động).

> Thông tin gói miễn phí của các nhà cung cấp thay đổi thường xuyên. Trước khi đăng ký, hãy mở trang giá của họ để xác nhận hạn mức hiện tại.

## 1. Chọn phương án

| | **Phương án A – 1 máy ảo (khuyến nghị)** | **Phương án B – tách dịch vụ** |
|---|---|---|
| Nền tảng | Oracle Cloud *Always Free* VM | Cloudflare Pages/Vercel + Render + Aiven MySQL |
| Chi phí | 0đ, không giới hạn thời gian | 0đ |
| Chạy 24/7 | Có | Không: Render *free* ngủ sau ~15 phút không có truy cập, lần gọi đầu mất ~30–60 giây |
| Độ khó | Trung bình (dùng SSH + Docker) | Dễ (chỉ thao tác trên web) |
| Điểm yếu | Cần thẻ quốc tế để xác minh; đôi khi hết máy ở khu vực bạn chọn | Backend Java chỉ có 512 MB RAM, AI service bị chậm lần đầu |

**Chọn A** nếu muốn hệ thống chạy ổn định để demo/bảo vệ. **Chọn B** nếu không có thẻ quốc tế hoặc chỉ cần bản thử.

Các nền tảng khác đáng cân nhắc: **Google Cloud e2-micro** (VM miễn phí vĩnh viễn nhưng chỉ 1 GB RAM, chạy được nhưng sát giới hạn), **Hugging Face Spaces** (chạy Docker miễn phí, hợp với riêng ai-service), **TiDB Cloud Serverless** (MySQL tương thích, miễn phí; cần thử Flyway trước).
Không còn gói miễn phí thật sự ở Railway (chỉ có credit dùng thử) và Heroku.

---

## 2. Việc cần làm trước mọi phương án

### 2.1. Tạo `JWT_SECRET` và mật khẩu mạnh

```powershell
# Windows PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```
```bash
# Linux / macOS
openssl rand -base64 48
```
Chạy 2 lần: một lần cho `JWT_SECRET`, một lần cho `MYSQL_PASSWORD`. Lưu vào trình quản lý mật khẩu, **không** commit.

### 2.2. Biến môi trường quan trọng

| Biến | Ý nghĩa | Giá trị khi chạy thật |
|---|---|---|
| `JWT_SECRET` | Khóa ký token (bắt buộc) | Chuỗi ngẫu nhiên ≥ 48 ký tự |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DB` | Địa chỉ DB | Tùy phương án |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Tài khoản DB (không dùng root) | Mật khẩu mạnh |
| `MYSQL_SSL_MODE` | Mã hóa kết nối DB | `REQUIRED` với DB trên cloud |
| `CORS_ALLOWED_ORIGINS` | Domain frontend được gọi API | `https://ten-mien-cua-ban` |
| `SWAGGER_ENABLED` | Tài liệu API công khai | `false` |
| `VITE_API_BASE_URL` | URL API mà **trình duyệt** gọi, nhúng lúc build | Xem từng phương án |
| `VITE_SHOW_DEMO_ACCOUNTS` | Hiện tài khoản demo ở form đăng nhập | `false` |
| `VIETQR_*`, `VIETQR_DEMO` | Tài khoản nhận tiền VietQR | Tài khoản thật, `VIETQR_DEMO=false` |
| `LLM_API_KEY` | Khóa LLM cho chatbot (tùy chọn) | Để trống thì chatbot dùng luật từ khóa |

### 2.3. Khóa tài khoản demo (bắt buộc)

Các migration Flyway tạo sẵn tài khoản mẫu với **mật khẩu công khai** trong README (`admin / Admin@123`, …). Sau lần khởi động backend đầu tiên:

1. Đăng nhập `admin` → *Bảng điều khiển quản trị* → *Tài khoản* → tạo tài khoản quản trị thật, hoặc đổi mật khẩu `admin` bằng hash BCrypt (hướng dẫn trong [scripts/db/02_lock_demo_accounts.sql](scripts/db/02_lock_demo_accounts.sql)).
2. Đăng nhập thử bằng tài khoản thật.
3. Chạy `scripts/db/02_lock_demo_accounts.sql` trên DB để khóa các tài khoản mẫu còn lại.

Không làm bước này thì **bất kỳ ai cũng đăng nhập được với quyền quản trị**.

---

## 3. Phương án A – Oracle Cloud Always Free + Docker Compose

Toàn bộ 4 thành phần chạy trên một máy, frontend (Nginx) tự chuyển tiếp `/api/v1/` đến backend nên **không cần CORS** và chỉ cần mở cổng 80/443.

### Bước 1. Tạo máy ảo
1. Đăng ký tại <https://www.oracle.com/cloud/free/> (cần thẻ để xác minh, không bị trừ tiền nếu chỉ dùng tài nguyên *Always Free*).
2. *Compute → Instances → Create instance*:
   - Image: **Ubuntu 22.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere ARM), 2 OCPU / 12 GB RAM là đủ (hạn mức miễn phí tối đa 4 OCPU / 24 GB).
   - Tải về **SSH private key** khi được hỏi và giữ cẩn thận.
3. Nếu báo *Out of capacity*: thử lại vào giờ khác hoặc chọn Availability Domain khác.
4. Mở cổng: *Networking → VCN → Security List → Add Ingress Rules*, thêm TCP **80** và **443** từ `0.0.0.0/0`.

### Bước 2. Cài Docker trên máy ảo
```bash
ssh -i <file-key> ubuntu@<IP-công-khai>

# Ubuntu của Oracle có tường lửa iptables chặn sẵn: mở 80/443
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```
Các image trong repo (`mysql:8.0`, `eclipse-temurin`, `python`, `nginx`, `node`) đều có bản ARM64 nên chạy được trên Ampere.

### Bước 3. Lấy mã nguồn và cấu hình
```bash
git clone https://github.com/dinhson-11/MyPhatHospital.git
cd MyPhatHospital
cp .env.example .env
nano .env
```
Sửa trong `.env` (giữ `COMPOSE_PROFILES=local-db` để dùng MySQL đóng gói):
```dotenv
COMPOSE_PROFILES=local-db
MYSQL_ROOT_PASSWORD=<mật khẩu mạnh 1>
MYSQL_PASSWORD=<mật khẩu mạnh 2>
JWT_SECRET=<chuỗi ngẫu nhiên>

FRONTEND_PORT=3000
BACKEND_PORT=127.0.0.1:8080     # chỉ cho máy chủ gọi, không lộ ra internet
MYSQL_HOST_PORT=127.0.0.1:3308  # DB không lộ ra internet

VITE_API_BASE_URL=/api/v1       # đường dẫn tương đối, Nginx của frontend chuyển tiếp tới backend
VITE_SHOW_DEMO_ACCOUNTS=false
SWAGGER_ENABLED=false
CORS_ALLOWED_ORIGINS=https://<tên-miền-của-bạn>
VIETQR_DEMO=false
```

### Bước 4. Chạy
```bash
docker compose up -d --build
docker compose ps                 # 4 container, backend phải "healthy"
docker compose logs -f backend    # chờ thấy "Started HmsAiApplication"
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```
Lần đầu build mất 5–10 phút (Maven tải thư viện, huấn luyện mô hình AI).

### Bước 5. Có HTTPS và tên miền miễn phí
1. Đăng ký tên miền miễn phí tại <https://www.duckdns.org> (ví dụ `myphat.duckdns.org`), trỏ về IP công khai của máy ảo.
2. Cài Caddy (tự xin và gia hạn chứng chỉ HTTPS):
   ```bash
   sudo apt install -y caddy
   echo 'myphat.duckdns.org { reverse_proxy localhost:3000 }' | sudo tee /etc/caddy/Caddyfile
   sudo systemctl restart caddy
   ```
3. Mở `https://myphat.duckdns.org`. Nhớ đặt `CORS_ALLOWED_ORIGINS` đúng tên miền này rồi `docker compose up -d`.

### Cập nhật phiên bản mới
```bash
cd ~/MyPhatHospital && git pull
docker compose up -d --build
```

### Sao lưu DB (nên cron hằng ngày)
```bash
docker exec hmsai-mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" hmsai_db' > backup_$(date +%F).sql
```
Máy ảo free có thể bị thu hồi nếu bỏ không, hãy tải bản sao lưu về máy bạn định kỳ.

---

## 4. Phương án B – tách dịch vụ (không cần thẻ quốc tế cho một số bước)

Thứ tự: **DB → AI service → Backend → Frontend**, vì mỗi bước cần địa chỉ của bước trước.

### Bước 1. Database: Aiven for MySQL (gói Free)
1. Đăng ký <https://aiven.io>, tạo dịch vụ **MySQL** chọn plan *Free*.
2. Lấy `Host`, `Port`, `User`, `Password` ở tab *Overview*. Database mặc định là `defaultdb`; tạo DB `hmsai_db` ở tab *Databases* hoặc dùng luôn `defaultdb`.
3. Cần đặt `MYSQL_SSL_MODE=REQUIRED`. Aiven cho gói free tự tắt dịch vụ nếu không dùng lâu, hãy bật lại khi cần.

### Bước 2. AI service: Render (Web Service, Docker)
1. Đẩy code lên GitHub (đã xong), đăng ký <https://render.com> bằng GitHub.
2. *New → Web Service* → chọn repo `MyPhatHospital`.
   - **Root Directory**: `ai-service`
   - **Runtime**: Docker, **Instance Type**: Free
   - Env: `LLM_API_KEY` (tùy chọn)
3. Ghi lại URL, ví dụ `https://myphat-ai.onrender.com`. Kiểm tra `…/health`.

> Backend gọi AI với timeout 3 giây. Khi service đang "ngủ", lần gọi đầu sẽ hết thời gian chờ; các lần sau bình thường.

### Bước 3. Backend: Render (Web Service, Docker)
1. *New → Web Service* → cùng repo.
   - **Root Directory**: `backend`
   - **Runtime**: Docker, **Instance Type**: Free (512 MB)
2. Thêm Environment Variables:

   | Key | Value |
   |---|---|
   | `PORT` | `8080` |
   | `JAVA_TOOL_OPTIONS` | `-Xmx320m -Xss512k -Duser.timezone=Asia/Ho_Chi_Minh` |
   | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD` | từ Aiven |
   | `MYSQL_SSL_MODE` | `REQUIRED` |
   | `JWT_SECRET` | chuỗi ngẫu nhiên |
   | `AI_SERVICE_URL` | URL ở bước 2 |
   | `CORS_ALLOWED_ORIGINS` | điền sau ở bước 4 (tạm để `https://localhost`) |
   | `SWAGGER_ENABLED` | `false` |
   | `VIETQR_*` | tài khoản thật (hoặc để trống để tắt) |

3. Deploy và chờ log có `Started HmsAiApplication`. Kiểm tra `https://<backend>.onrender.com/actuator/health`.
4. Nếu bị *Out of memory*: giảm `-Xmx` xuống `256m` hoặc nâng lên gói trả phí.

### Bước 4. Frontend: Cloudflare Pages (hoặc Vercel)
**Cloudflare Pages**
1. <https://dash.cloudflare.com> → *Workers & Pages → Create → Pages → Connect to Git* → chọn repo.
2. Cấu hình build:
   - Root directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Output directory: `dist`
   - Environment variables: `NODE_VERSION=22`, `VITE_API_BASE_URL=https://<backend>.onrender.com/api/v1`, `VITE_SHOW_DEMO_ACCOUNTS=false`
3. Deploy, lấy URL `https://<tên>.pages.dev`.

**Vercel**: *Add New → Project*, Root Directory `frontend`, Framework *Vite*, thêm 2 biến môi trường như trên. File [frontend/vercel.json](frontend/vercel.json) đã có sẵn quy tắc rewrite cho SPA.

### Bước 5. Chốt CORS
Quay lại Render → backend → sửa `CORS_ALLOWED_ORIGINS=https://<tên>.pages.dev` (không có dấu `/` ở cuối) → *Save* (tự deploy lại).

---

## 5. Kiểm tra sau deploy

- [ ] `https://<domain>` mở được trang chủ, không lỗi đỏ trong tab *Console* của trình duyệt.
- [ ] `GET /actuator/health` trả `UP`.
- [ ] Đăng nhập bằng tài khoản **thật**; thử đăng nhập `admin / Admin@123` phải **thất bại** (sau khi chạy 2.3).
- [ ] Form đăng nhập **không** hiện khối tài khoản demo.
- [ ] Swagger (`/swagger-ui.html`) trả 404 hoặc bị chặn.
- [ ] Đặt lịch khám, khám bệnh, lập hóa đơn và hiện mã VietQR hoạt động.
- [ ] Ngày giờ hiển thị đúng giờ Việt Nam.

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Frontend báo `Network Error`, Console có `CORS` | `CORS_ALLOWED_ORIGINS` sai domain, thừa dấu `/` hoặc thiếu `https://` |
| Frontend vẫn gọi `localhost:8080` | `VITE_API_BASE_URL` được nhúng lúc **build**: đặt lại rồi build lại frontend |
| Backend `JWT_SECRET must be set` | Thiếu biến `JWT_SECRET` |
| Backend `Communications link failure` / SSL | Sai `MYSQL_HOST/PORT`, hoặc cần `MYSQL_SSL_MODE=REQUIRED` |
| Flyway `checksum mismatch` ở V20 | Chạy `flyway repair` (hoặc cập nhật `checksum` của version 20 trong `flyway_schema_history`) |
| Flyway lỗi vì DB không trống | Chỉ trỏ vào DB trống hoặc DB do Flyway quản lý |
| Backend bị kill / `OutOfMemoryError` trên Render free | Giảm `-Xmx`, hoặc chuyển sang phương án A |
| Lần mở đầu tiên rất chậm (phương án B) | Render free đang "ngủ"; dùng <https://uptimerobot.com> ping `/actuator/health` mỗi 10 phút để giữ thức (vẫn có giới hạn giờ chạy miễn phí mỗi tháng) |
| Chatbot trả lời theo luật từ khóa | AI service chưa nạp mô hình: kiểm tra `…/health` có `mlModelLoaded=true` |
