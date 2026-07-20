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
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
