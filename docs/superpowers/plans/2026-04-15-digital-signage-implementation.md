# Agribank Digital Signage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Digital Signage system with Admin Dashboard and Player for 3 LED screens on internal LAN.

**Architecture:** Monolithic React SPA (Vite) with Express backend, PostgreSQL database, Socket.io for realtime updates. Admin manages content, Player runs in Chrome Kiosk mode.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express, Prisma, PostgreSQL, Socket.io, Multer

**Spec Reference:** `docs/superpowers/specs/2026-04-15-digital-signage-design.md`

---

## File Structure Overview

```
agribank-digital-signage/
├── src/
│   ├── client/
│   │   ├── admin/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   └── Dashboard.tsx
│   │   │   └── components/
│   │   │       ├── ScreenList.tsx
│   │   │       ├── PlaylistEditor.tsx
│   │   │       ├── MediaLibrary.tsx
│   │   │       └── LoginForm.tsx
│   │   ├── player/
│   │   │   ├── App.tsx
│   │   │   ├── Player.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── ImagePlayer.tsx
│   │   │   └── hooks/
│   │   │       └── usePlaylist.ts
│   │   └── shared/
│   │       ├── types/
│   │       │   ├── screen.ts
│   │       │   ├── media.ts
│   │       │   └── playlist.ts
│   │       ├── hooks/
│   │       │   ├── useSocket.ts
│   │       │   └── useApi.ts
│   │       └── components/
│   │           └── Button.tsx
│   ├── server/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── screens.ts
│   │   │   ├── media.ts
│   │   │   └── health.ts
│   │   └── websocket/
│   │       └── handler.ts
│   └── db/
│       └── seed.ts
├── prisma/
│   └── schema.prisma
├── public/
│   └── agribank-logo.svg
├── uploads/
├── index.html
├── player.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project**

Run:
```bash
cd /home/thinh77/Projects/Agribank-Digital-Signage
npm init -y
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install react react-dom @tanstack/react-query zustand socket.io-client react-router-dom @dnd-kit/core @dnd-kit/sortable
npm install express cors helmet multer socket.io jsonwebtoken bcryptjs @prisma/client
npm install -D typescript vite @vitejs/plugin-react tailwindcss postcss autoprefixer
npm install -D prisma tsx nodemon concurrently
npm install -D @types/react @types/react-dom @types/node @types/express @types/cors @types/multer @types/jsonwebtoken @types/bcryptjs
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/client/shared/*"],
      "@admin/*": ["src/client/admin/*"],
      "@player/*": ["src/client/player/*"],
      "@server/*": ["src/server/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/client/shared'),
      '@admin': path.resolve(__dirname, 'src/client/admin'),
      '@player': path.resolve(__dirname, 'src/client/player'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'index.html'),
        player: path.resolve(__dirname, 'player.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/uploads': 'http://localhost:3001',
    },
  },
});
```

- [ ] **Step 5: Initialize Tailwind CSS**

Run:
```bash
npx tailwindcss init -p
```

Then update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./player.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agribank: {
          green: '#00723F',
          gold: '#FFD700',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create .env.example**

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/digital_signage"

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET="change-this-to-random-32-char-string"
JWT_EXPIRES_IN="24h"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_VIDEO=524288000
MAX_FILE_SIZE_IMAGE=10485760
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
uploads/*
!uploads/.gitkeep
.env
*.log
```

- [ ] **Step 8: Update package.json scripts**

Edit `package.json` to add scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "vite",
    "dev:server": "nodemon --exec tsx src/server/index.ts",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: initialize project with Vite, React, Tailwind, Express"
```

---

## Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/db/seed.ts`

- [ ] **Step 1: Initialize Prisma**

Run:
```bash
npx prisma init
```

- [ ] **Step 2: Write Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ScreenStatus {
  online
  offline
}

enum MediaType {
  video
  image
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  isAdmin      Boolean  @default(true) @map("is_admin")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Screen {
  id         String       @id @default(uuid())
  name       String
  location   String?
  resolution String?
  status     ScreenStatus @default(offline)
  lastPing   DateTime?    @map("last_ping")
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")

  playlistItems PlaylistItem[]

  @@index([status])
  @@map("screens")
}

model Media {
  id           String    @id @default(uuid())
  filename     String
  originalName String    @map("original_name")
  filePath     String    @map("file_path")
  fileType     MediaType @map("file_type")
  fileSize     BigInt    @map("file_size")
  mimeType     String?   @map("mime_type")
  duration     Int?
  dimensions   String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  playlistItems PlaylistItem[]

  @@index([fileType])
  @@index([createdAt(sort: Desc)])
  @@map("media")
}

model PlaylistItem {
  id         String   @id @default(uuid())
  screenId   String   @map("screen_id")
  mediaId    String   @map("media_id")
  orderIndex Int      @map("order_index")
  duration   Int      @default(10)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  screen Screen @relation(fields: [screenId], references: [id], onDelete: Cascade)
  media  Media  @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([screenId, orderIndex])
  @@index([screenId])
  @@index([screenId, orderIndex])
  @@map("playlist_items")
}
```

- [ ] **Step 3: Create .env file from example**

Run:
```bash
cp .env.example .env
```

- [ ] **Step 4: Run Prisma migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Migration created successfully

- [ ] **Step 5: Write seed script**

Create `src/db/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      isAdmin: true,
    },
  });

  // Create 3 screens
  const screens = [
    { name: 'Chi nhanh Ha Noi', location: 'Tang 1, sanh chinh', resolution: '1920x1080' },
    { name: 'Chi nhanh Ho Chi Minh', location: 'Tang 2, khu vuc giao dich', resolution: '1920x1080' },
    { name: 'Chi nhanh Da Nang', location: 'Tang 1, loi vao', resolution: '1920x1080' },
  ];

  for (const screen of screens) {
    await prisma.screen.upsert({
      where: { id: screen.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: screen,
    });
  }

  console.log('Seed completed: 1 admin user, 3 screens');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Run seed**

Run:
```bash
npm run db:seed
```

Expected: "Seed completed: 1 admin user, 3 screens"

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/db/
git commit -m "feat: add Prisma schema and seed data"
```

---

## Task 3: Shared TypeScript Types

**Files:**
- Create: `src/client/shared/types/screen.ts`
- Create: `src/client/shared/types/media.ts`
- Create: `src/client/shared/types/playlist.ts`
- Create: `src/client/shared/types/index.ts`

- [ ] **Step 1: Create directory structure**

Run:
```bash
mkdir -p src/client/shared/types
mkdir -p src/client/shared/hooks
mkdir -p src/client/shared/components
mkdir -p src/client/admin/pages
mkdir -p src/client/admin/components
mkdir -p src/client/player/hooks
mkdir -p src/server/routes
mkdir -p src/server/middleware
mkdir -p src/server/websocket
mkdir -p uploads
touch uploads/.gitkeep
```

- [ ] **Step 2: Create screen types**

Create `src/client/shared/types/screen.ts`:

```typescript
export type ScreenStatus = 'online' | 'offline';

export interface Screen {
  id: string;
  name: string;
  location: string | null;
  resolution: string | null;
  status: ScreenStatus;
  lastPing: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenInput {
  name: string;
  location?: string;
  resolution?: string;
}

export interface UpdateScreenInput {
  name?: string;
  location?: string;
  resolution?: string;
}
```

- [ ] **Step 3: Create media types**

Create `src/client/shared/types/media.ts`:

```typescript
export type MediaType = 'video' | 'image';

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileType: MediaType;
  fileSize: number;
  mimeType: string | null;
  duration: number | null;
  dimensions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  items: Media[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [ ] **Step 4: Create playlist types**

Create `src/client/shared/types/playlist.ts`:

```typescript
import type { Media } from './media';

export interface PlaylistItem {
  id: string;
  screenId: string;
  mediaId: string;
  orderIndex: number;
  duration: number;
  media: Media;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistUpdateInput {
  items: Array<{
    mediaId: string;
    duration: number;
  }>;
}

export interface PlayerPlaylistItem {
  mediaId: string;
  url: string;
  type: 'video' | 'image';
  duration: number;
}
```

- [ ] **Step 5: Create index export**

Create `src/client/shared/types/index.ts`:

```typescript
export * from './screen';
export * from './media';
export * from './playlist';

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/client/shared/
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Express Server Setup

**Files:**
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Create: `src/server/middleware/errorHandler.ts`
- Create: `src/server/routes/health.ts`

- [ ] **Step 1: Create error handler middleware**

Create `src/server/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode}: ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    message,
    code: err.code,
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Not Found' });
}
```

- [ ] **Step 2: Create health route**

Create `src/server/routes/health.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
```

- [ ] **Step 3: Create Express app**

Create `src/server/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import healthRouter from './routes/health';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS for LAN
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const lanPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/;
    if (lanPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/health', healthRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

- [ ] **Step 4: Create server entry point**

Create `src/server/index.ts`:

```typescript
import { createServer } from 'http';
import app from './app';

const PORT = process.env.PORT || 3001;

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
```

- [ ] **Step 5: Test server starts**

Run:
```bash
npx tsx src/server/index.ts &
sleep 2
curl http://localhost:3001/api/health
pkill -f "tsx src/server"
```

Expected: `{"status":"ok","timestamp":"...","database":"connected"}`

- [ ] **Step 6: Commit**

```bash
git add src/server/
git commit -m "feat: add Express server with health check"
```

---

## Task 5: Authentication API

**Files:**
- Create: `src/server/middleware/auth.ts`
- Create: `src/server/routes/auth.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Create auth middleware**

Create `src/server/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

interface JwtPayload {
  userId: string;
  isAdmin: boolean;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

- [ ] **Step 2: Create auth routes**

Create `src/server/routes/auth.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.isAdmin },
    secret,
    { expiresIn }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    },
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, isAdmin: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

export default router;
```

- [ ] **Step 3: Register auth routes in app**

Edit `src/server/app.ts`, add import and route:

```typescript
import authRouter from './routes/auth';

// Add after healthRouter registration
app.use('/api/auth', authRouter);
```

- [ ] **Step 4: Test login API**

Run:
```bash
npx tsx src/server/index.ts &
sleep 2
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
pkill -f "tsx src/server"
```

Expected: `{"token":"eyJ...","user":{"id":"...","username":"admin","isAdmin":true}}`

- [ ] **Step 5: Commit**

```bash
git add src/server/
git commit -m "feat: add JWT authentication API"
```

---

## Task 6: Screens API

**Files:**
- Create: `src/server/routes/screens.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Create screens routes**

Create `src/server/routes/screens.ts`:

```typescript
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/screens - List all screens
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const screens = await prisma.screen.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(screens);
});

// GET /api/screens/:id - Get single screen
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screen = await prisma.screen.findUnique({
    where: { id: req.params.id },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  res.json(screen);
});

// POST /api/screens - Create screen
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, location, resolution } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const screen = await prisma.screen.create({
    data: { name, location, resolution },
  });

  res.status(201).json(screen);
});

// PUT /api/screens/:id - Update screen
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, location, resolution } = req.body;

  const screen = await prisma.screen.update({
    where: { id: req.params.id },
    data: { name, location, resolution },
  });

  res.json(screen);
});

// DELETE /api/screens/:id - Delete screen
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.screen.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

// GET /api/screens/:id/playlist - Get playlist (no auth for Player)
router.get('/:id/playlist', async (req, res) => {
  const items = await prisma.playlistItem.findMany({
    where: { screenId: req.params.id },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  const playlist = items.map((item) => ({
    mediaId: item.mediaId,
    url: item.media.filePath,
    type: item.media.fileType,
    duration: item.duration,
  }));

  res.json(playlist);
});

// POST /api/screens/:id/playlist - Update playlist
router.post('/:id/playlist', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { items } = req.body;
  const screenId = req.params.id;

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Items array required' });
  }

  // Delete existing playlist items
  await prisma.playlistItem.deleteMany({
    where: { screenId },
  });

  // Create new items
  const createData = items.map((item: { mediaId: string; duration: number }, index: number) => ({
    screenId,
    mediaId: item.mediaId,
    orderIndex: index,
    duration: item.duration || 10,
  }));

  await prisma.playlistItem.createMany({
    data: createData,
  });

  // Return updated playlist
  const updatedItems = await prisma.playlistItem.findMany({
    where: { screenId },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  res.json(updatedItems);
});

export default router;
```

- [ ] **Step 2: Register screens routes**

Edit `src/server/app.ts`, add:

```typescript
import screensRouter from './routes/screens';

// Add after auth router
app.use('/api/screens', screensRouter);
```

- [ ] **Step 3: Test screens API**

Run:
```bash
npx tsx src/server/index.ts &
sleep 2
# Login first
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
# Get screens
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/screens
pkill -f "tsx src/server"
```

Expected: Array of 3 screens

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/screens.ts src/server/app.ts
git commit -m "feat: add screens CRUD API"
```

---

## Task 7: Media Upload API

**Files:**
- Create: `src/server/routes/media.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Create media routes with Multer**

Create `src/server/routes/media.ts`:

```typescript
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_FILE_SIZE_VIDEO || '524288000');
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_FILE_SIZE_IMAGE || '10485760');

const ALLOWED_MIMES: Record<string, 'video' | 'image'> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(16).toString('hex');
    cb(null, `${hash}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// GET /api/media - List media (paginated)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const type = req.query.type as 'video' | 'image' | undefined;

  const where = type ? { fileType: type } : {};
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.media.count({ where }),
  ]);

  res.json({
    items: items.map((item) => ({
      ...item,
      fileSize: Number(item.fileSize),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/media/upload - Upload file
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileType = ALLOWED_MIMES[file.mimetype];
  
  // Check size limits
  if (fileType === 'image' && file.size > MAX_IMAGE_SIZE) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ message: 'Image too large (max 10MB)' });
  }

  const media = await prisma.media.create({
    data: {
      filename: file.filename,
      originalName: file.originalname,
      filePath: `/uploads/${file.filename}`,
      fileType,
      fileSize: BigInt(file.size),
      mimeType: file.mimetype,
    },
  });

  res.status(201).json({
    ...media,
    fileSize: Number(media.fileSize),
  });
});

// DELETE /api/media/:id - Delete media
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const media = await prisma.media.findUnique({
    where: { id: req.params.id },
  });

  if (!media) {
    return res.status(404).json({ message: 'Media not found' });
  }

  // Delete file from disk
  const filePath = path.join(process.cwd(), media.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from database
  await prisma.media.delete({
    where: { id: req.params.id },
  });

  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Register media routes**

Edit `src/server/app.ts`, add:

```typescript
import mediaRouter from './routes/media';

// Add after screens router
app.use('/api/media', mediaRouter);
```

- [ ] **Step 3: Test media upload**

Run:
```bash
npx tsx src/server/index.ts &
sleep 2
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
# Create test image
convert -size 100x100 xc:red test.jpg 2>/dev/null || echo "test" > test.jpg
# Upload
curl -X POST http://localhost:3001/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg"
rm test.jpg
pkill -f "tsx src/server"
```

Expected: `{"id":"...","filename":"...","originalName":"test.jpg",...}`

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/media.ts src/server/app.ts
git commit -m "feat: add media upload API with Multer"
```

---

## Task 8: Socket.io Setup

**Files:**
- Create: `src/server/websocket/handler.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create WebSocket handler**

Create `src/server/websocket/handler.ts`:

```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegisterPayload {
  screenId: string;
}

interface StatusPayload {
  screenId: string;
  currentMediaId: string;
  progress: number;
  isPlaying: boolean;
}

const screenSockets = new Map<string, Socket>();

export function setupWebSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const lanPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/;
        callback(null, lanPattern.test(origin));
      },
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('register', async (payload: RegisterPayload) => {
      const { screenId } = payload;
      console.log(`[Socket] Screen ${screenId} registered`);

      screenSockets.set(screenId, socket);
      socket.join(`screen:${screenId}`);

      // Update screen status
      await prisma.screen.update({
        where: { id: screenId },
        data: { status: 'online', lastPing: new Date() },
      }).catch(() => {});
    });

    socket.on('status', async (payload: StatusPayload) => {
      const { screenId } = payload;
      await prisma.screen.update({
        where: { id: screenId },
        data: { lastPing: new Date() },
      }).catch(() => {});
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Find and update disconnected screen
      for (const [screenId, s] of screenSockets) {
        if (s.id === socket.id) {
          screenSockets.delete(screenId);
          await prisma.screen.update({
            where: { id: screenId },
            data: { status: 'offline' },
          }).catch(() => {});
          break;
        }
      }
    });
  });

  // Heartbeat ping every 30s
  setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
  }, 30000);

  return io;
}

export function notifyPlaylistUpdate(io: Server, screenId: string, playlist: unknown[]) {
  io.to(`screen:${screenId}`).emit('playlist_updated', {
    screenId,
    playlist,
  });
}
```

- [ ] **Step 2: Update server to use Socket.io**

Edit `src/server/index.ts`:

```typescript
import { createServer } from 'http';
import app from './app';
import { setupWebSocket } from './websocket/handler';

const PORT = process.env.PORT || 3001;

const server = createServer(app);
const io = setupWebSocket(server);

// Make io available to routes
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready`);
});
```

- [ ] **Step 3: Add realtime notification to playlist update**

Edit `src/server/routes/screens.ts`, update POST playlist handler:

```typescript
// At the end of POST /api/screens/:id/playlist handler, before res.json():
const io = req.app.get('io');
if (io) {
  const playlist = updatedItems.map((item) => ({
    mediaId: item.mediaId,
    url: item.media.filePath,
    type: item.media.fileType,
    duration: item.duration,
  }));
  io.to(`screen:${screenId}`).emit('playlist_updated', { screenId, playlist });
}
```

- [ ] **Step 4: Test WebSocket connection**

Run:
```bash
npx tsx src/server/index.ts &
sleep 2
# Simple test - server should log "WebSocket ready"
curl http://localhost:3001/api/health
pkill -f "tsx src/server"
```

Expected: Health check passes, logs show "WebSocket ready"

- [ ] **Step 5: Commit**

```bash
git add src/server/
git commit -m "feat: add Socket.io for realtime updates"
```

---

## Task 9: Admin Frontend - Entry Points

**Files:**
- Create: `index.html`
- Create: `player.html`
- Create: `src/client/admin/main.tsx`
- Create: `src/client/admin/App.tsx`
- Create: `src/client/admin/index.css`
- Create: `src/client/player/main.tsx`
- Create: `src/client/player/App.tsx`

- [ ] **Step 1: Create admin HTML entry**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agribank Digital Signage - Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/admin/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create player HTML entry**

Create `player.html`:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agribank Digital Signage - Player</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/player/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create admin CSS**

Create `src/client/admin/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Create admin main entry**

Create `src/client/admin/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 5: Create admin App component**

Create `src/client/admin/App.tsx`:

```tsx
import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('token')
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
```

- [ ] **Step 6: Create player main entry**

Create `src/client/player/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create player App component (placeholder)**

Create `src/client/player/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white">
      <p>Player loading...</p>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add index.html player.html src/client/
git commit -m "feat: add frontend entry points for admin and player"
```

---

## Task 10: Admin Login Form

**Files:**
- Create: `src/client/admin/components/LoginForm.tsx`

- [ ] **Step 1: Create LoginForm component**

Create `src/client/admin/components/LoginForm.tsx`:

```tsx
import { useState } from 'react';

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }

      const { token } = await res.json();
      onLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-agribank-green">
            Agribank Digital Signage
          </h1>
          <p className="text-gray-600 mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-agribank-green"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-agribank-green"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-agribank-green text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify import in App.tsx**

Ensure `src/client/admin/App.tsx` imports LoginForm correctly (already done in Task 9).

- [ ] **Step 3: Commit**

```bash
git add src/client/admin/components/LoginForm.tsx
git commit -m "feat: add admin login form"
```

---

## Task 11: Admin Dashboard Layout

**Files:**
- Create: `src/client/admin/pages/Dashboard.tsx`
- Create: `src/client/admin/components/ScreenList.tsx`
- Create: `src/client/shared/hooks/useApi.ts`

- [ ] **Step 1: Create useApi hook**

Create `src/client/shared/hooks/useApi.ts`:

```typescript
export function useApi(token: string) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return { fetchApi, headers };
}
```

- [ ] **Step 2: Create ScreenList component**

Create `src/client/admin/components/ScreenList.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import type { Screen } from '@shared/types';

interface Props {
  token: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ScreenList({ token, selectedId, onSelect }: Props) {
  const { fetchApi } = useApi(token);

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => fetchApi<Screen[]>('/api/screens'),
  });

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Screens
      </h2>
      <div className="space-y-2">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onSelect(screen.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedId === screen.id
                ? 'border-agribank-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{screen.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            </div>
            {screen.location && (
              <p className="text-sm text-gray-500 mt-1">{screen.location}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Dashboard page**

Create `src/client/admin/pages/Dashboard.tsx`:

```tsx
import { useState } from 'react';
import ScreenList from '../components/ScreenList';
import PlaylistEditor from '../components/PlaylistEditor';
import MediaLibrary from '../components/MediaLibrary';

interface Props {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: Props) {
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-agribank-green text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Agribank Digital Signage</h1>
        <button
          onClick={onLogout}
          className="text-sm hover:underline"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-50 border-r overflow-y-auto">
          <ScreenList
            token={token}
            selectedId={selectedScreenId}
            onSelect={setSelectedScreenId}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 flex flex-col overflow-hidden p-6">
          {selectedScreenId ? (
            <>
              <PlaylistEditor token={token} screenId={selectedScreenId} />
              <div className="mt-6 flex-1 overflow-hidden">
                <MediaLibrary token={token} screenId={selectedScreenId} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a screen to manage its playlist
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder components**

Create `src/client/admin/components/PlaylistEditor.tsx`:

```tsx
interface Props {
  token: string;
  screenId: string;
}

export default function PlaylistEditor({ screenId }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Playlist for {screenId}</h2>
      <p className="text-gray-500">Playlist editor coming soon...</p>
    </div>
  );
}
```

Create `src/client/admin/components/MediaLibrary.tsx`:

```tsx
interface Props {
  token: string;
  screenId: string;
}

export default function MediaLibrary({ token }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Media Library</h2>
      <p className="text-gray-500">Media library coming soon...</p>
    </div>
  );
}
```

- [ ] **Step 5: Test admin frontend**

Run:
```bash
npm run dev
```

Open http://localhost:5173 - should see login form. Login with admin/admin123.

Expected: Dashboard with screen list sidebar

- [ ] **Step 6: Commit**

```bash
git add src/client/
git commit -m "feat: add admin dashboard layout with screen list"
```

---

## Task 12: Media Library Component

**Files:**
- Modify: `src/client/admin/components/MediaLibrary.tsx`

- [ ] **Step 1: Implement MediaLibrary with upload**

Replace `src/client/admin/components/MediaLibrary.tsx`:

```tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import type { Media, MediaListResponse } from '@shared/types';

interface Props {
  token: string;
  screenId: string;
  onAddToPlaylist?: (media: Media) => void;
}

export default function MediaLibrary({ token, onAddToPlaylist }: Props) {
  const { fetchApi, headers } = useApi(token);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => fetchApi<MediaListResponse>('/api/media'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Media Library</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {data?.items.map((media) => (
              <div
                key={media.id}
                className="border rounded-lg overflow-hidden group relative"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {media.fileType === 'video' ? (
                    <video
                      src={media.filePath}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={media.filePath}
                      alt={media.originalName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm truncate" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {media.fileType} - {formatSize(media.fileSize)}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {onAddToPlaylist && (
                    <button
                      onClick={() => onAddToPlaylist(media)}
                      className="bg-agribank-green text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this media?')) {
                        deleteMutation.mutate(media.id);
                      }
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/admin/components/MediaLibrary.tsx
git commit -m "feat: add media library with upload and delete"
```

---

## Task 13: Playlist Editor Component

**Files:**
- Modify: `src/client/admin/components/PlaylistEditor.tsx`

- [ ] **Step 1: Install dnd-kit types**

Run:
```bash
npm install @dnd-kit/utilities
```

- [ ] **Step 2: Implement PlaylistEditor with drag-drop**

Replace `src/client/admin/components/PlaylistEditor.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApi } from '@shared/hooks/useApi';
import type { PlaylistItem, Media } from '@shared/types';

interface Props {
  token: string;
  screenId: string;
}

interface SortableItemProps {
  item: PlaylistItem;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

function SortableItem({ item, onRemove, onDurationChange }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-gray-50 p-3 rounded border"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400">
        ⋮⋮
      </button>
      <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
        {item.media.fileType === 'video' ? (
          <video src={item.media.filePath} className="w-full h-full object-cover" />
        ) : (
          <img src={item.media.filePath} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.media.originalName}</p>
        <p className="text-xs text-gray-500">{item.media.fileType}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Duration:</label>
        <input
          type="number"
          min="1"
          max="300"
          value={item.duration}
          onChange={(e) => onDurationChange(item.id, parseInt(e.target.value) || 10)}
          className="w-16 px-2 py-1 border rounded text-sm"
        />
        <span className="text-xs text-gray-500">s</span>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-red-500 hover:text-red-700 px-2"
      >
        ×
      </button>
    </div>
  );
}

export default function PlaylistEditor({ token, screenId }: Props) {
  const { fetchApi } = useApi(token);
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<PlaylistItem[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: serverItems = [] } = useQuery({
    queryKey: ['playlist', screenId],
    queryFn: async () => {
      const res = await fetch(`/api/screens/${screenId}/playlist`);
      if (!res.ok) throw new Error('Failed to fetch playlist');
      
      // Player endpoint returns simplified format, need full data
      const fullItems = await fetchApi<PlaylistItem[]>(
        `/api/screens/${screenId}/playlist-full`
      ).catch(() => []);
      return fullItems;
    },
  });

  const items = localItems ?? serverItems;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveMutation = useMutation({
    mutationFn: async (items: PlaylistItem[]) => {
      await fetchApi(`/api/screens/${screenId}/playlist`, {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((item) => ({
            mediaId: item.mediaId,
            duration: item.duration,
          })),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', screenId] });
      setLocalItems(null);
      setHasChanges(false);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setLocalItems(newItems);
      setHasChanges(true);
    }
  };

  const handleRemove = (id: string) => {
    const newItems = items.filter((i) => i.id !== id);
    setLocalItems(newItems);
    setHasChanges(true);
  };

  const handleDurationChange = (id: string, duration: number) => {
    const newItems = items.map((i) =>
      i.id === id ? { ...i, duration } : i
    );
    setLocalItems(newItems);
    setHasChanges(true);
  };

  const handleAddMedia = (media: Media) => {
    const newItem: PlaylistItem = {
      id: `temp-${Date.now()}`,
      screenId,
      mediaId: media.id,
      orderIndex: items.length,
      duration: media.fileType === 'video' ? (media.duration || 30) : 10,
      media,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalItems([...items, newItem]);
    setHasChanges(true);
  };

  // Expose addMedia method via window for MediaLibrary
  (window as any).__addToPlaylist = handleAddMedia;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Current Playlist</h2>
        {hasChanges && (
          <button
            onClick={() => saveMutation.mutate(items)}
            disabled={saveMutation.isPending}
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Playlist'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No items in playlist. Add media from the library below.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onDurationChange={handleDurationChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update Dashboard to connect components**

Edit `src/client/admin/pages/Dashboard.tsx`, update MediaLibrary usage:

```tsx
<MediaLibrary
  token={token}
  screenId={selectedScreenId}
  onAddToPlaylist={(media) => {
    (window as any).__addToPlaylist?.(media);
  }}
/>
```

- [ ] **Step 4: Add playlist-full endpoint**

Edit `src/server/routes/screens.ts`, add before the existing GET playlist endpoint:

```typescript
// GET /api/screens/:id/playlist-full - Get full playlist with media details (admin)
router.get('/:id/playlist-full', authMiddleware, async (req: AuthRequest, res: Response) => {
  const items = await prisma.playlistItem.findMany({
    where: { screenId: req.params.id },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  res.json(items.map((item) => ({
    ...item,
    media: {
      ...item.media,
      fileSize: Number(item.media.fileSize),
    },
  })));
});
```

- [ ] **Step 5: Test playlist editor**

Run:
```bash
npm run dev
```

Expected: Can reorder items, add from library, save playlist

- [ ] **Step 6: Commit**

```bash
git add src/client/admin/ src/server/routes/screens.ts
git commit -m "feat: add playlist editor with drag-drop reordering"
```

---

## Task 14: Player Core Implementation

**Files:**
- Modify: `src/client/player/App.tsx`
- Create: `src/client/player/Player.tsx`
- Create: `src/client/player/hooks/usePlaylist.ts`
- Create: `src/client/shared/hooks/useSocket.ts`

- [ ] **Step 1: Create useSocket hook**

Create `src/client/shared/hooks/useSocket.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  screenId: string;
  onPlaylistUpdate?: (playlist: unknown[]) => void;
}

export function useSocket({ screenId, onPlaylistUpdate }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      socket.emit('register', { screenId });
    });

    socket.on('playlist_updated', (data: { screenId: string; playlist: unknown[] }) => {
      if (data.screenId === screenId) {
        console.log('[Socket] Playlist updated');
        onPlaylistUpdate?.(data.playlist);
      }
    });

    socket.on('ping', () => {
      socket.emit('status', {
        screenId,
        currentMediaId: null,
        progress: 0,
        isPlaying: true,
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socketRef.current = socket;
  }, [screenId, onPlaylistUpdate]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return socketRef.current;
}
```

- [ ] **Step 2: Create usePlaylist hook**

Create `src/client/player/hooks/usePlaylist.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { PlayerPlaylistItem } from '@shared/types';

interface UsePlaylistOptions {
  screenId: string;
}

export function usePlaylist({ screenId }: UsePlaylistOptions) {
  const [playlist, setPlaylist] = useState<PlayerPlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/api/screens/${screenId}/playlist`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('invalid-screen');
          return;
        }
        throw new Error('Failed to fetch playlist');
      }
      const data = await res.json();
      setPlaylist(data);
      setError(null);
    } catch (err) {
      console.error('[Playlist] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [screenId]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const updatePlaylist = useCallback((newPlaylist: PlayerPlaylistItem[]) => {
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
  }, []);

  const currentItem = playlist[currentIndex] || null;

  return {
    playlist,
    currentItem,
    currentIndex,
    loading,
    error,
    goToNext,
    updatePlaylist,
    refetch: fetchPlaylist,
  };
}
```

- [ ] **Step 3: Create Player component**

Create `src/client/player/Player.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { usePlaylist } from './hooks/usePlaylist';
import { useSocket } from '@shared/hooks/useSocket';
import type { PlayerPlaylistItem } from '@shared/types';

interface Props {
  screenId: string;
}

export default function Player({ screenId }: Props) {
  const { playlist, currentItem, loading, error, goToNext, updatePlaylist } = usePlaylist({ screenId });
  const [fade, setFade] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  useSocket({
    screenId,
    onPlaylistUpdate: (data) => {
      setFade(true);
      setTimeout(() => {
        updatePlaylist(data as PlayerPlaylistItem[]);
        setFade(false);
      }, 300);
    },
  });

  // Handle image duration timer
  useEffect(() => {
    if (!currentItem || currentItem.type === 'video') return;

    timerRef.current = window.setTimeout(() => {
      goToNext();
    }, currentItem.duration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, goToNext]);

  // Handle video end
  const handleVideoEnd = () => {
    goToNext();
  };

  // Handle video error - skip to next
  const handleVideoError = () => {
    console.error('[Player] Video error, skipping');
    goToNext();
  };

  // Empty playlist refresh
  useEffect(() => {
    if (playlist.length === 0 && !loading) {
      const interval = setInterval(() => {
        window.location.reload();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [playlist.length, loading]);

  if (error === 'invalid-screen') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <p className="text-xl">Man hinh khong ton tai</p>
        <p className="text-sm mt-2 text-gray-400">Vui long kiem tra cau hinh URL</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <div className="w-32 h-32 mb-4">
          <svg viewBox="0 0 100 100" className="text-agribank-green">
            <circle cx="50" cy="50" r="45" fill="currentColor" />
            <text x="50" y="55" textAnchor="middle" fill="white" fontSize="14">
              AGRIBANK
            </text>
          </svg>
        </div>
        <p className="text-gray-400">Chua co noi dung</p>
        <p className="text-sm text-gray-500 mt-1">Vui long cap nhat playlist</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-black transition-opacity duration-300 ${
        fade ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {currentItem?.type === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.mediaId}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          className="w-full h-full object-contain"
        />
      ) : currentItem?.type === 'image' ? (
        <img
          key={currentItem.mediaId}
          src={currentItem.url}
          alt=""
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error('[Player] Image error, skipping');
            goToNext();
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Update Player App**

Replace `src/client/player/App.tsx`:

```tsx
import Player from './Player';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const screenId = params.get('screen');

  if (!screenId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <p className="text-xl">Missing screen parameter</p>
        <p className="text-sm mt-2 text-gray-400">URL: /player?screen=&lt;screen-uuid&gt;</p>
      </div>
    );
  }

  return <Player screenId={screenId} />;
}
```

- [ ] **Step 5: Test player**

Run:
```bash
npm run dev
```

Get a screen ID from the admin, then open:
`http://localhost:5173/player.html?screen=<screen-id>`

Expected: Player shows empty state or playlist content

- [ ] **Step 6: Commit**

```bash
git add src/client/
git commit -m "feat: add player with video/image playback and realtime updates"
```

---

## Task 15: Agribank Logo SVG

**Files:**
- Create: `public/agribank-logo.svg`

- [ ] **Step 1: Create logo placeholder**

Create `public/agribank-logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="90" fill="#00723F"/>
  <text x="100" y="90" text-anchor="middle" fill="white" font-size="24" font-weight="bold">
    AGRIBANK
  </text>
  <text x="100" y="120" text-anchor="middle" fill="#FFD700" font-size="12">
    Digital Signage
  </text>
</svg>
```

- [ ] **Step 2: Update Player empty state to use logo**

Edit `src/client/player/Player.tsx`, update empty playlist section:

```tsx
if (playlist.length === 0) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
      <img src="/agribank-logo.svg" alt="Agribank" className="w-48 h-48 mb-4" />
      <p className="text-gray-400">Chua co noi dung</p>
      <p className="text-sm text-gray-500 mt-1">Vui long cap nhat playlist</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add public/agribank-logo.svg src/client/player/Player.tsx
git commit -m "feat: add Agribank logo and update player empty state"
```

---

## Task 16: Production Build & Docker

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `tsconfig.server.json`
- Modify: `package.json`

- [ ] **Step 1: Create server tsconfig**

Create `tsconfig.server.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "outDir": "dist/server",
    "rootDir": "src/server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false
  },
  "include": ["src/server/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

- [ ] **Step 3: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/digital_signage
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-change-me-in-production}
      - PORT=3000
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=digital_signage
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

- [ ] **Step 4: Update package.json build script**

Edit `package.json`, update build script:

```json
{
  "scripts": {
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js"
  }
}
```

- [ ] **Step 5: Test production build**

Run:
```bash
npm run build
```

Expected: No errors, dist/ folder created

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml tsconfig.server.json package.json
git commit -m "feat: add Docker configuration and production build"
```

---

## Task 17: Final Integration Test

**Files:** None (testing only)

- [ ] **Step 1: Start full development environment**

Run:
```bash
npm run dev
```

- [ ] **Step 2: Test admin login**

Open http://localhost:5173
Login with admin/admin123

Expected: See dashboard with 3 screens

- [ ] **Step 3: Test media upload**

Click "Upload Media", select a video or image file
Expected: File appears in media library

- [ ] **Step 4: Test playlist management**

1. Select a screen
2. Add media to playlist
3. Reorder items by dragging
4. Click "Save Playlist"

Expected: Playlist saved successfully

- [ ] **Step 5: Test player**

Get a screen ID from admin dashboard
Open: http://localhost:5173/player.html?screen=<screen-id>

Expected: Player shows playlist content or empty state

- [ ] **Step 6: Test realtime update**

With player open, update playlist in admin
Expected: Player content updates with fade transition

- [ ] **Step 7: Create final commit**

```bash
git add -A
git commit -m "feat: complete Agribank Digital Signage MVP"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Admin login works
- [ ] Screen list displays 3 screens
- [ ] Media upload works (video/image)
- [ ] Playlist editor allows reorder
- [ ] Playlist save triggers realtime update
- [ ] Player displays content
- [ ] Player handles empty playlist with logo
- [ ] Player loops through playlist
- [ ] Video plays muted
- [ ] Image displays for duration then advances
- [ ] WebSocket reconnects after disconnect
- [ ] Production build completes without errors
- [ ] Final Integration Test