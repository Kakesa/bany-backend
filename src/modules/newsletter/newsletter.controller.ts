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

  async unsubscribe(req: Request, res: Response) {
    try {
      const token = (req.query.token as string) || req.body?.token;
      const result = await newsletterService.unsubscribeByToken(token);
      res.json(result);
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

  async setActive(req: Request, res: Response) {
    try {
      const active = Boolean(req.body?.active);
      const data = await newsletterService.setActive(req.params.id, active);
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const data = await newsletterService.deleteSubscriber(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async sendCampaign(req: Request, res: Response) {
    try {
      const data = await newsletterService.sendCampaign({
        subject: req.body?.subject,
        message: req.body?.message,
      });
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const newsletterController = new NewsletterController();
