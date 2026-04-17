# Triển khai Agribank Digital Signage lên server offline (Docker Desktop trên Windows)

## Context

Ứng dụng `Agribank-Digital-Signage` (full-stack TypeScript, Node 22 + Prisma 7 + React 18 + Socket.io) cần được triển khai lên một Windows Server **không có internet** nhưng đã cài sẵn: Node 22.17.1, Docker Desktop, Nginx, PostgreSQL 17. Luồng: build image ở máy dev (có internet) → `docker save` → copy tar sang server → `docker load` → chạy qua `docker compose`.

Thiết kế quyết định:
- **Chỉ đóng gói app vào container** (1 service duy nhất). PostgreSQL 17 và Nginx dùng bản cài sẵn trên host → giảm kích thước file chuyển, tận dụng setup DBA sẵn có.
- Server dùng **Windows Server**, IP nằm trong dải `10.190.x.x` → **không cần sửa CORS** (regex hiện tại ở `src/server/app.ts:32` và `src/server/websocket/handler.ts:29` vẫn hợp lệ).
- Seed admin (`quantri` / `Dientoan@6421`) được **bundle thành `dist/seed.js`** bằng esbuild để chạy được trong image runtime (không có `tsx` + `src/db/seed.ts` trong final stage).

Repo đã có sẵn bộ file hỗ trợ offline: `Dockerfile`, `docker-compose.offline.yml`, `.env.docker.offline.example`, `.dockerignore`, `nginx.conf.example`, `docs/DEPLOYMENT_OFFLINE_DOCKER.md`. Plan này hoàn thiện các file đó, đặc biệt fix 1 lỗ hổng (seed.ts không có trong image) và thêm healthcheck.

---

## A. Thay đổi file trong repo (máy dev, trước khi build)

### A.1 `Dockerfile` — sửa để bundle seed và thêm HEALTHCHECK

File: `/home/thinh77/Projects/Agribank-Digital-Signage/Dockerfile`

Sửa builder stage: thêm bước esbuild bundle seed sau `pnpm run build`:

```dockerfile
RUN pnpm run build
RUN pnpm exec esbuild src/db/seed.ts \
      --bundle --platform=node --target=node20 \
      --outfile=dist/seed.js --format=esm --packages=external
```

Sửa runtime stage: thêm `curl` cho healthcheck và directive HEALTHCHECK:

```dockerfile
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN apk add --no-cache curl                                   # NEW
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN pnpm exec prisma generate

RUN mkdir -p /app/uploads                                      # NEW
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server/index.js"]
```

Giữ nguyên `--shamefully-hoist` vì đang đi chung với setup hiện tại — không thay đổi hành vi install.

### A.2 `docker-compose.offline.yml` — thêm healthcheck + logging

File: `/home/thinh77/Projects/Agribank-Digital-Signage/docker-compose.offline.yml` (hiện có 15 dòng, bổ sung block healthcheck & logging):

```yaml
services:
  app:
    image: ${APP_IMAGE:-agribank-digital-signage:1.0.0}
    container_name: agribank-signage-app
    restart: unless-stopped
    command: sh -c "pnpm exec prisma migrate deploy && node dist/server/index.js"
    ports:
      - "3000:3000"
    env_file:
      - .env.docker.offline
    volumes:
      - ./uploads:/app/uploads
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### A.3 Giữ nguyên (không cần đổi)

- `.dockerignore` — đã hợp lý (14 dòng, loại `node_modules`, `dist`, `uploads`, `.git`, `docs`, `Dockerfile*`, `docker-compose*.yml`, `.env*`).
- `.env.docker.offline.example` — đã đầy đủ biến môi trường cần thiết.
- `src/server/app.ts:32` và `src/server/websocket/handler.ts:29` — CORS regex đã đúng (IP server trong `10.190.x.x`).
- `nginx.conf.example` — đã có template sẵn cho Windows.

---

## B. Build image (trên máy dev có internet)

Từ thư mục `/home/thinh77/Projects/Agribank-Digital-Signage/`:

```bash
# 1. Dọn artifact cũ (optional)
rm -rf dist node_modules/.cache

# 2. Build image cho target linux/amd64 (Windows Docker Desktop dùng WSL2/Hyper-V = amd64)
VERSION=1.0.0
docker buildx build \
  --platform linux/amd64 \
  --load \
  -t agribank-digital-signage:${VERSION} \
  -f Dockerfile .

