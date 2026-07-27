import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

async function sendViaSmtp(opts: SendMailOptions) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: env.contactFrom || `"${env.mailFromName}" <${env.smtpUser}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return true;
}

async function sendViaResend(opts: SendMailOptions) {
  if (!env.resendApiKey) return false;

  const from = env.contactFrom || 'Bany Official <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      reply_to: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { message?: string; name?: string };
  if (!response.ok) {
    throw new Error(data.message || data.name || `Resend error (${response.status})`);
  }

  return true;
}

export async function sendMail(opts: SendMailOptions): Promise<{ provider: 'smtp' | 'resend' }> {
  try {
    if (await sendViaSmtp(opts)) return { provider: 'smtp' };
    if (await sendViaResend(opts)) return { provider: 'resend' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mail] send failed:', message);
    throw Object.assign(new Error(`Échec d’envoi email : ${message}`), { status: 502 });
  }

  throw Object.assign(
    new Error(
      'Email non configuré. Ajoutez EMAIL_HOST, EMAIL_USER, EMAIL_PASS (Gmail) dans le .env du backend.'
    ),
    { status: 503 }
  );
}

export function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
