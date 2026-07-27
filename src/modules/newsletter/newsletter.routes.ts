import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { newsletterController } from './newsletter.controller.js';

const router = Router();

router.post('/subscribe', (req, res, next) => {
  newsletterController.subscribeWithStatus(req, res).catch(next);
});

router.get('/unsubscribe', (req, res, next) => {
  newsletterController.unsubscribe(req, res).catch(next);
});

router.post('/unsubscribe', (req, res, next) => {
  newsletterController.unsubscribe(req, res).catch(next);
});

router.get('/overview', requireAdmin, (req, res, next) => {
  newsletterController.overview(req, res).catch(next);
});

router.get('/subscribers', requireAdmin, (req, res, next) => {
  newsletterController.list(req, res).catch(next);
});

router.patch('/subscribers/:id', requireAdmin, (req, res, next) => {
  newsletterController.updateSubscriber(req, res).catch(next);
});

router.delete('/subscribers/:id', requireAdmin, (req, res, next) => {
  newsletterController.remove(req, res).catch(next);
});

router.get('/templates', requireAdmin, (req, res, next) => {
  newsletterController.listTemplates(req, res).catch(next);
});

router.post('/templates', requireAdmin, (req, res, next) => {
  newsletterController.createTemplate(req, res).catch(next);
});

router.put('/templates/:id', requireAdmin, (req, res, next) => {
  newsletterController.updateTemplate(req, res).catch(next);
});

router.delete('/templates/:id', requireAdmin, (req, res, next) => {
  newsletterController.deleteTemplate(req, res).catch(next);
});

router.get('/campaigns', requireAdmin, (req, res, next) => {
  newsletterController.listCampaigns(req, res).catch(next);
});

router.get('/campaigns/:id', requireAdmin, (req, res, next) => {
  newsletterController.getCampaign(req, res).catch(next);
});

router.post('/campaigns', requireAdmin, (req, res, next) => {
  newsletterController.createCampaign(req, res).catch(next);
});

router.put('/campaigns/:id', requireAdmin, (req, res, next) => {
  newsletterController.updateCampaign(req, res).catch(next);
});

router.delete('/campaigns/:id', requireAdmin, (req, res, next) => {
  newsletterController.deleteCampaign(req, res).catch(next);
});

router.post('/campaigns/:id/send', requireAdmin, (req, res, next) => {
  newsletterController.sendCampaignById(req, res).catch(next);
});

/** Legacy plain broadcast */
router.post('/campaign', requireAdmin, (req, res, next) => {
  newsletterController.sendCampaign(req, res).catch(next);
});

export default router;
