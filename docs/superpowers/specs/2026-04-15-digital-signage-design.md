# Agribank Digital Signage - Design Document

**Date:** 2026-04-15  
**Status:** Approved  
**Author:** Claude Code  

---

## 1. Overview

Hệ thống Digital Signage cho Agribank gồm 2 thành phần chính:
- **Admin Dashboard**: Quản lý nội dung hiển thị trên các màn hình LED
- **Player**: Ứng dụng chạy trên máy tính tại quầy LED (dùng Chrome Kiosk mode)

**Quy mô:** 3 màn hình tại 3 địa điểm khác nhau, kết nối qua mạng LAN nội bộ.

---

## 2. Architecture

### 2.1 Kiến trúc Tổng thể (Monolithic)

```
┌─────────────────────────────────────────┐
│         React SPA (Vite)                │
│  ┌─────────────┐    ┌─────────────┐      │
│  │   /admin    │    │   /player   │      │
│  │  Dashboard  │    │   (kiosk)   │      │
│  └─────────────┘    └─────────────┘      │
│              ↑↓ Socket.io               │
│         Express + PostgreSQL            │
│              ↑↓ File Storage            │
│         ┌─────────┐ ┌─────────┐       │
│         │ Screen1 │ │ Screen2 │...      │
│         └─────────┘ └─────────┘        │
└─────────────────────────────────────────┘
```

**Lý do chọn Monolithic:**
- Quy mô nhỏ (3 màn hình), không cần over-engineering
- Một codebase duy nhất, dễ triển khai và bảo trì
- Code sharing giữa Admin và Player (components, types, API)
- Socket.io realtime đơn giản trong cùng server

### 2.2 Cấu trúc Project

```
agribank-digital-signage/
├── src/
│   ├── client/                    # React Frontend
│   │   ├── admin/                 # Admin Dashboard
│   │   ├── player/                # Player Kiosk
│   │   └── shared/                # Code dùng chung
│   ├── server/                    # Express Backend
│   │   ├── routes/                # API routes
│   │   └── websocket/             # Socket.io handlers
│   └── db/                        # Database
├── public/                        # Static files
├── uploads/                       # File storage
├── index.html                     # Admin entry
├── player.html                    # Player entry
└── package.json
```

---

## 3. Database Schema

### 3.1 Bảng `screens`
Lưu thông tin các màn hình LED.

```sql
CREATE TYPE screen_status AS ENUM ('online', 'offline');

CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,        -- "Chi nhánh Hà Nội"
  location VARCHAR(255),               -- "Tầng 1, sảnh chính"
  resolution VARCHAR(50),              -- "1920x1080" | "3840x2160"
  status screen_status DEFAULT 'offline',
  last_ping TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_screens_status ON screens(status);
```

### 3.2 Bảng `media`
Lưu thông tin các file media đã upload.

```sql
CREATE TYPE media_type AS ENUM ('video', 'image');

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,    -- "abc123.mp4" (stored name)
  original_name VARCHAR(255),        -- "TietKiem.mp4" (original)
  file_path VARCHAR(500) NOT NULL,   -- "/uploads/abc123.mp4"
  file_type media_type NOT NULL,
  file_size BIGINT NOT NULL,         -- bytes
  mime_type VARCHAR(100),            -- "video/mp4"
  duration INTEGER,                  -- seconds (for video)
  dimensions VARCHAR(50),              -- "1920x1080" (for images/videos)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_type ON media(file_type);
CREATE INDEX idx_media_created ON media(created_at DESC);
```

### 3.3 Bảng `playlist_items`
Lưu thứ tự các media trong playlist của mỗi màn hình.

```sql
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,      -- Thứ tự trong playlist
  duration INTEGER NOT NULL DEFAULT 10, -- Thời gian hiển thị (giây)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(screen_id, order_index)
);

CREATE INDEX idx_playlist_screen ON playlist_items(screen_id);
CREATE INDEX idx_playlist_order ON playlist_items(screen_id, order_index);
```

