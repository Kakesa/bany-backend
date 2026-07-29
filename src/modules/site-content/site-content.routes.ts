import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { siteContentController } from './site-content.controller.js';

const router = Router();

router.get('/', (req, res, next) => {
  siteContentController.get(req, res).catch(next);
});

router.put('/', requireAdmin, (req, res, next) => {
  siteContentController.update(req, res).catch(next);
});

export default router;
