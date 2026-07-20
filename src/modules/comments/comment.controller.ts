import type { Request, Response } from 'express';
import { commentService } from './comment.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class CommentController {
  async listByArticle(req: Request, res: Response) {
    try {
      const data = await commentService.listByArticle(req.params.articleRef);
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const comment = await commentService.create(req.params.articleRef, req.body);
      res.status(201).json(comment);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async like(req: Request, res: Response) {
    try {
      const comment = await commentService.like(req.params.id);
      res.json(comment);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async unlike(req: Request, res: Response) {
    try {
      const comment = await commentService.unlike(req.params.id);
      res.json(comment);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const result = await commentService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async listAll(_req: Request, res: Response) {
    try {
      const data = await commentService.listAll();
      res.json(data);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const commentController = new CommentController();