### 3.4 Bảng `users`
Lưu thông tin admin users (basic auth).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  is_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default admin account (password: admin123, change in production)
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2b$10$...');
```

---

## 4. API Specification

### 4.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Đăng nhập, trả về JWT token |
| POST | `/api/auth/logout` | Đăng xuất (client-side token xóa) |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |

**Authentication:** All admin routes require `Authorization: Bearer <token>` header.

### 4.2 Screens

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/screens` | Lấy danh sách tất cả màn hình | Yes |
| GET | `/api/screens/:id` | Lấy chi tiết một màn hình | Yes |
| POST | `/api/screens` | Tạo màn hình mới | Yes |
| PUT | `/api/screens/:id` | Cập nhật thông tin màn hình | Yes |
| DELETE | `/api/screens/:id` | Xóa màn hình | Yes |
| GET | `/api/screens/:id/playlist` | Lấy playlist của màn hình | No (Player access) |
| POST | `/api/screens/:id/playlist` | Cập nhật playlist | Yes |

### 4.3 Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status, DB connection check |

### 4.4 Media

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/media` | Lấy danh sách media (paginated) | Yes |
| POST | `/api/media/upload` | Upload file mới | Yes |
| DELETE | `/api/media/:id` | Xóa media | Yes |

**Query Params for GET /api/media:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by 'video' | 'image'

**File Upload Constraints:**
- **Max file size:** 500MB (video), 10MB (image)
- **Video formats:** MP4 (H.264 codec), WebM
- **Image formats:** JPG, PNG, WebP
- **Video duration:** Max 5 minutes

### 4.5 Realtime Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screens/:id/refresh` | Trigger cập nhật realtime cho màn hình |

---

## 5. Realtime Communication (Socket.io)

### 5.1 Player → Server

**Event: `register`**
```typescript
socket.emit('register', {
  screenId: 'uuid'
});
```
Player đăng ký với server khi khởi động.

**Event: `status`**
```typescript
socket.emit('status', {
  screenId: 'uuid',
  currentMediaId: 'uuid',
  progress: 45,      // seconds
  isPlaying: true
});
```
Player báo cáo trạng thái phát định kỳ.

### 5.2 Server → Player

**Event: `playlist_updated`**
```typescript
socket.emit('playlist_updated', {
  screenId: 'uuid',
  playlist: [
    { mediaId: 'uuid1', url: '/uploads/abc.mp4', type: 'video', duration: 30 },
    { mediaId: 'uuid2', url: '/uploads/def.jpg', type: 'image', duration: 10 }
  ]
});
```
Gửi khi admin cập nhật playlist.

**Event: `ping`**
```typescript
socket.emit('ping', { timestamp: Date.now() });
```
Heartbeat để kiểm tra kết nối.

---

## 6. Player Behavior

### 6.1 Khởi động
1. Đọc `screenId` từ URL query (`?screen=uuid`) - được cấu hình thủ công trên mỗi máy Player
2. Kết nối WebSocket
3. Emit `register` để đăng ký
4. Gọi API lấy playlist
5. Bắt đầu phát từ item đầu tiên

**Lưu ý:** `screenId` được cấu hình hardcode trong URL shortcut của mỗi máy Player (không tự động detect).

### 6.2 Phát nội dung
- **Video**: Phát bằng HTML5 Video API, chuyển sang item tiếp theo khi kết thúc
- **Image**: Hiển thị trong thời gian `duration` rồi chuyển
- **Playlist kết thúc**: Quay lại item đầu tiên (loop)
- **Audio**: Video phát với âm thanh MUTED (mặc định), không có volume control UI

### 6.3 Empty & Error States

**Empty Playlist (chưa có nội dung):**
- Hiển thị màn hình đen với logo Agribank ở giữa
- Text: "Chưa có nội dung - Vui lòng cập nhật playlist"
- Tự động refresh mỗi 30s để kiểm tra playlist mới

**Media Load Error (file bị xóa/corrupted):**
- Skip sang media tiếp theo trong playlist
- Log error ra console để debug
- Không hiển thị lỗi cho người xem

**Invalid Screen ID:**
- Hiển thị thông báo: "Màn hình không tồn tại"
- Hướng dẫn kiểm tra cấu hình URL

### 6.4 Realtime Update
- Khi nhận `playlist_updated`:
  1. Fade out màn hình hiện tại (300ms)
  2. Tải nội dung mới
  3. Fade in và phát (300ms)
