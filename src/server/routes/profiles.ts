import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PlaylistPayloadItem = {
  mediaId: string;
  url: string;
  type: 'video' | 'image';
  duration: number;
};

function getParamValue(param: string | string[] | undefined): string | null {
  if (typeof param === 'string' && param) {
    return param;
  }

  if (Array.isArray(param)) {
    return param[0] ?? null;
  }

  return null;
}

function normalizeProfileName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function toPlayerPlaylist(
  items: Array<{
    mediaId: string;
    duration: number;
    media: {
      filePath: string;
      fileType: 'video' | 'image';
    };
  }>
): PlaylistPayloadItem[] {
  return items.map((item) => ({
    mediaId: item.mediaId,
    url: item.media.filePath,
    type: item.media.fileType,
    duration: item.duration,
  }));
}

// GET /api/profiles/by-screen/:screenId - List profiles of a screen
router.get('/by-screen/:screenId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screenId = getParamValue(req.params.screenId);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
    select: {
      id: true,
      activeProfileId: true,
      profiles: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  res.json(
    screen.profiles.map((profile) => ({
      ...profile,
      isActive: profile.id === screen.activeProfileId,
    }))
  );
});

// POST /api/profiles/by-screen/:screenId - Create profile for a screen
router.post('/by-screen/:screenId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const screenId = getParamValue(req.params.screenId);
  if (!screenId) {
    return res.status(400).json({ message: 'Invalid screen id' });
  }

  const name = normalizeProfileName(req.body?.name);
  if (!name) {
    return res.status(400).json({ message: 'Profile name is required' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
    select: { id: true, activeProfileId: true },
  });

  if (!screen) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        screenId,
        name,
      },
    });

    return res.status(201).json({
      ...profile,
      isActive: profile.id === screen.activeProfileId,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Profile name already exists for this screen' });
    }
    throw error;
  }
});

// PUT /api/profiles/:profileId/activate - Set profile active
router.put('/:profileId/activate', authMiddleware, async (req: AuthRequest, res: Response) => {
  const profileId = getParamValue(req.params.profileId);
  if (!profileId) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      screenId: true,
      screen: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (profile.screen?.deletedAt) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  await prisma.screen.update({
    where: { id: profile.screenId },
    data: { activeProfileId: profile.id },
  });

  const items = await prisma.playlistItem.findMany({
    where: { profileId: profile.id },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`screen:${profile.screenId}`).emit('playlist_updated', {
      screenId: profile.screenId,
      playlist: toPlayerPlaylist(items),
    });
  }

  return res.json({
    profileId: profile.id,
    screenId: profile.screenId,
    isActive: true,
  });
});

// PUT /api/profiles/:profileId - Rename profile
router.put('/:profileId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const profileId = getParamValue(req.params.profileId);
  if (!profileId) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }

  const name = normalizeProfileName(req.body?.name);
  if (!name) {
    return res.status(400).json({ message: 'Profile name is required' });
  }

  const existing = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      screenId: true,
      screen: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (existing.screen?.deletedAt) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  try {
    const updated = await prisma.profile.update({
      where: { id: profileId },
      data: { name },
    });

    const screen = await prisma.screen.findUnique({
      where: { id: existing.screenId },
      select: { activeProfileId: true },
    });

    return res.json({
      ...updated,
      isActive: screen?.activeProfileId === updated.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Profile name already exists for this screen' });
    }
    throw error;
  }
});

// DELETE /api/profiles/:profileId - Delete profile
router.delete('/:profileId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const profileId = getParamValue(req.params.profileId);
  if (!profileId) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      screenId: true,
      screen: {
        select: {
          activeProfileId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (profile.screen.deletedAt) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  const profileCount = await prisma.profile.count({
    where: { screenId: profile.screenId },
  });

  if (profileCount <= 1) {
    return res.status(400).json({ message: 'Cannot delete the last profile of a screen' });
  }

  const isActive = profile.screen.activeProfileId === profile.id;

  await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.screen.update({
        where: { id: profile.screenId },
        data: { activeProfileId: null },
      });
    }

    await tx.profile.delete({
      where: { id: profile.id },
    });
  });

  if (isActive) {
    const io = req.app.get('io');
    if (io) {
      io.to(`screen:${profile.screenId}`).emit('playlist_updated', {
        screenId: profile.screenId,
        playlist: [],
      });
    }
  }

  return res.status(204).send();
});

// GET /api/profiles/:profileId/playlist-full - Get full playlist with media details
router.get('/:profileId/playlist-full', authMiddleware, async (req: AuthRequest, res: Response) => {
  const profileId = getParamValue(req.params.profileId);
  if (!profileId) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      screen: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (profile.screen?.deletedAt) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  const items = await prisma.playlistItem.findMany({
    where: { profileId },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  return res.json(items.map((item) => ({
    ...item,
    media: {
      ...item.media,
      fileSize: Number(item.media.fileSize),
    },
  })));
});

// POST /api/profiles/:profileId/playlist - Save playlist for a profile
router.post('/:profileId/playlist', authMiddleware, async (req: AuthRequest, res: Response) => {
  const profileId = getParamValue(req.params.profileId);
  if (!profileId) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }

  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Items array required' });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      screenId: true,
      screen: {
        select: {
          activeProfileId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  if (profile.screen.deletedAt) {
    return res.status(404).json({ message: 'Screen not found' });
  }

  await prisma.playlistItem.deleteMany({
    where: { profileId },
  });

  const createData = items.map((item: { mediaId: string; duration: number }, index: number) => ({
    profileId,
    mediaId: item.mediaId,
    orderIndex: index,
    duration: Number(item.duration) > 0 ? Number(item.duration) : 10,
  }));

  if (createData.length > 0) {
    await prisma.playlistItem.createMany({
      data: createData,
    });
  }

  const updatedItems = await prisma.playlistItem.findMany({
    where: { profileId },
    orderBy: { orderIndex: 'asc' },
    include: { media: true },
  });

  const isActive = profile.screen.activeProfileId === profile.id;
  if (isActive) {
    const io = req.app.get('io');
    if (io) {
      io.to(`screen:${profile.screenId}`).emit('playlist_updated', {
        screenId: profile.screenId,
        playlist: toPlayerPlaylist(updatedItems),
      });
    }
  }

  return res.json(updatedItems.map((item) => ({
    ...item,
    media: {
      ...item.media,
      fileSize: Number(item.media.fileSize),
    },
  })));
});

export default router;
