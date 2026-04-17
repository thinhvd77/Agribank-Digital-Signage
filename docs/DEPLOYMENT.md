# Windows Server Deployment Guide

Production deployment using **PM2 + Nginx + PostgreSQL** (no Docker).

## Prerequisites on the server

- Windows Server 2019/2022
- Node.js 20+ (LTS)
- pnpm 10+  (`npm install -g pnpm`)
- PostgreSQL 15+ (running on `localhost:5432`)
- PM2  (`npm install -g pm2`)
- pm2-windows-startup  (`npm install -g pm2-windows-startup`) — auto-start on boot
- Nginx for Windows (extract to `C:\nginx`)
- Git for Windows (optional, for pulling updates)

---

## 1. Database setup

Create database and user in `psql`:

```sql
CREATE DATABASE digital_signage;
CREATE USER signage_app WITH ENCRYPTED PASSWORD 'strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE digital_signage TO signage_app;
```

## 2. Deploy code

Clone or copy project to `C:\agribank-signage`:

```powershell
cd C:\
git clone <repo-url> agribank-signage
cd agribank-signage
```

## 3. Environment config

```powershell
copy .env.production.example .env
notepad .env
```

Fill in:
- `DATABASE_URL` → your Postgres connection string
- `JWT_SECRET` → random 32+ char string. Generate:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

## 4. Install, migrate, build

```powershell
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm run build
pnpm run db:seed   # only on first deploy — seeds 3 screens + admin user
```

**Change admin password immediately** after first login (default: `admin` / `admin123`).

## 5. Start with PM2

```powershell
# Create logs directory
mkdir logs

# Start the app
pm2 start ecosystem.config.cjs

# Verify
pm2 status
pm2 logs agribank-signage
```

### Auto-start on boot (Windows)

```powershell
pm2-startup install
pm2 save
```

This registers PM2 as a Windows service so the app survives reboots.

## 6. Configure Nginx

Copy `nginx.conf.example` into your Nginx config. Edit:
- `server_name` → the server's LAN IP (e.g. `10.190.1.10`)
- `alias C:/agribank-signage/uploads/` → match your install path (keep the trailing slash)

Test and reload:

```powershell
cd C:\nginx
nginx -t
nginx -s reload
```

### Run Nginx as a Windows service

Use [NSSM](https://nssm.cc/):

```powershell
nssm install nginx C:\nginx\nginx.exe
nssm set nginx AppDirectory C:\nginx
nssm start nginx
```

## 7. Firewall

Open port 80 on the Windows Defender Firewall for the LAN:

```powershell
New-NetFirewallRule -DisplayName "Agribank Signage HTTP" `
  -Direction Inbound -Protocol TCP -LocalPort 80 `
  -RemoteAddress 10.190.0.0/16 -Action Allow
```

## 8. Verify deployment

From another machine on the LAN:

- Admin: `http://<server-ip>/`
- Player: `http://<server-ip>/player.html?screen=<screen-uuid>`
- Health: `http://<server-ip>/api/health`

Get screen UUIDs from the Admin Dashboard → "Screen Settings" (each screen shows its player URL).

---

## Updating the app

```powershell
cd C:\agribank-signage
git pull
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm run build
pm2 restart agribank-signage
```

## Common PM2 commands

| Command | Purpose |
|---------|---------|
| `pm2 status` | Show running apps |
| `pm2 logs agribank-signage` | Tail logs |
| `pm2 restart agribank-signage` | Restart after changes |
| `pm2 stop agribank-signage` | Stop the app |
| `pm2 monit` | Live resource monitor |

## Backup

Critical data to back up regularly:

1. **PostgreSQL** — `pg_dump digital_signage > backup.sql`
2. **uploads/** — copy `C:\agribank-signage\uploads\` to backup storage
3. **.env** — store securely (contains JWT secret + DB credentials)

## Troubleshooting

**Players can't reach server:** verify firewall rule + CORS allowlist in `src/server/app.ts` matches your LAN subnet (currently `10.190.x.x`).

**WebSocket not connecting:** Nginx must pass `Upgrade` + `Connection` headers on `/socket.io/` — see `nginx.conf.example`.

**Large uploads fail:** raise `client_max_body_size` in Nginx (currently 600M).

**PM2 doesn't restart on boot:** re-run `pm2 save` after the app is running, then `pm2-startup install`.
