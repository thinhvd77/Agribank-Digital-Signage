# Agribank Digital Signage

Digital Signage platform for Agribank LED screens. A full-stack TypeScript application with an Admin Dashboard for content management and a Player app for display on LED screens.

## Features

- **Admin Dashboard**: Manage screens, upload media, create and reorder playlists
- **Player**: Fullscreen kiosk app for Chrome, displays videos and images in sequence
- **Real-time Updates**: Playlist changes push instantly to players via WebSocket
- **Multi-screen Support**: Manage 3+ screens at different locations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand
- **Backend**: Express 5, Prisma ORM, PostgreSQL, Socket.io
- **Build**: esbuild (server), Vite (client)

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

## Quick Start

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd agribank-digital-signage
pnpm install
```

2. **Set up environment**

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. **Initialize database**

```bash
pnpm db:migrate
pnpm db:seed
```

4. **Start development server**

```bash
pnpm dev
```

- Admin Dashboard: http://localhost:5173
- Player: http://localhost:5173/player.html?screen=<screen-id>
- API: http://localhost:3000

Default login: `admin` / `admin123`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both frontend and backend |
| `pnpm dev:client` | Start Vite dev server only |
| `pnpm dev:server` | Start Express server only |
| `pnpm build` | Build for production |
| `pnpm start` | Run production server |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed initial data (3 screens) |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
agribank-digital-signage/
├── src/
│   ├── client/
│   │   ├── admin/          # Admin dashboard
│   │   ├── player/         # Player kiosk app
│   │   └── shared/         # Shared components, hooks, types
│   ├── server/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, error handling
│   │   └── websocket/      # Socket.io handler
│   └── db/
│       └── seed.ts         # Database seeding
├── prisma/
│   └── schema.prisma       # Database schema
├── public/                 # Static assets
├── uploads/                # Uploaded media files
├── index.html              # Admin entry point
├── player.html             # Player entry point
└── docker-compose.yml      # Docker configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/screens` | List all screens |
| GET | `/api/screens/:id` | Get screen details |
| GET | `/api/screens/:id/playlist` | Get screen playlist |
| POST | `/api/screens/:id/playlist` | Update playlist |
| GET | `/api/media` | List media (paginated) |
| POST | `/api/media/upload` | Upload media file |
| DELETE | `/api/media/:id` | Delete media |
| GET | `/api/health` | Health check |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `register` | Client -> Server | Player registers with screen ID |
| `playlist_updated` | Server -> Client | Playlist changed, includes new playlist |
| `status` | Client -> Server | Player status update |
| `ping` | Server -> Client | Heartbeat (every 30s) |

## Docker Deployment

```bash
# Start with Docker Compose
docker-compose up -d

# Access
# App: http://localhost:3000
# Database: localhost:5433
```

## Player Setup (Kiosk Mode)

For LED screen deployment, run Chrome in kiosk mode:

```bash
chromium --kiosk --noerrdialogs --disable-infobars \
  "http://<server-ip>:3000/player.html?screen=<screen-uuid>"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | 24h |
| `UPLOAD_DIR` | Media upload directory | ./uploads |
| `MAX_FILE_SIZE_VIDEO` | Max video size (bytes) | 524288000 |
| `MAX_FILE_SIZE_IMAGE` | Max image size (bytes) | 10485760 |

## License

ISC
