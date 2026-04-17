import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireScreenAccess } from '../middleware/requireRole';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PlayerPlaylistRow = {
  mediaId: string;
  duration: number;
  media: {
    filePath: string;
    fileType: 'video' | 'image';
  };
};

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

// GET /api/screens - List all screens (admins) or own screen only (screen_manager)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const where: { deletedAt: null; id?: string } = { deletedAt: null };
  if (req.role === 'screen_manager') {
    if (!req.screenId) return res.json([]);
    where.id = req.screenId;
  }
  const screens = await prisma.screen.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(screens);
});

// GET /api/screens/:id - Get single screen
router.get('/:id', authMiddleware, requireScreenAccess('id'), async (req: AuthRequest, res: Response) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  res.json(screen);
});

// POST /api/screens - Create screen
router.post('/', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
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
router.put('/:id', authMiddleware, requireScreenAccess('id'), async (req: AuthRequest, res: Response) => {
  const { name, location, resolution } = req.body;
  const screenId = getScreenId(req.params.id);

  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const normalizedResolution = normalizeResolutionInput(resolution);
  if (!normalizedResolution.valid) {
    return res.status(400).json({ message: normalizedResolution.message });
  }

  const existingScreen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
    select: { id: true },
  });

  if (!existingScreen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  const screen = await prisma.screen.update({
    where: { id: screenId },
    data: { name, location, resolution: normalizedResolution.value },
  });

  res.json(screen);
});

// DELETE /api/screens/:id - Delete screen
router.delete('/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const result = await prisma.screen.updateMany({
    where: {
      id: screenId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      status: 'offline',
      activeProfileId: null,
    },
  });

  if (result.count === 0) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  res.status(204).send();
});

// GET /api/screens/:id/config - Get public screen config for Player
router.get('/:id/config', async (req, res) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
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

// GET /api/screens/:id/playlist - Get active profile playlist (no auth for Player)
router.get('/:id/playlist', async (req, res) => {
  const screenId = getScreenId(req.params.id);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
    select: {
      id: true,
      activeProfileId: true,
    },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  if (!screen.activeProfileId) {
    return res.json([]);
  }

  const items = await (prisma.playlistItem as unknown as {
    findMany: (args: unknown) => Promise<PlayerPlaylistRow[]>;
  }).findMany({
    where: { profileId: screen.activeProfileId },
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

export default router;
