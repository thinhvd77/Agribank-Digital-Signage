# Per-Screen Management Accounts — Design

**Date:** 2026-04-17
**Status:** Approved, ready for implementation planning

## Goal

Let the super-admin create scoped accounts that each manage one LED screen. Branch staff can update the playlist on their own screen without touching other screens or infrastructure.

## Scope decisions (confirmed)

| Decision | Choice |
|---|---|
| Permissions for screen-manager | Playlist CRUD + profile CRUD for their own screen + upload to shared media library. **No** screen create/delete, **no** media delete, **no** user management. |
| User ↔ Screen cardinality | **1:1** — one user manages exactly one screen; one screen has at most one manager. Enforced at DB via `@unique`. |
| Screen-manager UI | Reuse admin Dashboard. After login, auto-navigate to their screen, hide admin-only controls. |
| Admin management actions | Create account, reset password, delete account. **No reassign** in v1 (delete + recreate covers this). |

## Architecture

Role-based access with two roles: `admin` and `screen_manager`.

- `admin`: current behavior unchanged + new user-management page.
- `screen_manager`: scoped to one `screenId`. Backend enforces scope via middleware; frontend only hides UI.

Existing JWT flow, Prisma ORM, Express middleware chain, Zustand auth store — all reused. No new runtime dependencies.

## Schema changes

```prisma
enum UserRole {
  admin
  screen_manager
}

model User {
  id           String    @id @default(uuid())
  username     String    @unique
  passwordHash String    @map("password_hash")
  role         UserRole  @default(admin)
  screenId     String?   @unique @map("screen_id")
  screen       Screen?   @relation(fields: [screenId], references: [id], onDelete: SetNull)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  @@map("users")
}

model Screen {
  // existing fields unchanged
  manager      User?    // back-relation via User.screenId
  // ...
}
```

**Migration:**
1. Create `UserRole` enum.
2. Add `role` column default `admin`, `screen_id` nullable + unique, FK to `screens.id` `ON DELETE SET NULL`.
3. Backfill: all existing rows → `role='admin'`, `screen_id=NULL`.
4. Drop `is_admin` column.

**Invariants (application layer):**
- `role='admin'` → `screenId` must be `null`.
- `role='screen_manager'` → `screenId` must reference an existing screen.
- Validated in the create/update user handlers.

## Backend changes

### New files

| File | Purpose |
|---|---|
| `src/server/middleware/requireRole.ts` | `requireAdmin(req, res, next)` and `requireScreenAccess(paramName)` factory. Returns 403 on failure. |
| `src/server/routes/users.ts` | Admin-only user management endpoints (list/create/reset-password/delete). |

### Modified files

- **`src/server/middleware/auth.ts`** — `AuthRequest` gains `role: UserRole` and `screenId: string | null`. JWT payload extended accordingly.
- **`src/server/routes/auth.ts`**:
  - `POST /login` — signs JWT with `{ userId, role, screenId }`. Response body `user` includes `role` + `screenId`. If `role='screen_manager'` and `screenId` is null, return 403 "Tài khoản chưa được gán màn hình".
  - `GET /me` — returns role + screenId.
- **`src/server/routes/screens.ts`**:
  - `GET /` — screen_manager sees only their screen; admin sees all.
  - `POST /`, `DELETE /:id` — wrap with `requireAdmin`.
  - `GET /:id`, update endpoints — `requireScreenAccess('id')`.
- **`src/server/routes/profiles.ts`** — all mutating endpoints gated by `requireScreenAccess` resolved via `profile.screenId`. Read endpoints same gate.
- **`src/server/routes/media.ts`**:
  - `POST /upload`, `GET /` — both roles allowed.
  - `DELETE /:id` — `requireAdmin`.
- **`src/server/index.ts` / `app.ts`** — mount `/api/users` router.

### New API endpoints

| Method | Path | Gate | Body | Response |
|---|---|---|---|---|
| GET | `/api/users` | admin | — | `[{ id, username, role, screenId, createdAt }]` — lists screen_managers only |
| POST | `/api/users` | admin | `{ username, password, screenId }` | `201 { id, username, role, screenId }` |
| POST | `/api/users/:id/reset-password` | admin | `{ password }` | `204` |
| DELETE | `/api/users/:id` | admin | — | `204` |

### Validation rules

| Rule | Error |
|---|---|
| `username` ≥ 3 chars, unique | 400 "Tên đăng nhập không hợp lệ" / "Tên đăng nhập đã tồn tại" |
| `password` ≥ 8 chars | 400 "Mật khẩu tối thiểu 8 ký tự" |
| `screenId` exists + no existing manager | 400 "Màn hình không tồn tại" / "Màn hình đã có người quản lý" |
| Target user must be `screen_manager` (admin reset-password/delete not supported via this API) | 400 "Không thể thao tác trên tài khoản admin" |
| Self-delete blocked | 400 "Không thể tự xoá tài khoản" |

## Frontend changes

### New files

| File | Purpose |
|---|---|
| `src/client/admin/pages/UsersPage.tsx` | Table of screen_managers with Create / Reset Password / Delete actions. Admin-only route. |
| `src/client/admin/components/UserCrudModal.tsx` | Modal for create + reset-password flows (reuses Dialog system). |

### Modified files

