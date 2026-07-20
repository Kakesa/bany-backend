import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { seedDatabase } from './seed.js';

async function main() {
  await connectDatabase();
  const force = process.argv.includes('--force');
  await seedDatabase(force);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
