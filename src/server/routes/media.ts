import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireRole';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getMediaId(idParam: string | string[] | undefined): string | null {
  if (typeof idParam === 'string' && idParam) {
    return idParam;
  }

  if (Array.isArray(idParam)) {
    return idParam[0] ?? null;
  }

  return null;
}

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

function normalizeFilename(value: string): string {
  if (!value) return value;

  // Many multipart uploads (multer/busboy) surface UTF-8 filenames as latin1,
  // causing mojibake like "tÃªn file" instead of "tên file".
  // Heuristic: only decode when mojibake markers are present.
  const hasMojibake = /Ã.|Â.|áº|Ä|Å/.test(value);
  if (!hasMojibake) return value;

  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function normalizeMediaOutput<T extends { originalName: string }>(item: T): T {
  return {
    ...item,
    originalName: normalizeFilename(item.originalName),
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const normalizedOriginalName = normalizeFilename(file.originalname);
    const ext = path.extname(normalizedOriginalName) || path.extname(file.originalname);
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
    items: items.map((item) =>
      normalizeMediaOutput({
        ...item,
        fileSize: Number(item.fileSize),
      })
    ),
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

  let duration: number | null = null;
  if (fileType === 'video' && req.body?.duration !== undefined) {
    const parsed = Number(req.body.duration);
    if (Number.isFinite(parsed) && parsed >= 1) {
      duration = Math.round(parsed);
    }
  }

  const media = await prisma.media.create({
    data: {
      filename: file.filename,
      originalName: normalizeFilename(file.originalname),
      filePath: `/uploads/${file.filename}`,
      fileType,
      fileSize: BigInt(file.size),
      mimeType: file.mimetype,
      duration,
    },
  });

  res.status(201).json(
    normalizeMediaOutput({
      ...media,
      fileSize: Number(media.fileSize),
    })
  );
});

// PATCH /api/media/:id/duration - Update video duration (used for back-filling)
router.patch('/:id/duration', authMiddleware, async (req: AuthRequest, res: Response) => {
  const mediaId = getMediaId(req.params.id);
  if (!mediaId) {
    return res.status(400).json({ message: 'Invalid media id' });
  }

  const parsed = Number(req.body?.duration);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return res.status(400).json({ message: 'Invalid duration' });
  }

  const existing = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!existing) {
    return res.status(404).json({ message: 'Media not found' });
  }
  if (existing.fileType !== 'video') {
    return res.status(400).json({ message: 'Media is not a video' });
  }

  const media = await prisma.media.update({
    where: { id: mediaId },
    data: { duration: Math.round(parsed) },
  });

  res.json({
    ...media,
    fileSize: Number(media.fileSize),
  });
});

// DELETE /api/media/:id - Delete media
router.delete('/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  const mediaId = getMediaId(req.params.id);
  if (!mediaId) {
    return res.status(400).json({ message: 'Invalid media id' });
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
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
    where: { id: mediaId },
  });

  res.status(204).send();
});

export default router;