- Nếu đang phát video, đợi video hiện tại kết thúc rồi mới chuyển (không cắt ngang)

### 6.5 Offline Handling (Service Worker + IndexedDB)

**Cache Strategy:**
- Sử dụng Service Worker để cache static assets (JS, CSS, HTML)
- Sử dụng IndexedDB để lưu metadata playlist và nội dung media đã tải
- Cache theo dung lượng: Tối đa 2GB cho mỗi Player

**Reconnect Strategy:**
- Retry kết nối WebSocket mỗi 5s (exponential backoff tối đa 30s)
- Khi reconnect thành công, sync playlist mới nhất từ server
- Nếu server unreachable khi khởi động, dùng playlist từ IndexedDB

**Storage Management:**
- Khi đầy cache: xóa media cũ nhất (LRU - Least Recently Used)
- Không cache video > 100MB (stream trực tiếp từ server)
- Periodic cleanup: xóa media không còn trong playlist

---

## 7. Admin Dashboard UI

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  Agribank Digital Signage                    [Logout]  │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│  SCREENS    │   SCREEN: Chi nhánh Hà Nội               │
│  ┌────────┐ │   ┌─────────────────────────────────┐     │
│  │ Screen1│◄┼───┤ Current Playlist                  │     │
│  │   ✓    │ │   ├─────────────────────────────────┤     │
│  └────────┘ │   │ 1. [Video] TietKiem.mp4   [✕] │     │
│  ┌────────┐ │   │ 2. [Image] LaiSuat.jpg    [✕] │     │
│  │ Screen2│ │   │ 3. [Video] UuDai.mp4      [✕] │     │
│  │   ○    │ │   └─────────────────────────────────┘     │
│  └────────┘ │                                           │
│  ┌────────┐ │   [+ Add Media]  [Save Playlist]        │
│  │ Screen3│ │                                           │
│  │   ○    │ │   ┌─────────────────────────────────┐     │
│  └────────┘ │   │ Media Library                   │     │
│             │   │ ┌─────┐ ┌─────┐ ┌─────┐         │     │
│             │   │ │mp4  │ │jpg  │ │mp4  │ ...     │     │
│             │   │ └─────┘ └─────┘ └─────┘         │     │
│             │   └─────────────────────────────────┘     │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### 7.2 Flow
1. Admin chọn màn hình từ sidebar
2. Xem playlist hiện tại của màn hình đó
3. Có thể reorder (kéo thả) hoặc xóa item
4. Thêm media mới từ Media Library
5. Bấm "Save Playlist" để lưu → Gửi event realtime

---

## 8. Technology Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Headless UI |
| State Management | React Query + Zustand |
| Backend | Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Realtime | Socket.io |
| File Upload | Multer |
| Video Player | HTML5 Video API |

---

## 9. File Structure Details

```
src/
├── client/
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Admin main page
│   │   │   └── ScreenDetail.tsx     # Single screen management
│   │   └── components/
│   │       ├── ScreenList.tsx       # Sidebar screen list
│   │       ├── PlaylistEditor.tsx   # Drag-drop playlist
│   │       └── MediaLibrary.tsx     # Upload + media grid
│   ├── player/
│   │   ├── Player.tsx               # Main player component
│   │   ├── VideoPlayer.tsx          # Video playback logic
│   │   ├── ImagePlayer.tsx          # Image display logic
│   │   └── usePlaylist.ts           # Playlist state hook
│   └── shared/
│       ├── components/
│       │   ├── Button.tsx
│       │   └── Card.tsx
│       ├── hooks/
│       │   ├── useSocket.ts         # Socket.io connection
│       │   └── useApi.ts            # API calls
│       └── types/
│           ├── screen.ts
│           ├── media.ts
│           └── playlist.ts
├── server/
│   ├── index.ts                     # Server entry
│   ├── routes/
│   │   ├── screens.ts               # Screen API routes
│   │   ├── media.ts                 # Media API routes
│   │   └── playlist.ts              # Playlist API routes
│   └── websocket/
│       └── handler.ts               # Socket.io event handlers
└── db/
    ├── schema.prisma                # Prisma schema
    └── seed.ts                      # Initial data (3 screens)
```

