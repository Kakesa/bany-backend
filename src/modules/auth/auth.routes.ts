import { Router } from 'express';
import { authController } from './auth.controller.js';

const router = Router();

router.post('/login', (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.get('/me', (req, res) => {
  authController.me(req, res);
});

export default router;
