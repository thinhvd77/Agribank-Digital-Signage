# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Signage platform for Agribank LED screens. Monolithic full-stack TypeScript application with:
- **Admin Dashboard** (`/admin`): Manage content displayed on LED screens
- **Player** (`/player`): Kiosk app running in Chrome on LED machines

Scale: 3 screens at different locations, connected via internal LAN.

## Development Commands

```bash
# Start both frontend and backend concurrently
pnpm dev

# Start only frontend (Vite on port 5173)
pnpm dev:client

# Start only backend (Express on port 3000)
pnpm dev:server

# Build for production
pnpm build

# TypeScript type-checking
pnpm build:check      # Check server types (tsconfig.server.json)
node_modules/.bin/tsc --noEmit  # Check client types (tsconfig.json)

# Database
pnpm db:migrate    # Run Prisma migrations
pnpm db:seed       # Seed initial data (3 screens)
pnpm db:studio     # Open Prisma Studio
```

## Architecture

### Multi-Entry Frontend

Two separate HTML entry points in root directory:
- `index.html` → Admin Dashboard (`src/client/admin/`)
- `player.html` → Player Kiosk (`src/client/player/`)

Vite builds both entries via `rollupOptions.input`.

### Backend Structure

Express server in `src/server/`:
- Routes: `/api/health`, `/api/auth`, `/api/screens`, `/api/profiles`, `/api/media`
- Prisma ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- JWT auth via `authMiddleware`
- WebSocket (Socket.io) for real-time playlist/status updates

### Path Aliases

```
@shared/* → src/client/shared/*   (shared components, hooks, types)
@admin/*  → src/client/admin/*    (admin-specific code)
@player/* → src/client/player/*   (player-specific code)
@server/* → src/server/*          (backend code)
```

### Real-time Communication

Socket.io for:
- Player registration (`register` event)
- Playlist updates pushed to players (`playlist_updated`)
- Screen status heartbeats

### Database Schema

Five tables in PostgreSQL (see `prisma/schema.prisma`):
- `users` - Admin authentication
- `screens` - LED screen configurations
- `profiles` - Playlist containers (one or more per screen)
- `media` - Uploaded video/image files with auto-extracted duration
- `playlist_items` - Media + duration mapping per profile

### CORS Configuration

Restricted to LAN subnet pattern: `10.190.x.x`, `localhost`, `127.0.0.1`

## Key Technical Details

- **TypeScript**: Strict mode enabled with two tsconfigs:
  - Client (`tsconfig.json`): bundler resolution, JSX support
  - Server (`tsconfig.server.json`): Node ES modules, CommonJS compat
- **Player**: Runs fullscreen in Chrome Kiosk mode, receives screenId from URL query param `?screen=uuid`
  - Video/image duration: timer races with video `onEnded` — whichever fires first advances to next item
  - Images advance only by timer (set via `PlaylistEditor`)
  - Videos with duration < actual length get cut early; duration > length has no effect
- **Media storage**: Files served from `/uploads` directory, proxied through Express
  - Video duration auto-extracted via HTML5 `<video>` metadata on upload & back-filled for existing videos
- **State management**: Zustand for client state, TanStack Query for server state

## Gotchas & Non-Obvious Patterns

- **TypeScript check**: Run `pnpm build:check` (server only) OR `node_modules/.bin/tsc --noEmit` (client) separately; no unified command yet
- **Port mismatch in dev**: Admin (Vite :5173) and Player (built-in :3000) on different ports during dev; production unified via Express
- **Player URL display**: Admin dashboard shows player URL under "Screen Settings" for easy copying to LED machines
- **Database profiles**: Each screen can have multiple profiles (e.g., "Morning", "Afternoon"); only one active at a time