---

## 10. Security Considerations

### 10.1 Authentication
- **JWT Token**: HS256, expire sau 24h
- **Password Hashing**: bcrypt với salt rounds 10
- **Protected Routes**: Middleware verify JWT cho tất cả admin API

### 10.2 CORS Configuration
```javascript
// Only allow requests from LAN subnet
cors({
  origin: /^https?:\/\/(10\.190\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/,
  credentials: true
})
```

### 10.3 File Upload Security
- **File Type Validation**: Check MIME type, magic bytes
- **File Extension Whitelist**: .mp4, .webm, .jpg, .jpeg, .png, .webp
- **Size Limits**: Video ≤ 500MB, Image ≤ 10MB
- **Rate Limiting**: 10 uploads / phút / IP
- **Storage Path**: Không expose trực tiếp, serve qua authenticated route

### 10.4 Content Security Policy
```javascript
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    mediaSrc: ["'self'", "blob:"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"]  // Tailwind cần unsafe-inline
  }
})
```

### 10.5 Screen ID Security
- Dùng UUID v4 (random), không dùng incremental ID
- Screen UUID coi như "public" - Player cần biết để đăng ký
- Không expose database ID nội bộ qua API

---

## 11. Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/digital_signage"

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET="your-random-secret-key-min-32-characters"
JWT_EXPIRES_IN="24h"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_VIDEO="524288000"    # 500MB in bytes
MAX_FILE_SIZE_IMAGE="10485760"      # 10MB in bytes

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://10.190.1.*"
```

## 12. Deployment

### 12.1 PostgreSQL Setup
```bash
# Create database
createdb digital_signage

# Run migrations
npx prisma migrate dev

# Seed initial data (3 screens)
npx prisma db seed
```

### 12.2 Server Setup

**Option A: Direct Node.js**
```bash
# Development
npm install
npm run dev

# Production
npm ci
npm run build
npm start
```

**Option B: Docker (khuyến nghị cho production)**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 12.3 Player Setup (Chrome Kiosk Mode)

**Windows Shortcut:**
```batch
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --kiosk \
  --fullscreen \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  http://server-ip:3000/player?screen=<screen-uuid>
```

**Auto-start on Boot:**
1. Tạo shortcut ở `C:\Users\<User>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`
2. Hoặc dùng Task Scheduler

**Linux (Porteus Kiosk):**
```bash
# Cấu hình trong Porteus Kiosk wizard
Homepage: http://server-ip:3000/player?screen=<screen-uuid>
Kiosk Mode: Yes
```

---

## 13. MVP Checklist

### Phase 1: Foundation
- [ ] Setup project structure (Vite + Express + TypeScript)
- [ ] Configure PostgreSQL with Prisma ORM
- [ ] Create database schema (screens, media, playlist_items, users)
- [ ] Setup environment configuration (.env)
- [ ] Add authentication (JWT login/logout)

### Phase 2: Core Features
- [ ] Create Player page (`/player?screen=uuid`)
- [ ] Implement HTML5 video playback with fullscreen
- [ ] Implement image display with duration
- [ ] Add playlist loop logic
- [ ] Create Admin Dashboard layout
- [ ] Screen list sidebar with online/offline status

### Phase 3: Content Management
- [ ] Media upload API (Multer)
- [ ] Media library grid in Admin
- [ ] Playlist editor (drag-drop reorder)
- [ ] Add/remove items from playlist
- [ ] File validation (type, size)

### Phase 4: Realtime
- [ ] Integrate Socket.io
- [ ] Player registration with screenId
- [ ] Playlist update push from Admin
- [ ] Fade transition when switching content

### Phase 5: Offline & Polish
- [ ] Service Worker setup
- [ ] IndexedDB for playlist caching
- [ ] Empty/error states UI
- [ ] Chrome Kiosk mode configuration
- [ ] Security hardening (CORS, CSP, rate limiting)

### Phase 6: Deployment
- [ ] Docker configuration
- [ ] Production build optimization
- [ ] PostgreSQL seed data (3 screens)
- [ ] Documentation (README, setup guide)

---

**Next Step:** Invoke `writing-plans` skill to create implementation plan.
