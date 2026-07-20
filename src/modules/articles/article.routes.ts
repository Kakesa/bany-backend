import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { articleController } from './article.controller.js';

const router = Router();

router.get('/', (req, res, next) => {
  articleController.list(req, res).catch(next);
});

router.get('/admin/all', requireAdmin, (req, res, next) => {
  articleController.listAdmin(req, res).catch(next);
});

router.get('/:slug', (req, res, next) => {
  articleController.getBySlug(req, res).catch(next);
});

router.post('/:id/like', (req, res, next) => {
  articleController.like(req, res).catch(next);
});

router.post('/:id/unlike', (req, res, next) => {
  articleController.unlike(req, res).catch(next);
});

router.post('/', requireAdmin, (req, res, next) => {
  articleController.create(req, res).catch(next);
});

router.put('/:id', requireAdmin, (req, res, next) => {
  articleController.update(req, res).catch(next);
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  articleController.remove(req, res).catch(next);
});

export default router;
