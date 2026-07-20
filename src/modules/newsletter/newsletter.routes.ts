import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { newsletterController } from './newsletter.controller.js';

const router = Router();

router.post('/subscribe', (req, res, next) => {
  newsletterController.subscribe(req, res).catch(next);
});

router.get('/subscribers', requireAdmin, (req, res, next) => {
  newsletterController.list(req, res).catch(next);
});

export default router;
