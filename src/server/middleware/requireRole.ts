import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Yêu cầu quyền quản trị' });
  }
  next();
}

export function requireScreenAccess(paramName: string) {
  return function (req: AuthRequest, res: Response, next: NextFunction) {
    if (req.role === 'admin') {
      return next();
    }

    const targetScreenId = req.params[paramName];
    if (!targetScreenId || typeof targetScreenId !== 'string') {
      return res.status(400).json({ message: 'Invalid screen id' });
    }

    if (req.screenId !== targetScreenId) {
      return res.status(403).json({ message: 'Không có quyền truy cập màn hình này' });
    }

    next();
  };
}
