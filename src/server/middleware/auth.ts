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
