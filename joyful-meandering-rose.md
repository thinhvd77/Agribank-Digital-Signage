# Plan: Multiple Profiles per Screen

## Context

Hiện tại mỗi `Screen` có **đúng một playlist** (qua bảng `playlist_items` liên kết trực tiếp tới `screenId`). User muốn mỗi màn hình có thể có **nhiều profile**, mỗi profile là một playlist khác nhau (VD: "Giờ hành chính", "Sự kiện", "Tết"). Admin chọn thủ công profile nào đang được hiển thị; player tự cập nhật qua WebSocket khi admin đổi active profile hoặc sửa playlist của profile active.

Dữ liệu hiện có được giữ nguyên bằng cách tạo profile "Default" cho mỗi screen, chứa playlist hiện tại, và set làm active profile.

---

## 1. Data Model Changes

**File:** `prisma/schema.prisma`

### Thêm model `Profile`
```prisma
model Profile {
  id            String         @id @default(uuid())
  screenId      String         @map("screen_id")
  name          String
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  screen        Screen         @relation(fields: [screenId], references: [id], onDelete: Cascade)
  playlistItems PlaylistItem[]

  @@unique([screenId, name])
  @@index([screenId])
  @@map("profiles")
}
```

### Sửa `Screen`
- Thêm `activeProfileId String? @map("active_profile_id")` (nullable để tránh circular constraint)
- Thêm relation `profiles Profile[]`
- Thêm relation `activeProfile Profile? @relation("ActiveProfile", fields: [activeProfileId], references: [id], onDelete: SetNull)`
- Giữ nguyên `playlistItems` bị **xóa** (PlaylistItem đổi sang gắn Profile)

### Sửa `PlaylistItem`
- Đổi `screenId` → `profileId` (`@map("profile_id")`)
- Đổi relation từ `screen` → `profile`
- Đổi `@@unique([screenId, orderIndex])` → `@@unique([profileId, orderIndex])`
- Đổi index tương ứng

---

## 2. Migration Strategy

**File:** `prisma/migrations/<timestamp>_add_profiles/migration.sql` (tạo mới, viết SQL tay thay vì dùng `prisma migrate dev` auto-generate để kiểm soát backfill)

Thứ tự SQL:
1. `CREATE TABLE profiles` với `screen_id` FK cascade
2. `INSERT INTO profiles (id, screen_id, name) SELECT gen_random_uuid(), id, 'Default' FROM screens;` — tạo 1 profile Default cho mỗi screen
3. `ALTER TABLE playlist_items ADD COLUMN profile_id TEXT;` (nullable tạm thời)
4. `UPDATE playlist_items pi SET profile_id = (SELECT p.id FROM profiles p WHERE p.screen_id = pi.screen_id AND p.name = 'Default');`
5. `ALTER TABLE playlist_items ALTER COLUMN profile_id SET NOT NULL;`
6. Drop old FK và unique constraint: `screen_id`, `playlist_items_screenId_orderIndex_key`
7. Drop old indexes: `playlist_items_screen_id_idx`, `playlist_items_screen_id_order_index_idx`
8. `ALTER TABLE playlist_items DROP COLUMN screen_id;`
9. Add FK: `ADD CONSTRAINT playlist_items_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE`
10. Add unique: `ADD CONSTRAINT playlist_items_profile_id_order_index_key UNIQUE (profile_id, order_index)`
11. Add new indexes trên `(profile_id)` và `(profile_id, order_index)`
12. `ALTER TABLE screens ADD COLUMN active_profile_id TEXT;`
13. `UPDATE screens s SET active_profile_id = (SELECT id FROM profiles p WHERE p.screen_id = s.id AND p.name = 'Default');`
14. Add FK: `ADD CONSTRAINT screens_active_profile_id_fkey FOREIGN KEY (active_profile_id) REFERENCES profiles(id) ON DELETE SET NULL`

Note: Hiện chỉ có 1 migration init, nên viết migration mới là an toàn.

---

## 3. Server API Changes

### New file: `src/server/routes/profiles.ts`
Endpoints:
- `GET /api/screens/:screenId/profiles` — list profiles của 1 screen, kèm cờ `isActive`
- `POST /api/screens/:screenId/profiles` — tạo profile mới `{ name }`, tự động không làm active
- `PUT /api/screens/:screenId/active-profile` — đặt active `{ profileId }`, emit `playlist_updated` tới room `screen:${screenId}` với playlist của profile mới
- `PUT /api/profiles/:id` — rename `{ name }`
- `DELETE /api/profiles/:id` — xóa profile (nếu là active → clear `active_profile_id` trên screen, emit playlist rỗng)
- `GET /api/profiles/:id/playlist-full` — admin fetch full playlist + media (thay cho `/screens/:id/playlist-full`)
- `POST /api/profiles/:id/playlist` — admin save playlist của profile; nếu profile này đang là active của screen → emit `playlist_updated`

Mount trong `src/server/app.ts`: `app.use('/api/profiles', profilesRouter);` (và router `screens.ts` tiếp tục handle `/:screenId/profiles` subpath)

### Sửa `src/server/routes/screens.ts`
- **Xóa** endpoint `GET /:id/playlist-full` và `POST /:id/playlist` (chuyển về profiles.ts)
- **Giữ** endpoint `GET /:id/playlist` (player-facing) nhưng **đổi logic**: tìm `activeProfileId` của screen → trả playlist của profile đó (hoặc mảng rỗng nếu không có active). Giữ auth-free như hiện tại.