- **`src/client/admin/App.tsx`** — currently holds only `token` in useState + localStorage. Extend to also hold `user: { id, username, role, screenId } | null`, persisted as `auth_user` in localStorage alongside `token`. No Zustand store introduced (YAGNI — existing pattern works). Add a simple `currentPage: 'dashboard' | 'users'` state for admin navigation (react-router is installed but unused; not wiring it up for one extra page).
- **`src/client/admin/components/LoginForm.tsx`** — currently extracts only `token` from login response. Change callback signature to `onLogin(token, user)`. App.tsx stores both; if `role === 'screen_manager'`, set URL query `?screen=<screenId>` on first render so Dashboard auto-selects it.
- **`src/client/admin/pages/Dashboard.tsx`** — receive `user` prop. When `role === 'screen_manager'`:
  - Auto-select screen from `user.screenId` (via existing URL param logic).
  - Hide `ScreenList` sidebar, "Thêm màn hình" button, Users page nav link.
  - Render only `ProfileTabs` + `PlaylistEditor` + `MediaLibrary` + `ScreenSettings` for their screen.
- **`src/client/admin/components/ScreenCrudModal.tsx`** — hide entry when `user.role !== 'admin'`.
- **`src/client/admin/components/MediaLibrary.tsx`** — hide Delete button when `user.role !== 'admin'`.
- **`src/client/shared/types/index.ts`** — add `UserRole`, extend `User` type with `role` + `screenId`.

### Navigation (no router)

Admin sees a toggle in the Dashboard header: **Dashboard** ↔ **Tài khoản**. Clicking switches `currentPage` state in App.tsx. Screen-managers never see this toggle — they only ever see the Dashboard, pre-scoped to their screen. Not using react-router because a single admin-only page doesn't justify wiring up routing (can be added later if more admin pages arrive).

## Data flow

**Login:**
1. `POST /api/auth/login { username, password }`
2. Server verifies → signs JWT `{ userId, role, screenId }` → returns `{ token, user }`.
3. Frontend stores token + user; if `role='screen_manager'` and `screenId` present, redirect `/?screen=<screenId>`; else `/`.

**Screen-manager updates playlist:**
1. `POST /api/screens/:screenId/playlist` with JWT.
2. `authMiddleware` attaches `req.userId`, `req.role`, `req.screenId`.
3. `requireScreenAccess('screenId')`: admin passes; screen_manager passes only if `req.screenId === req.params.screenId`, else **403**.
4. Handler runs → Prisma update → Socket.io `playlist_updated` broadcast to that screen's player.

**Admin creates screen-manager account:**
1. `POST /api/users { username, password, screenId }` (admin JWT).
2. `requireAdmin` gate.
3. Validate: screen exists, no existing manager on that screen (also enforced by DB `@unique`).
4. bcrypt hash → Prisma `user.create` with `role='screen_manager'`.
5. Return created user (no password hash).

**Admin deletes screen-manager:**
1. `DELETE /api/users/:id` → `requireAdmin`.
2. Prisma delete.
3. Existing JWT for that user remains valid until expiry (24h). Accepted trade-off: LAN-only internal tool, 3-5 accounts total. No token blacklist in v1.

**Screen deleted with manager assigned:**
- DB `ON DELETE SET NULL` → `user.screen_id` becomes null.
- On next login, server detects screen_manager with `screenId=null` → rejects login with message "Tài khoản chưa được gán màn hình, liên hệ admin".
- Admin manually deletes or reassigns (via DB in v1, since reassign UI deferred).

## Error handling

- Backend: 403 for permission denial (distinct from 401 invalid/missing JWT).
- Frontend: 403 triggers auto-logout + redirect to `/login` (handles revoked access gracefully).
- All user-facing errors use Vietnamese messages via existing `useDialog` toast/alert system.

## Testing

Project has no automated test framework configured. Test coverage is **manual**, tracked as a checklist during implementation:

- [ ] Migration runs clean on a populated DB; existing admin survives.
- [ ] Admin login → JWT has `role='admin'`, `screenId=null`.
- [ ] Screen-manager login → JWT has `role='screen_manager'`, `screenId=<their-screen>`.
- [ ] Screen-manager `POST /api/screens/<other-screen>/playlist` → 403.
- [ ] Screen-manager `DELETE /api/media/:id` → 403.
- [ ] Screen-manager `GET /api/users` → 403.
- [ ] Admin `POST /api/users` duplicate username → 400.
- [ ] Admin `POST /api/users` screenId already has manager → 400.
- [ ] Delete screen that has manager → user.screenId becomes null → that user can no longer log in.
- [ ] Screen-manager UI hides: ScreenList, "Thêm màn hình", Users menu, MediaLibrary delete buttons.
- [ ] Admin UI unchanged; Users page fully functional.

Setting up Vitest/Jest for auth middleware is out of scope for this feature.

## Explicit non-goals (v1)

- Reassign screen-manager to a different screen via UI.
- Multiple managers per screen (M:N).
- Token revocation on delete / role change.
- Email / audit log.
- Rate limiting on login.
- Password strength meter or policy beyond 8-char minimum.
- Tracking media uploader / restricting delete by uploader.

## Files summary

**New:**
- `prisma/migrations/<timestamp>_add_user_roles/migration.sql`
- `src/server/middleware/requireRole.ts`
- `src/server/routes/users.ts`
- `src/client/admin/pages/UsersPage.tsx`
- `src/client/admin/components/UserCrudModal.tsx`

**Modified:**
- `prisma/schema.prisma`
- `src/server/middleware/auth.ts`
- `src/server/routes/auth.ts`
- `src/server/routes/screens.ts`
- `src/server/routes/profiles.ts`
- `src/server/routes/media.ts`
- `src/server/app.ts`
- `src/client/admin/App.tsx`
- `src/client/admin/pages/Dashboard.tsx`
- `src/client/admin/components/LoginForm.tsx`
- `src/client/admin/components/ScreenCrudModal.tsx`
- `src/client/admin/components/MediaLibrary.tsx`
- `src/client/shared/types/index.ts`
