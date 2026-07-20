import { Router } from 'express';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import { uploadController } from './upload.controller.js';
import { upload } from './upload.service.js';

const router = Router();

router.post('/', requireAdmin, upload.single('file'), (req, res) => {
  uploadController.uploadOne(req, res);
});

router.post('/multiple', requireAdmin, upload.array('files', 10), (req, res) => {
  uploadController.uploadMany(req, res);
});

export default router;
