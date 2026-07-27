import type { Request, Response } from 'express';
import { newsletterService } from './newsletter.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

async function handle(res: Response, fn: () => Promise<unknown>, successStatus = 200) {
  try {
    const data = await fn();
    res.status(successStatus).json(data);
  } catch (err) {
    res.status(getErrorStatus(err)).json({
      message: err instanceof Error ? err.message : 'Erreur',
    });
  }
}

export class NewsletterController {
  subscribe(req: Request, res: Response) {
    return handle(
      res,
      () =>
        newsletterService.subscribe(req.body?.email, req.body?.source || 'blog', {
          firstName: req.body?.firstName,
          lastName: req.body?.lastName,
          tags: req.body?.tags,
        }),
      201
    ).then(() => undefined);
  }

  async subscribeWithStatus(req: Request, res: Response) {
    try {
      const result = await newsletterService.subscribe(req.body?.email, req.body?.source || 'blog', {
        firstName: req.body?.firstName,
        lastName: req.body?.lastName,
        tags: req.body?.tags,
      });
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

  unsubscribe(req: Request, res: Response) {
    const token = (req.query.token as string) || req.body?.token;
    return handle(res, () => newsletterService.unsubscribeByToken(token));
  }

  list(req: Request, res: Response) {
    return handle(res, () =>
      newsletterService.listSubscribers({
        q: req.query.q as string,
        source: req.query.source as string,
        tag: req.query.tag as string,
        active: req.query.active as string,
      })
    );
  }

  setActive(req: Request, res: Response) {
    return handle(res, () => newsletterService.setActive(req.params.id, Boolean(req.body?.active)));
  }

  updateSubscriber(req: Request, res: Response) {
    return handle(res, () => newsletterService.updateSubscriber(req.params.id, req.body || {}));
  }

  remove(req: Request, res: Response) {
    return handle(res, () => newsletterService.deleteSubscriber(req.params.id));
  }

  sendCampaign(req: Request, res: Response) {
    return handle(res, () =>
      newsletterService.sendCampaign({
        subject: req.body?.subject,
        message: req.body?.message,
      })
    );
  }

  overview(req: Request, res: Response) {
    return handle(res, () => newsletterService.overview());
  }

  listTemplates(req: Request, res: Response) {
    return handle(res, () => newsletterService.listTemplates());
  }

  createTemplate(req: Request, res: Response) {
    return handle(res, () => newsletterService.createTemplate(req.body || {}), 201);
  }

  updateTemplate(req: Request, res: Response) {
    return handle(res, () => newsletterService.updateTemplate(req.params.id, req.body || {}));
  }

  deleteTemplate(req: Request, res: Response) {
    return handle(res, () => newsletterService.deleteTemplate(req.params.id));
  }

  listCampaigns(req: Request, res: Response) {
    return handle(res, () => newsletterService.listCampaigns());
  }

  getCampaign(req: Request, res: Response) {
    return handle(res, () => newsletterService.getCampaign(req.params.id));
  }

  createCampaign(req: Request, res: Response) {
    return handle(res, () => newsletterService.createCampaign(req.body || {}), 201);
  }

  updateCampaign(req: Request, res: Response) {
    return handle(res, () => newsletterService.updateCampaign(req.params.id, req.body || {}));
  }

  deleteCampaign(req: Request, res: Response) {
    return handle(res, () => newsletterService.deleteCampaign(req.params.id));
  }

  sendCampaignById(req: Request, res: Response) {
    return handle(res, () => newsletterService.sendCampaignById(req.params.id));
  }
}

export const newsletterController = new NewsletterController();
