import { Router, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireRole';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  screenId: true,
  createdAt: true,
  updatedAt: true,
  screen: { select: { id: true, name: true, location: true } },
} as const;

function validateUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return null;
  return trimmed;
}

function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length < 8) return null;
  return value;
}

// GET /api/users - list screen_managers
router.get('/', authMiddleware, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'screen_manager' },
    orderBy: { createdAt: 'desc' },
    select: USER_SELECT,
  });
  res.json(users);
});

// POST /api/users - create screen_manager
router.post('/', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  const username = validateUsername(req.body?.username);
  if (!username) {
    return res.status(400).json({ message: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  }

  const password = validatePassword(req.body?.password);
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
  }

  const screenId = typeof req.body?.screenId === 'string' ? req.body.screenId : null;
  if (!screenId) {
    return res.status(400).json({ message: 'Vui lòng chọn màn hình' });
  }

  const screen = await prisma.screen.findFirst({
    where: { id: screenId, deletedAt: null },
    select: { id: true },
  });
  if (!screen) {
    return res.status(404).json({ message: 'Màn hình không tồn tại' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'screen_manager',
        screenId,
      },
      select: USER_SELECT,
    });
    return res.status(201).json(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes('screen_id')) {
        return res.status(409).json({ message: 'Màn hình này đã có tài khoản quản lý' });
      }
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' });
    }
    throw error;
  }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const password = validatePassword(req.body?.password);
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing) {
    return res.status(404).json({ message: 'Người dùng không tồn tại' });
  }
  if (existing.role !== 'screen_manager') {
    return res.status(400).json({ message: 'Chỉ có thể đặt lại mật khẩu cho tài khoản quản lý màn hình' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  return res.status(204).send();
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (req.userId === id) {
    return res.status(400).json({ message: 'Không thể xoá tài khoản của chính bạn' });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing) {
    return res.status(404).json({ message: 'Người dùng không tồn tại' });
  }
  if (existing.role !== 'screen_manager') {
    return res.status(400).json({ message: 'Chỉ có thể xoá tài khoản quản lý màn hình' });
  }

  await prisma.user.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
