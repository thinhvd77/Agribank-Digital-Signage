import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];

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
