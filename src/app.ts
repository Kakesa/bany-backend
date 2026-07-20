import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { newsletterService } from './modules/newsletter/newsletter.service.js';
import { uploadsDir } from './modules/upload/upload.service.js';

import authRoutes from './modules/auth/auth.routes.js';
import articleRoutes from './modules/articles/article.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import newsletterRoutes from './modules/newsletter/newsletter.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import commentRoutes from './modules/comments/comment.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: [
        env.frontendUrl,
        env.adminUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'bany-backend', db: 'mongodb' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/comments', commentRoutes);

  // Compatibility alias for existing frontend mailchimp service
  app.post('/api/mailchimp/subscribe', async (req, res, next) => {
    try {
      const result = await newsletterService.subscribe(req.body?.email, 'mailchimp-alias');
      res.status(result.created ? 201 : 200).json({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const status =
      err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    res.status(status).json({ message: err.message || 'Erreur serveur' });
  });

  return app;
}

// Keep path resolution stable for tooling
void __dirname;
