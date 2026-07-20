import type { Request, Response } from 'express';
import { newsletterService } from './newsletter.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class NewsletterController {
  async subscribe(req: Request, res: Response) {
    try {
      const result = await newsletterService.subscribe(req.body?.email, req.body?.source || 'blog');
      res.status(result.created ? 201 : 200).json({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async list(req: Request, res: Response) {
    const data = await newsletterService.listSubscribers();
    res.json(data);
  }
}

export const newsletterController = new NewsletterController();
