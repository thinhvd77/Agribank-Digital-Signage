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

# Start only backend (Express on port 3001)
pnpm dev:server

# Build for production
pnpm build

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
- Routes: `/api/health`, `/api/auth`, `/api/screens`
- Prisma ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- JWT auth via `authMiddleware`

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

Four tables in PostgreSQL (see `prisma/schema.prisma`):
- `users` - Admin authentication
- `screens` - LED screen configurations
- `media` - Uploaded video/image files
- `playlist_items` - Screen-to-media ordering

### CORS Configuration

Restricted to LAN subnet pattern: `192.168.x.x`, `localhost`, `127.0.0.1`

## Key Technical Details

- **TypeScript**: Strict mode enabled with two tsconfigs (client uses bundler resolution, server uses NodeNext)
- **Player**: Runs fullscreen in Chrome Kiosk mode, receives screenId from URL query param `?screen=uuid`
- **Media storage**: Files served from `/uploads` directory, proxied through Express
- **State management**: Zustand for client state, TanStack Query for server state
