import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
