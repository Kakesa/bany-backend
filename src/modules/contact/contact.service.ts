import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

type ContactPayload = {
  type: 'contact' | 'invite';
  name: string;
  email: string;
  subject?: string;
  message?: string;
  company?: string;
  eventType?: string;
  date?: string;
  formule?: string;
};

function buildMessage(payload: ContactPayload): { subject: string; text: string; html: string } {
  if (payload.type === 'invite') {
    const subject = `Invitation Bany — ${payload.formule || 'Formule'} — ${payload.name}`;
    const rows: [string, string][] = [
      ['Nom', payload.name],
      ['Email', payload.email],
      ['Entreprise', payload.company || '—'],
      ['Type', payload.eventType || '—'],
      ['Date', payload.date || '—'],
      ['Formule', payload.formule || '—'],
      ['Brief', payload.message || 'Aucun message'],
    ];
    const text = [
      'Nouvelle demande d’invitation Bany',
      '',
      ...rows.map(([k, v]) => `${k} : ${v}`),
    ].join('\n');
    const html = `
      <h2>Nouvelle demande d’invitation Bany</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top"><strong>${k}</strong></td><td style="padding:6px 0">${escapeHtml(v).replace(/\n/g, '<br/>')}</td></tr>`
          )
          .join('')}
      </table>
    `;
    return { subject, text, html };
  }

  const subjectLabel = payload.subject?.trim() || 'Contact Bany Talks';
  const subject = `Contact — ${subjectLabel}`;
  const rows: [string, string][] = [
    ['Nom', payload.name],
    ['Email', payload.email],
    ['Sujet', subjectLabel],
    ['Message', payload.message || ''],
  ];
  const text = [
    'Nouveau message depuis le site Contact',
    '',
    ...rows.map(([k, v]) => `${k} : ${v}`),
  ].join('\n');
  const html = `
    <h2>Nouveau message — Contact</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top"><strong>${k}</strong></td><td style="padding:6px 0">${escapeHtml(v).replace(/\n/g, '<br/>')}</td></tr>`
        )
        .join('')}
    </table>
  `;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendViaSmtp(opts: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}) {
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
    // Gmail exige en général l'adresse EMAIL_USER comme From
    from: env.contactFrom || `"${env.mailFromName}" <${env.smtpUser}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return true;
}

async function sendViaResend(opts: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}) {
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
    throw Object.assign(
      new Error(data.message || data.name || `Resend error (${response.status})`),
      { status: 502 }
    );
  }

  return true;
}

export const contactService = {
  async send(payload: ContactPayload) {
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const type = payload.type === 'invite' ? 'invite' : 'contact';

    if (!name || !email) {
      throw Object.assign(new Error('Nom et email requis'), { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Email invalide'), { status: 400 });
    }
    if (type === 'contact' && !String(payload.message || '').trim()) {
      throw Object.assign(new Error('Message requis'), { status: 400 });
    }

    const built = buildMessage({ ...payload, type, name, email });
    const to = env.contactEmail;
    const mailOpts = {
      to,
      replyTo: email,
      subject: built.subject,
      text: built.text,
      html: built.html,
    };

    try {
      const sentSmtp = await sendViaSmtp(mailOpts);
      if (sentSmtp) {
        return { success: true, to, provider: 'smtp', message: 'Message envoyé' };
      }

      const sentResend = await sendViaResend(mailOpts);
      if (sentResend) {
        return { success: true, to, provider: 'resend', message: 'Message envoyé' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[contact] email send failed:', message);
      throw Object.assign(new Error(`Échec d’envoi email : ${message}`), { status: 502 });
    }

    throw Object.assign(
      new Error(
        'Email non configuré. Ajoutez EMAIL_HOST, EMAIL_USER, EMAIL_PASS (Gmail) dans le .env du backend.'
      ),
      { status: 503 }
    );
  },
};
