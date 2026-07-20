import type { Request, Response } from 'express';
import { articleService } from './article.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class ArticleController {
  async list(req: Request, res: Response) {
    const data = await articleService.listPublic({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      author: typeof req.query.author === 'string' ? req.query.author : undefined,
      tag: typeof req.query.tag === 'string' ? req.query.tag : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 9,
      featured: req.query.featured === 'true',
    });
    res.json(data);
  }

  async listAdmin(_req: Request, res: Response) {
    const data = await articleService.listAdmin();
    res.json(data);
  }

  async getBySlug(req: Request, res: Response) {
    const data = await articleService.getBySlug(req.params.slug);
    if (!data) {
      return res.status(404).json({ message: 'Article introuvable' });
    }
    res.json(data);
  }

  async create(req: Request, res: Response) {
    try {
      const article = await articleService.create(req.body);
      res.status(201).json(article);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const article = await articleService.update(req.params.id, req.body);
      res.json(article);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async like(req: Request, res: Response) {
    try {
      const article = await articleService.like(req.params.id);
      res.json(article);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async unlike(req: Request, res: Response) {
    try {
      const article = await articleService.unlike(req.params.id);
      res.json(article);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const result = await articleService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const articleController = new ArticleController();
