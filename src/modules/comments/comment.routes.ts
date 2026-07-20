import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { commentController } from './comment.controller.js';

const router = Router();

router.get('/admin/all', requireAdmin, (req, res, next) => {
  commentController.listAll(req, res).catch(next);
});

router.get('/article/:articleRef', (req, res, next) => {
  commentController.listByArticle(req, res).catch(next);
});

router.post('/article/:articleRef', (req, res, next) => {
  commentController.create(req, res).catch(next);
});

router.post('/:id/like', (req, res, next) => {
  commentController.like(req, res).catch(next);
});

router.post('/:id/unlike', (req, res, next) => {
  commentController.unlike(req, res).catch(next);
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  commentController.remove(req, res).catch(next);
});

export default router;
