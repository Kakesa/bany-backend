import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bany-talks',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@banytalks.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'BanyAdmin2026!',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
