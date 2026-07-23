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

function buildMessage(payload: ContactPayload): { subject: string; text: string; fields: Record<string, string> } {
  if (payload.type === 'invite') {
    const subject = `Invitation Bany — ${payload.formule || 'Formule'} — ${payload.name}`;
    const text = [
      'Nouvelle demande d’invitation Bany',
      '',
      `Nom : ${payload.name}`,
      `Email : ${payload.email}`,
      `Entreprise : ${payload.company || '—'}`,
      `Type : ${payload.eventType || '—'}`,
      `Date : ${payload.date || '—'}`,
      `Formule : ${payload.formule || '—'}`,
      '',
      'Brief / objectifs :',
      payload.message || 'Aucun message',
    ].join('\n');

    return {
      subject,
      text,
      fields: {
        type: 'Invitation Bany',
        name: payload.name,
        email: payload.email,
        company: payload.company || '—',
        eventType: payload.eventType || '—',
        date: payload.date || '—',
        formule: payload.formule || '—',
        message: payload.message || 'Aucun message',
      },
    };
  }

  const subject = payload.subject?.trim() || 'Contact Bany Talks';
  const text = [
    'Nouveau message depuis le site Contact',
    '',
    `Nom : ${payload.name}`,
    `Email : ${payload.email}`,
    `Sujet : ${subject}`,
    '',
    payload.message || '',
  ].join('\n');

  return {
    subject: `Contact — ${subject}`,
    text,
    fields: {
      type: 'Contact',
      name: payload.name,
      email: payload.email,
      subject,
      message: payload.message || '',
    },
  };
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

    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...built.fields,
        _subject: built.subject,
        _template: 'table',
        _captcha: 'false',
        _replyto: email,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: string | boolean;
      message?: string;
    };

    if (!response.ok) {
      throw Object.assign(
        new Error(data.message || `Échec d’envoi email (${response.status})`),
        { status: 502 }
      );
    }

    return {
      success: true,
      to,
      message: 'Message envoyé',
    };
  },
};