# 3. Export thành tar.gz
docker save agribank-digital-signage:${VERSION} \
  | gzip -9 > agribank-digital-signage-${VERSION}.tar.gz

# 4. Sinh checksum
sha256sum agribank-digital-signage-${VERSION}.tar.gz \
  > agribank-digital-signage-${VERSION}.tar.gz.sha256

# 5. Kiểm tra kích thước (kỳ vọng ~250–350 MB)
ls -lh agribank-digital-signage-${VERSION}.tar.gz
```

### Bộ file cần copy sang server (qua USB/ổ nội bộ)

```
deploy/
├── agribank-digital-signage-1.0.0.tar.gz
├── agribank-digital-signage-1.0.0.tar.gz.sha256
├── docker-compose.offline.yml            # từ repo
├── .env.docker.offline.example           # template, sẽ điền giá trị thật trên server
└── nginx.conf.example                    # từ repo
```

---

## C. Chuẩn bị server Windows (một lần)

### C.1 Tạo database trong PostgreSQL 17 host

Mở **SQL Shell (psql)** (StartMenu → PostgreSQL 17 → SQL Shell), đăng nhập bằng user `postgres`:

```sql
CREATE ROLE signage_app WITH LOGIN PASSWORD 'MAT_KHAU_MANH_O_DAY';
CREATE DATABASE digital_signage OWNER signage_app ENCODING 'UTF8';
\c digital_signage
GRANT ALL ON SCHEMA public TO signage_app;
```

Verify:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://signage_app:MAT_KHAU_MANH_O_DAY@localhost:5432/digital_signage" -c "SELECT current_user, current_database();"
```

### C.2 Cho phép container kết nối vào PostgreSQL host

Sửa `C:\Program Files\PostgreSQL\17\data\postgresql.conf`:
```
listen_addresses = '*'
```

Sửa `C:\Program Files\PostgreSQL\17\data\pg_hba.conf` — thêm **trước** các dòng `reject` (nếu có):
```
# Docker Desktop bridge networks — Agribank signage
host    digital_signage   signage_app   172.16.0.0/12    scram-sha-256
host    digital_signage   signage_app   127.0.0.1/32     scram-sha-256
```

Restart PostgreSQL (PowerShell Admin):
```powershell
Restart-Service postgresql-x64-17
```

### C.3 Cấu hình Windows Firewall

Mở inbound port 80 cho LAN (để LED screen và admin truy cập qua Nginx). **Không** mở 5432 ra LAN (chỉ Docker bridge cần).

```powershell
New-NetFirewallRule -DisplayName "Agribank Signage HTTP" `
  -Direction Inbound -Protocol TCP -LocalPort 80 `
  -RemoteAddress 10.190.0.0/16 -Action Allow
```

### C.4 Tạo thư mục triển khai

```powershell
New-Item -Type Directory -Force -Path C:\agribank-signage\uploads, C:\agribank-signage\images | Out-Null
```

Sau đó copy từ USB vào:
```
C:\agribank-signage\
├── docker-compose.offline.yml
├── .env.docker.offline            # sẽ tạo từ example trong C.5
├── uploads\                       # trống, sẽ tự fill sau khi upload media
└── images\
    ├── agribank-digital-signage-1.0.0.tar.gz
    └── agribank-digital-signage-1.0.0.tar.gz.sha256
```

### C.5 Sinh JWT_SECRET và tạo `.env.docker.offline`

PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy `.env.docker.offline.example` → `.env.docker.offline` (`C:\agribank-signage\.env.docker.offline`), điền:
```
APP_IMAGE=agribank-digital-signage:1.0.0
DATABASE_URL=postgresql://signage_app:MAT_KHAU_MANH_O_DAY@host.docker.internal:5432/digital_signage
PORT=3000
NODE_ENV=production
JWT_SECRET=<dán 96 ký tự hex từ lệnh trên>
JWT_EXPIRES_IN=24h
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_VIDEO=524288000
MAX_FILE_SIZE_IMAGE=10485760
```

### C.6 Cấu hình Nginx

Copy nội dung `nginx.conf.example` vào cấu hình Nginx đang dùng (thường `C:\nginx\conf\nginx.conf` bên trong block `http { }`). Sửa 2 placeholder:

