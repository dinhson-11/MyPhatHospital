#!/usr/bin/env bash
# =============================================================
# Cài đặt & chạy Mỹ Phát Hospital trên MỘT máy ảo Ubuntu (Oracle Cloud Always Free hoặc VPS bất kỳ).
# Chạy trên máy ảo, không phải máy Windows của bạn:
#
#   curl -fsSL https://raw.githubusercontent.com/dinhson-11/MyPhatHospital/main/scripts/deploy/oracle-setup.sh -o setup.sh
#   bash setup.sh                      # truy cập bằng http://<IP>
#   bash setup.sh myphat.duckdns.org   # có tên miền -> tự bật HTTPS (Caddy)
#
# Chạy lại an toàn (idempotent): giữ nguyên .env và mật khẩu đã sinh; chỉ cập nhật mã nguồn và build lại.
# =============================================================
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${REPO_URL:-https://github.com/dinhson-11/MyPhatHospital.git}"
APP_DIR="${APP_DIR:-$HOME/MyPhatHospital}"
HARDEN_MARK="$HOME/.myphat_admin_hardened"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[x] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] && die "Đừng chạy bằng root. Dùng user thường (ubuntu), script sẽ tự gọi sudo khi cần."
command -v sudo >/dev/null || die "Thiếu sudo."

# ---------- 1. Tường lửa hệ điều hành ----------
# Ubuntu trên Oracle có sẵn luật iptables chặn mọi cổng ngoài 22. (Cần thêm Ingress Rule 80/443 ở Security List trên web Oracle.)
log "Mở cổng 80/443 trên iptables"
for port in 80 443; do
  sudo iptables -C INPUT -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT
done
if ! command -v netfilter-persistent >/dev/null; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent
fi
sudo netfilter-persistent save >/dev/null

# ---------- 2. Docker + git ----------
if ! command -v docker >/dev/null; then
  log "Cài Docker"
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git openssl curl >/dev/null
sudo usermod -aG docker "$USER" || true
# Phiên hiện tại chưa nhận nhóm docker -> dùng sudo cho docker trong script
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"

# ---------- 3. Mã nguồn ----------
if [ -d "$APP_DIR/.git" ]; then
  log "Cập nhật mã nguồn"
  git -C "$APP_DIR" pull --ff-only
else
  log "Tải mã nguồn"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ---------- 4. File .env (chỉ tạo lần đầu để KHÔNG đổi mật khẩu DB đã khởi tạo) ----------
set_env() { # set_env KEY VALUE  -> thay dòng KEY=... hoặc thêm mới
  local k="$1" v="$2"
  if grep -qE "^#?[[:space:]]*${k}=" .env; then
    # dùng | làm dấu phân cách vì base64 có chứa /
    sed -i -E "s|^#?[[:space:]]*${k}=.*|${k}=${v}|" .env
  else
    printf '%s=%s\n' "$k" "$v" >> .env
  fi
}

PUBLIC_IP="$(curl -fsS https://api.ipify.org || echo "<IP-máy-ảo>")"
if [ -n "$DOMAIN" ]; then ORIGIN="https://$DOMAIN"; else ORIGIN="http://$PUBLIC_IP"; fi

if [ ! -f .env ]; then
  log "Tạo .env với mật khẩu ngẫu nhiên"
  cp .env.example .env
  chmod 600 .env
  set_env COMPOSE_PROFILES         local-db
  set_env MYSQL_ROOT_PASSWORD      "$(openssl rand -hex 24)"
  set_env MYSQL_PASSWORD           "$(openssl rand -hex 24)"
  set_env JWT_SECRET               "$(openssl rand -base64 48 | tr -d '\n')"
  set_env VIETQR_DEMO              false
else
  warn ".env đã có: giữ nguyên mật khẩu hiện tại."
fi

