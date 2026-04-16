import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RESOLUTION_PATTERN = /^([1-9]\d{2,4})x([1-9]\d{2,4})$/i;

function normalizeResolutionInput(value: unknown): { valid: true; value: string | null | undefined } | { valid: false; message: string } {
  if (value === undefined) {
    return { valid: true, value: undefined };
  }

  if (value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      message: 'Resolution must be a string in WxH format, e.g. 1920x1080',
    };
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { valid: true, value: null };
  }

  if (!RESOLUTION_PATTERN.test(normalized)) {
    return {
      valid: false,
      message: 'Resolution must be in WxH format, e.g. 1920x1080',
    };
  }

  return { valid: true, value: normalized };
}

function getScreenId(idParam: string | string[] | undefined): string | null {
  if (typeof idParam === 'string' && idParam) {
    return idParam;
  }

  if (Array.isArray(idParam)) {
    return idParam[0] ?? null;
  }

  return null;
}

// GET /api/screens - List all screens
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const screens = await prisma.screen.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(screens);
});

// GET /api/screens/:id - Get single screen
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findUnique({
    where: { id: screenId },
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

  const normalizedResolution = normalizeResolutionInput(resolution);
  if (!normalizedResolution.valid) {
    return res.status(400).json({ message: normalizedResolution.message });
  }

  const screen = await prisma.screen.create({
    data: { name, location, resolution: normalizedResolution.value },
  });

  res.status(201).json(screen);
});

// PUT /api/screens/:id - Update screen
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, location, resolution } = req.body;
  const screenId = getScreenId(req.params.id);

  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const normalizedResolution = normalizeResolutionInput(resolution);
  if (!normalizedResolution.valid) {
    return res.status(400).json({ message: normalizedResolution.message });
  }

  const screen = await prisma.screen.update({
    where: { id: screenId },
    data: { name, location, resolution: normalizedResolution.value },
  });

  res.json(screen);
});

// DELETE /api/screens/:id - Delete screen
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  await prisma.screen.delete({
    where: { id: screenId },
  });

  res.status(204).send();
});

// GET /api/screens/:id/config - Get public screen config for Player
router.get('/:id/config', async (req, res) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findUnique({
    where: { id: screenId },
    select: {
      id: true,
      resolution: true,
    },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  res.json(screen);
});

// GET /api/screens/:id/playlist-full - Get full playlist with media details (admin)
router.get('/:id/playlist-full', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const items = await prisma.playlistItem.findMany({
    where: { screenId },
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

// GET /api/screens/:id/playlist - Get playlist (no auth for Player)
router.get('/:id/playlist', async (req, res) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const items = await prisma.playlistItem.findMany({
    where: { screenId },
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
  const screenId = getScreenId(req.params.id);

  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

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

  // Notify connected players via WebSocket
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

  res.json(updatedItems.map((item) => ({
    ...item,
    media: {
      ...item.media,
      fileSize: Number(item.media.fileSize),
    },
  })));
});

export default router;
