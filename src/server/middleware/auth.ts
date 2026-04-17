import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  userId?: string;
  role?: UserRole;
  screenId?: string | null;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  screenId: string | null;
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
    req.role = payload.role;
    req.screenId = payload.screenId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
