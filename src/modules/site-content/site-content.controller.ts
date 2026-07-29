import type { Request, Response } from 'express';
import { siteContentService } from './site-content.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class SiteContentController {
  async get(_req: Request, res: Response) {
    const data = await siteContentService.getOrCreate();
    res.json(data);
  }

  async update(req: Request, res: Response) {
    try {
      const data = await siteContentService.updateStatistics(req.body?.statistics);
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const siteContentController = new SiteContentController();