### WebSocket
Không thay đổi `src/server/websocket/handler.ts`. Event `playlist_updated` tiếp tục được emit tới room `screen:${screenId}` khi:
1. Active profile của screen thay đổi
2. Playlist của active profile bị sửa

Payload giữ nguyên format hiện tại (mediaId, url, type, duration) — player không cần đổi gì.

---

## 4. Admin UI Changes

### Types — `src/client/shared/types/profile.ts` (mới)
```ts
export interface Profile {
  id: string;
  screenId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```
Export trong `src/client/shared/types/index.ts`.

Sửa `src/client/shared/types/playlist.ts`:
- `PlaylistItem.screenId` → `profileId`

### New component: `src/client/admin/components/ProfileTabs.tsx`
- Nhận props: `{ token, screenId, selectedProfileId, onSelectProfile }`
- Query: `useQuery(['profiles', screenId], ...)` fetch `/api/screens/${screenId}/profiles`
- Render tabs ngang: mỗi profile là 1 tab, tab có `isActive === true` hiển thị badge ★ (hoặc chấm xanh nhỏ bên cạnh tên)
- Tab đang selected (được edit) có underline xanh Agribank
- Nút `+` cuối dãy: mở modal/prompt nhập tên, POST tạo profile mới, auto-select
- Context menu trên tab (right-click hoặc icon ⋯): Set Active, Rename, Delete (delete disable nếu chỉ còn 1 profile)
- Khi đổi active: mutation PUT, invalidate `['profiles', screenId]`

### Sửa `src/client/admin/pages/Dashboard.tsx`
- Thêm state `selectedProfileId: string | null`
- Khi `selectedScreenId` đổi → reset `selectedProfileId = null`, useEffect fetch profiles, auto-select profile active (hoặc profile đầu tiên)
- Render: `<ProfileTabs ... />` phía trên `<PlaylistEditor ... />`
- `<PlaylistEditor>` nhận `profileId` thay cho `screenId`

### Sửa `src/client/admin/components/PlaylistEditor.tsx`
- Đổi prop `screenId: string` → `profileId: string`
- Query key `['playlist', profileId]`, URL `/api/profiles/${profileId}/playlist-full`
- Save URL `/api/profiles/${profileId}/playlist`
- Reset localItems khi `profileId` đổi (useEffect đã có, chỉ đổi deps)
- `MediaLibrary` không cần `screenId` nữa (nó chỉ dùng cho add flow qua window global)

### `src/client/admin/components/MediaLibrary.tsx`
- Xóa prop `screenId` (hiện tại không dùng trong logic, chỉ nhận qua interface)

---

## 5. Player — Không cần thay đổi

- `src/client/player/App.tsx`: tiếp tục nhận `?screen=<uuid>`
- `src/client/player/hooks/usePlaylist.ts`: fetch `/api/screens/:id/playlist` — server trả playlist của active profile (transparent)
- `src/client/player/Player.tsx`: listen `playlist_updated` — không đổi

---

## 6. Critical Files

**Modify:**
- `prisma/schema.prisma`
- `src/server/routes/screens.ts` (xóa admin playlist endpoints, đổi GET /playlist logic)
- `src/server/app.ts` (mount profiles router)
- `src/client/shared/types/playlist.ts`
- `src/client/shared/types/index.ts`
- `src/client/admin/pages/Dashboard.tsx`
- `src/client/admin/components/PlaylistEditor.tsx`
- `src/client/admin/components/MediaLibrary.tsx` (nhỏ)

**Create:**
- `prisma/migrations/<timestamp>_add_profiles/migration.sql`
- `src/server/routes/profiles.ts`
- `src/client/shared/types/profile.ts`
- `src/client/admin/components/ProfileTabs.tsx`

**Reuse:**
- BigInt polyfill (`src/server/index.ts:6-9`) — không cần thêm ở endpoints mới
- `useApi` hook (`src/client/shared/hooks/useApi`) — dùng cho mọi fetch mới
- `authMiddleware` (`src/server/middleware/auth.ts`) — protect admin endpoints
- Tailwind classes `border-agribank-green`, `bg-agribank-green` — giữ consistent

---

## 7. Verification

### DB migration
```bash
pnpm db:migrate    # Chạy migration, check không có error
pnpm db:studio     # Mở Studio, verify mỗi screen có 1 profile "Default", playlist_items đã có profile_id, screens có active_profile_id
```

### API smoke test (sau khi `pnpm dev`)
```bash
# Login lấy token trước đó
TOKEN=...

# List profiles của 1 screen
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/screens/<SCREEN_ID>/profiles

# Tạo profile mới
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Tết"}' http://localhost:3001/api/screens/<SCREEN_ID>/profiles

# Set active
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"profileId":"<NEW_ID>"}' http://localhost:3001/api/screens/<SCREEN_ID>/active-profile

# Player endpoint trả playlist active
curl http://localhost:3001/api/screens/<SCREEN_ID>/playlist
```

### End-to-end UI test
1. Login Admin → chọn 1 screen → thấy tab "Default" hiển thị playlist cũ
2. Click `+` → đặt tên "Test Profile" → tab mới xuất hiện, playlist rỗng
3. Thêm vài media vào "Test Profile" → Save → không có lỗi BigInt
4. Right-click "Test Profile" tab → Set Active → badge ★ chuyển sang tab đó
5. Mở player (`/player.html?screen=<id>`) ở tab khác → playlist hiển thị = "Test Profile", tự update khi đổi active
6. Sửa playlist của profile active → player tự reload playlist (WebSocket)
7. Rename + Delete profile → không bị lỗi; xóa active profile → player về trạng thái rỗng