- `server_name _;` → `server_name 10.190.x.x;` (IP thật của server)
- `alias C:/agribank-signage/uploads/;` — đã đúng layout, giữ nguyên

Test + reload:
```powershell
cd C:\nginx
.\nginx -t
.\nginx -s reload
```

---

## D. Triển khai lần đầu

```powershell
cd C:\agribank-signage

# 1. Verify checksum
Get-FileHash images\agribank-digital-signage-1.0.0.tar.gz -Algorithm SHA256
# So sánh với nội dung file .sha256

# 2. Load image vào Docker Desktop
docker load -i images\agribank-digital-signage-1.0.0.tar.gz
docker image ls   # xác nhận có tag agribank-digital-signage:1.0.0

# 3. Chạy container (prisma migrate deploy tự chạy trước khi start server)
docker compose -f docker-compose.offline.yml --env-file .env.docker.offline up -d

# 4. Theo dõi log đến khi thấy "Server running on ..."
docker compose -f docker-compose.offline.yml logs -f app
# Ctrl+C để thoát sau khi thấy log OK

# 5. Seed user admin (chỉ chạy 1 lần)
docker compose -f docker-compose.offline.yml exec app node dist/seed.js
# Kỳ vọng in: "Seed completed: 1 admin user"
```

Default credentials sau seed: `quantri` / `Dientoan@6421` — **phải đổi mật khẩu ngay sau khi đăng nhập lần đầu** (qua Admin UI).

---

## E. Verification (kiểm tra sau triển khai)

Chạy tuần tự trên server rồi trên máy client trong LAN:

```powershell
# Container có healthy chưa
docker compose -f docker-compose.offline.yml ps
# STATUS phải là (healthy) sau ~40s

# Health endpoint trực tiếp (bypass Nginx)
curl.exe -sS http://127.0.0.1:3000/api/health
# Kỳ vọng: {"status":"ok",...}

# Qua Nginx
curl.exe -sS http://127.0.0.1/api/health

# Login
curl.exe -sS -X POST http://10.190.x.x/api/auth/login `
  -H "Content-Type: application/json" `
  -H "Origin: http://10.190.x.x" `
  -d '{\"username\":\"quantri\",\"password\":\"Dientoan@6421\"}'
# Kỳ vọng có { "token": "...", "user": {...} }
```

Từ trình duyệt trong LAN:
- Admin: `http://10.190.x.x/`
- Player: `http://10.190.x.x/player.html?screen=<uuid>` (UUID lấy từ trang Screen Settings)

Kiểm tra checklist:
- [ ] Đăng nhập Admin thành công
- [ ] Upload 1 file video ≤ 500MB, phát được
- [ ] Player nhận playlist realtime khi đổi order trong Admin (WebSocket)
- [ ] Restart Docker Desktop → container tự lên lại (`restart: unless-stopped`)
- [ ] Restart Windows → container tự lên lại sau khi Docker Desktop start

---

## F. Flow cập nhật phiên bản mới

Mỗi lần release (ví dụ `1.1.0`):

**Máy dev:**
```bash
VERSION=1.1.0
docker buildx build --platform linux/amd64 --load \
  -t agribank-digital-signage:${VERSION} -f Dockerfile .
docker save agribank-digital-signage:${VERSION} | gzip -9 \
  > agribank-digital-signage-${VERSION}.tar.gz
sha256sum agribank-digital-signage-${VERSION}.tar.gz \
  > agribank-digital-signage-${VERSION}.tar.gz.sha256
```

