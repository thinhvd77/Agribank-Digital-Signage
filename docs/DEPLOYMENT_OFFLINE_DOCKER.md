# Offline Deployment Guide (Docker Image Transfer)

Mục tiêu: build image ở máy có internet, export thành file tar, copy qua máy chủ không internet và chạy bằng Docker Desktop.

## 1) Chuẩn bị trên máy build (có internet)

- Build image ứng dụng từ source hiện tại.
- Gắn tag version rõ ràng (ví dụ `agribank-digital-signage:1.0.0`).
- Export image ra file tar để mang qua server offline.

Khuyến nghị:
- Nếu build machine khác kiến trúc với server, build đúng platform của server (thường `linux/amd64`).
- Lưu checksum (SHA256) cho file tar để kiểm tra toàn vẹn sau khi copy.

## 2) Copy sang máy chủ offline

- Dùng USB/ổ cứng nội bộ hoặc kênh nội bộ air-gapped.
- Chép các file sau vào cùng thư mục triển khai trên server:
  - Image tar đã export
  - `docker-compose.offline.yml`
  - `.env.docker.offline` (tạo từ mẫu)
  - thư mục `uploads/` (nếu đã có dữ liệu media cũ)

## 3) Chuẩn bị cấu hình server offline

1. Tạo `.env.docker.offline` từ `.env.docker.offline.example`.
2. Cập nhật:
   - `DATABASE_URL` trỏ về PostgreSQL 17 trên host
   - `JWT_SECRET` là chuỗi ngẫu nhiên mạnh
   - `APP_IMAGE` đúng tag image đã load
3. Đảm bảo PostgreSQL đã có database `digital_signage` và user/password đúng theo `DATABASE_URL`.

## 4) Load image và chạy container

- Import image tar vào Docker Desktop.
- Chạy compose offline:
  - Service `app` sẽ tự chạy `prisma migrate deploy` trước khi start server.
  - App publish cổng `3000:3000`.
  - Container có healthcheck `/api/health` để theo dõi trạng thái.

## 4.1) Seed admin account (chỉ lần đầu)

- Sau khi container chạy ổn định, seed user mặc định từ script đã bundle trong image:
  - `node dist/seed.js`

## 5) Kết nối Nginx hiện có

Nginx trên host reverse proxy về `http://127.0.0.1:3000`.

Lưu ý cho media:
- Compose mount `./uploads:/app/uploads` để dữ liệu media bền vững.
- Nếu Nginx serve trực tiếp `/uploads`, trỏ `alias` vào đúng thư mục `uploads` trên host.

## 6) Checklist xác nhận sau triển khai

- Health check API trả `ok`.
- Trạng thái container chuyển `healthy`.
- Đăng nhập Admin thành công.
- Upload media và phát Player bình thường.
- WebSocket cập nhật playlist realtime hoạt động.
- Restart Docker Desktop xong container tự lên lại (policy `unless-stopped`).

## 7) Cập nhật phiên bản mới (offline)

Mỗi lần release:
1. Build image mới ở máy có internet.
2. Export tar mới, copy sang server.
3. Load image mới.
4. Cập nhật `APP_IMAGE` trong `.env.docker.offline` nếu đổi tag.
5. Recreate container bằng compose.
