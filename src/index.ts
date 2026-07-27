import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { seedDatabase } from './seed/seed.js';

async function bootstrap() {
  await connectDatabase();
  await seedDatabase(false);

  const app = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Bany backend running on http://localhost:${env.port}`);
    if (env.emailConfigured) {
      console.log(`Email SMTP ready → ${env.contactEmail} (via ${env.smtpUser})`);
    } else {
      console.warn(
        'Email SMTP non configuré — ajoute EMAIL_HOST, EMAIL_USER, EMAIL_PASS dans bany-backend/.env'
      );
    }
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