**Server (copy tar + sha256 vào `C:\agribank-signage\images\`):**
```powershell
cd C:\agribank-signage
Get-FileHash images\agribank-digital-signage-1.1.0.tar.gz -Algorithm SHA256  # verify
docker load -i images\agribank-digital-signage-1.1.0.tar.gz

# Đổi APP_IMAGE trong .env.docker.offline thành 1.1.0
(Get-Content .env.docker.offline) `
  -replace '^APP_IMAGE=.*', 'APP_IMAGE=agribank-digital-signage:1.1.0' `
  | Set-Content .env.docker.offline

# Recreate container (migrate deploy chạy tự động)
docker compose -f docker-compose.offline.yml up -d

# Xoá image cũ sau khi đã yên tâm
docker image rm agribank-digital-signage:1.0.0
```

Rollback: đổi `APP_IMAGE` ngược về version cũ và `docker compose up -d`. **Lưu ý**: nếu bản mới có destructive migration, rollback DB cần `pg_restore` từ backup riêng.

---

## G. Rủi ro & lưu ý

| Rủi ro | Mức | Mitigation |
|---|---|---|
| PostgreSQL host từ chối kết nối từ Docker bridge | Cao ở lần đầu | §C.2 thêm `172.16.0.0/12` vào `pg_hba.conf` |
| Prisma engine sai glibc/musl variant | Thấp | `prisma generate` chạy trong runtime stage → engine đúng với alpine |
| Upload volume quyền khác user container | Trung bình | Docker Desktop Windows tự handle qua WSL mount; nếu lỗi, `docker compose exec app chown -R 0:0 /app/uploads` |
| Disk đầy do log container | Thấp | §A.2 đã cap `max-size: 10m, max-file: 3` |
| Image transfer bị corrupt | Thấp | `Get-FileHash` so với file `.sha256` trước khi `docker load` |
| Default password `Dientoan@6421` bị lộ | Cao nếu không đổi | Đổi ngay sau đăng nhập lần đầu qua Admin UI |
| Windows Firewall chặn Docker bridge | Thấp | Docker Desktop tự config; nếu chặn, check rule "vEthernet (WSL)" hoặc "vEthernet (Default Switch)" |

---

## H. Critical files cần sửa / tạo

| Loại | Đường dẫn | Mục đích |
|---|---|---|
| Sửa | `/home/thinh77/Projects/Agribank-Digital-Signage/Dockerfile` | Bundle `dist/seed.js` + HEALTHCHECK + curl |
| Sửa | `/home/thinh77/Projects/Agribank-Digital-Signage/docker-compose.offline.yml` | Thêm healthcheck + logging caps |
| Giữ nguyên | `/home/thinh77/Projects/Agribank-Digital-Signage/.dockerignore` | Đã đủ |
| Giữ nguyên | `/home/thinh77/Projects/Agribank-Digital-Signage/.env.docker.offline.example` | Template đã đủ |
| Giữ nguyên | `/home/thinh77/Projects/Agribank-Digital-Signage/nginx.conf.example` | Dùng được ngay, chỉ đổi `server_name` trên server |
| Tạo trên server | `C:\agribank-signage\.env.docker.offline` | Điền giá trị thật |
| Tạo trên server | `C:\agribank-signage\uploads\` | Volume persistent |
| Sửa trên server | `C:\Program Files\PostgreSQL\17\data\postgresql.conf` | `listen_addresses = '*'` |
| Sửa trên server | `C:\Program Files\PostgreSQL\17\data\pg_hba.conf` | Cho phép Docker bridge kết nối |
| Sửa trên server | `C:\nginx\conf\nginx.conf` | Đổi `server_name` sang IP thật |

---

## I. Cheat-sheet

### Máy dev (mỗi release)

```bash
VERSION=1.0.0
docker buildx build --platform linux/amd64 --load \
  -t agribank-digital-signage:${VERSION} -f Dockerfile .
docker save agribank-digital-signage:${VERSION} | gzip -9 \
  > agribank-digital-signage-${VERSION}.tar.gz
sha256sum agribank-digital-signage-${VERSION}.tar.gz \
  > agribank-digital-signage-${VERSION}.tar.gz.sha256
```

### Server Windows (deploy lần đầu)

```powershell
cd C:\agribank-signage
Get-FileHash images\agribank-digital-signage-1.0.0.tar.gz -Algorithm SHA256
docker load -i images\agribank-digital-signage-1.0.0.tar.gz
docker compose -f docker-compose.offline.yml --env-file .env.docker.offline up -d
docker compose -f docker-compose.offline.yml exec app node dist/seed.js
curl.exe -fsS http://127.0.0.1:3000/api/health
```

### Server Windows (upgrade)

```powershell
cd C:\agribank-signage
docker load -i images\agribank-digital-signage-1.1.0.tar.gz
(Get-Content .env.docker.offline) -replace '^APP_IMAGE=.*','APP_IMAGE=agribank-digital-signage:1.1.0' | Set-Content .env.docker.offline
docker compose -f docker-compose.offline.yml up -d
```