# Các giá trị phụ thuộc vị trí triển khai: luôn cập nhật theo lần chạy này
set_env FRONTEND_PORT            3000
set_env BACKEND_PORT             127.0.0.1:8080     # chỉ nội bộ, không mở ra internet
set_env MYSQL_HOST_PORT          127.0.0.1:3308     # DB không mở ra internet
set_env VITE_API_BASE_URL        /api/v1            # Nginx của frontend chuyển tiếp tới backend -> không cần CORS
set_env VITE_SHOW_DEMO_ACCOUNTS  false
set_env SWAGGER_ENABLED          false
set_env CORS_ALLOWED_ORIGINS     "$ORIGIN"
if [ -z "$DOMAIN" ]; then
  # Không có HTTPS: frontend lắng nghe trực tiếp cổng 80
  set_env FRONTEND_PORT 80
fi

# ---------- 5. Build & chạy ----------
log "Build và khởi động (lần đầu mất 5-10 phút)"
$DOCKER compose up -d --build

log "Chờ backend sẵn sàng (Flyway đang tạo schema)"
ok=0
for i in $(seq 1 60); do
  if $DOCKER compose exec -T backend wget -qO- http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then ok=1; break; fi
  sleep 5
done
[ "$ok" -eq 1 ] || { $DOCKER compose logs --tail=60 backend; die "Backend không lên sau 5 phút. Xem log ở trên."; }

# ---------- 6. HTTPS bằng Caddy (nếu có tên miền) ----------
if [ -n "$DOMAIN" ]; then
  log "Cấu hình HTTPS cho $DOMAIN"
  if ! command -v caddy >/dev/null; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https gpg
    curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -y -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy
  fi
  printf '%s {\n    reverse_proxy localhost:3000\n}\n' "$DOMAIN" | sudo tee /etc/caddy/Caddyfile >/dev/null
  sudo systemctl restart caddy
fi

# ---------- 7. Chốt bảo mật tài khoản demo (chỉ chạy một lần) ----------
# Migration Flyway tạo sẵn tài khoản mẫu với mật khẩu công khai (admin / Admin@123 ...).
# Đổi mật khẩu admin sang chuỗi ngẫu nhiên và khóa các tài khoản mẫu còn lại.
if [ ! -f "$HARDEN_MARK" ]; then
  log "Đổi mật khẩu admin và khóa tài khoản demo"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=\n')A9!"   # đủ chữ hoa/thường/số/ký tự đặc biệt
  HASH="$($DOCKER run --rm httpd:2 htpasswd -nbBC 10 "" "$ADMIN_PASS" | tr -d ':\n' | sed 's/^\$2y/$2a/')"
  case "$HASH" in '$2a$'*) ;; *) die "Không sinh được BCrypt hash." ;; esac

  # Không `source .env`: các giá trị có khoảng trắng (VIETQR_BANK_NAME=MB Bank) sẽ làm script lỗi
  env_get() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2-; }
  MYSQL_USER="$(env_get MYSQL_USER)"; MYSQL_PASSWORD="$(env_get MYSQL_PASSWORD)"
  {
    printf "UPDATE users SET password_hash = '%s' WHERE username = 'admin';\n" "$HASH"
    sed -e '/^--/d' -e '/^SELECT /d' scripts/db/02_lock_demo_accounts.sql
    printf "SELECT username, status FROM users ORDER BY id;\n"
  } | $DOCKER exec -i -e MYSQL_PWD="$MYSQL_PASSWORD" hmsai-mysql mysql -u "${MYSQL_USER:-hmsai_user}" hmsai_db

  umask 077
  printf 'Tài khoản quản trị: admin\nMật khẩu: %s\n' "$ADMIN_PASS" > "$HARDEN_MARK"
  warn "Mật khẩu admin đã được lưu tại $HARDEN_MARK (chỉ bạn đọc được). Đăng nhập xong hãy đổi lại và xóa file này."
fi

# ---------- 8. Tổng kết ----------
log "Hoàn tất"
$DOCKER compose ps
cat <<EOF

  Địa chỉ:       $ORIGIN
  Tài khoản:     xem  cat $HARDEN_MARK
  Cấu hình:      $APP_DIR/.env   (điền VIETQR_* nếu cần thu tiền QR, rồi: docker compose up -d)
  Cập nhật bản:  bash setup.sh${DOMAIN:+ $DOMAIN}
  Sao lưu DB:    docker exec hmsai-mysql sh -c 'mysqldump -u root -p"\$MYSQL_ROOT_PASSWORD" hmsai_db' > backup_\$(date +%F).sql

EOF
