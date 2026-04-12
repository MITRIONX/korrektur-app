import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
