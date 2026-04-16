import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  res.json(updatedItems);
});

export default router;
