import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface AuthRequest extends Request {
  adminEmail?: string;
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as { email: string };
    req.adminEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}
