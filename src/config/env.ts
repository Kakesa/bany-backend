import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

const smtpHost = firstEnv('EMAIL_HOST', 'SMTP_HOST');
const smtpUser = firstEnv('EMAIL_USER', 'SMTP_USER');
const smtpPass = firstEnv('EMAIL_PASS', 'SMTP_PASS');
const mailFromName = firstEnv('MAIL_FROM_NAME') || 'Bany Official';
const contactFrom =
  firstEnv('CONTACT_FROM') || (smtpUser ? `"${mailFromName}" <${smtpUser}>` : '');

export const env = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bany-talks',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@banytalks.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'BanyAdmin2026!',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  /** Boîte qui reçoit Inviter Bany + Contact */
  contactEmail: firstEnv('CONTACT_EMAIL') || 'contact@banyofficial.com',
  mailFromName,
  /** En-tête From (avec Gmail: utiliser EMAIL_USER) */
  contactFrom,
  smtpHost,
  smtpPort: Number(firstEnv('EMAIL_PORT', 'SMTP_PORT') || 587),
  smtpSecure: firstEnv('EMAIL_SECURE', 'SMTP_SECURE') === 'true',
  smtpUser,
  smtpPass,
  resendApiKey: firstEnv('RESEND_API_KEY'),
  get emailConfigured() {
    return Boolean(this.smtpHost && this.smtpUser && this.smtpPass);
  },
};
