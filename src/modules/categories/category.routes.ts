import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { categoryController } from './category.controller.js';

const router = Router();

router.get('/', (req, res, next) => {
  categoryController.list(req, res).catch(next);
});

router.post('/', requireAdmin, (req, res, next) => {
  categoryController.create(req, res).catch(next);
});

router.put('/:id', requireAdmin, (req, res, next) => {
  categoryController.update(req, res).catch(next);
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  categoryController.remove(req, res).catch(next);
});

router.get('/:slug', (req, res, next) => {
  categoryController.getBySlug(req, res).catch(next);
});

export default router;
