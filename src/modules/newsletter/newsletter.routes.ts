import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { newsletterController } from './newsletter.controller.js';

const router = Router();

router.post('/subscribe', (req, res, next) => {
  newsletterController.subscribe(req, res).catch(next);
});

router.get('/unsubscribe', (req, res, next) => {
  newsletterController.unsubscribe(req, res).catch(next);
});

router.post('/unsubscribe', (req, res, next) => {
  newsletterController.unsubscribe(req, res).catch(next);
});

router.get('/subscribers', requireAdmin, (req, res, next) => {
  newsletterController.list(req, res).catch(next);
});

router.patch('/subscribers/:id', requireAdmin, (req, res, next) => {
  newsletterController.setActive(req, res).catch(next);
});

router.delete('/subscribers/:id', requireAdmin, (req, res, next) => {
  newsletterController.remove(req, res).catch(next);
});

router.post('/campaign', requireAdmin, (req, res, next) => {
  newsletterController.sendCampaign(req, res).catch(next);
});

export default router;
