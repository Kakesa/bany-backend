import { sendMail, escapeHtml } from '../../common/mail.service.js';
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
  city?: string;
  eventFormat?: string;
  audience?: string;
  theme?: string;
};

function buildMessage(payload: ContactPayload): { subject: string; text: string; html: string } {
  if (payload.type === 'invite') {
    const subject = `Travailler avec Bany — ${payload.eventType || 'Demande'} — ${payload.name}`;
    const rows: [string, string][] = [
      ['Nom', payload.name],
      ['Email', payload.email],
      ['Organisation', payload.company || '—'],
      ['Type', payload.eventType || '—'],
      ['Date / échéance', payload.date || '—'],
      ['Format', payload.formule || '—'],
    ];
    if (payload.city) rows.push(['Ville / pays', payload.city]);
    if (payload.eventFormat) rows.push(['Type d’événement', payload.eventFormat]);
    if (payload.audience) rows.push(['Audience', payload.audience]);
    if (payload.theme) rows.push(['Thématique', payload.theme]);
    rows.push(['Brief', payload.message || 'Aucun message']);
    const text = [
      'Nouvelle demande — Travailler avec Bany',
      '',
      ...rows.map(([k, v]) => `${k} : ${v}`),
    ].join('\n');
    const html = `
      <h2>Nouvelle demande — Travailler avec Bany</h2>
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

    const result = await sendMail({
      to,
      replyTo: email,
      subject: built.subject,
      text: built.text,
      html: built.html,
    });

    return {
      success: true,
      to,
      provider: result.provider,
      message: 'Message envoyé',
    };
  },
};
