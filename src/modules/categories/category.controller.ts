import type { Request, Response } from 'express';
import { categoryService } from './category.service.js';

function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return 500;
}

export class CategoryController {
  async list(_req: Request, res: Response) {
    const items = await categoryService.listWithCounts();
    res.json(items);
  }

  async getBySlug(req: Request, res: Response) {
    const data = await categoryService.getBySlug(req.params.slug);
    if (!data) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }
    res.json(data);
  }

  async create(req: Request, res: Response) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json(category);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json(category);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const result = await categoryService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(getErrorStatus(err)).json({
        message: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }
}

export const categoryController = new CategoryController();
