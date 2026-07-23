import { Router } from 'express';
import { contactService } from './contact.service.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await contactService.send(req.body || {});
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
