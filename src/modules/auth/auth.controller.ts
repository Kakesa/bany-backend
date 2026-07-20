import type { Request, Response } from 'express';
import { authService } from './auth.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body?.email, req.body?.password);
      res.json(result);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  me(req: Request, res: Response) {
    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      res.json(authService.me(token));
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const authController = new AuthController();
