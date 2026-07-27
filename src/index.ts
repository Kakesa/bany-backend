import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { seedDatabase } from './seed/seed.js';
import { newsletterService } from './modules/newsletter/newsletter.service.js';

async function bootstrap() {
  await connectDatabase();
  await seedDatabase(false);
  await newsletterService.ensureReady();

  const app = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Bany backend running on http://localhost:${env.port}`);
    if (env.emailConfigured) {
      console.log('Email ready → audience notifications enabled');
    } else {
      console.warn(
        'Email non configuré — ajoute EMAIL_HOST/EMAIL_USER/EMAIL_PASS ou RESEND_API_KEY'
      );
    }
  });

  setInterval(() => {
    void newsletterService.processScheduledCampaigns().catch((err) => {
      console.error('[newsletter] scheduler error', err);
    });
  }, 60_000);
}

bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
