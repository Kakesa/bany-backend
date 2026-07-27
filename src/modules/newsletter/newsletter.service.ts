import crypto from 'crypto';
import { sendMail, escapeHtml } from '../../common/mail.service.js';
import { env } from '../../config/env.js';
import { Subscriber } from './subscriber.model.js';

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function unsubscribeUrl(token: string) {
  const base = env.frontendUrl.replace(/\/$/, '');
  return `${base}/#/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function articleUrl(slug: string) {
  const base = env.frontendUrl.replace(/\/$/, '');
  return `${base}/#/blog/${encodeURIComponent(slug)}`;
}

export type NotifyArticleInput = {
  title: string;
  slug: string;
  excerpt?: string;
};

export class NewsletterService {
  async subscribe(emailRaw?: string, source = 'blog') {
    const email = String(emailRaw || '')
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Adresse email invalide'), { status: 400 });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        existing.source = source || existing.source;
        existing.subscribedAt = new Date();
        if (!existing.unsubscribeToken) existing.unsubscribeToken = newToken();
        await existing.save();
        return { success: true, message: 'Inscription réactivée', created: true };
      }
      if (!existing.unsubscribeToken) {
        existing.unsubscribeToken = newToken();
        await existing.save();
      }
      return { success: true, message: 'Vous êtes déjà abonné', created: false };
    }

    await Subscriber.create({
      email,
      source,
      subscribedAt: new Date(),
      active: true,
      unsubscribeToken: newToken(),
    });
    return { success: true, message: 'Inscription confirmée', created: true };
  }

  async unsubscribeByToken(tokenRaw?: string) {
    const token = String(tokenRaw || '').trim();
    if (!token) {
      throw Object.assign(new Error('Lien de désabonnement invalide'), { status: 400 });
    }

    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      throw Object.assign(new Error('Abonnement introuvable'), { status: 404 });
    }

    subscriber.active = false;
    await subscriber.save();
    return { success: true, message: 'Vous êtes désabonné de la newsletter' };
  }

  async listSubscribers() {
    const items = await Subscriber.find().sort({ subscribedAt: -1 }).lean();
    return {
      items: items.map((s) => ({
        id: String(s._id),
        email: s.email,
        source: s.source,
        active: s.active !== false,
        subscribedAt: new Date(s.subscribedAt).toISOString(),
        lastNotifiedAt: s.lastNotifiedAt ? new Date(s.lastNotifiedAt).toISOString() : null,
      })),
      stats: {
        total: items.length,
        active: items.filter((s) => s.active !== false).length,
        inactive: items.filter((s) => s.active === false).length,
      },
    };
  }

  async setActive(id: string, active: boolean) {
    const subscriber = await Subscriber.findById(id);
    if (!subscriber) {
      throw Object.assign(new Error('Abonné introuvable'), { status: 404 });
    }
    subscriber.active = Boolean(active);
    if (subscriber.active && !subscriber.unsubscribeToken) {
      subscriber.unsubscribeToken = newToken();
    }
    await subscriber.save();
    return {
      id: String(subscriber._id),
      email: subscriber.email,
      active: subscriber.active,
    };
  }

  async deleteSubscriber(id: string) {
    const result = await Subscriber.findByIdAndDelete(id);
    if (!result) {
      throw Object.assign(new Error('Abonné introuvable'), { status: 404 });
    }
    return { success: true };
  }

  private async ensureActiveSubscribers() {
    const subscribers = await Subscriber.find({ active: { $ne: false } });
    for (const sub of subscribers) {
      if (!sub.unsubscribeToken) {
        sub.unsubscribeToken = newToken();
        await sub.save();
      }
    }
    return subscribers;
  }

  async notifyNewArticle(article: NotifyArticleInput) {
    if (!env.emailConfigured) {
      console.warn('[newsletter] skip notify — email non configuré');
      return { sent: 0, failed: 0, skipped: true };
    }

    const subscribers = await this.ensureActiveSubscribers();
    if (!subscribers.length) {
      return { sent: 0, failed: 0, skipped: false };
    }

    const link = articleUrl(article.slug);
    const excerpt = (article.excerpt || '').trim();
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const unsub = unsubscribeUrl(sub.unsubscribeToken);
      const subject = `Nouveau sur Bany Talks — ${article.title}`;
      const text = [
        'Bonjour,',
        '',
        'Un nouveau contenu vient d’être publié sur Bany Talks :',
        article.title,
        excerpt ? `\n${excerpt}\n` : '',
        `Lire : ${link}`,
        '',
        `Se désabonner : ${unsub}`,
      ].join('\n');

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p style="color:#666;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Bany Talks</p>
          <h1 style="font-size:22px;line-height:1.3;margin:8px 0 16px">${escapeHtml(article.title)}</h1>
          ${excerpt ? `<p style="color:#444;line-height:1.6">${escapeHtml(excerpt)}</p>` : ''}
          <p style="margin:24px 0">
            <a href="${link}" style="display:inline-block;background:#ef3b3b;color:#fff;text-decoration:none;padding:12px 18px;font-weight:600">
              Lire l’article
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:32px">
            Vous recevez cet email car vous êtes abonné à la newsletter Bany Talks.<br/>
            <a href="${unsub}" style="color:#999">Se désabonner</a>
          </p>
        </div>
      `;

      try {
        await sendMail({ to: sub.email, subject, text, html });
        sub.lastNotifiedAt = new Date();
        await sub.save();
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error('[newsletter] notify failed for', sub.email, err);
      }
    }

    return { sent, failed, skipped: false };
  }

  async sendCampaign(input: { subject?: string; message?: string }) {
    const subject = String(input.subject || '').trim();
    const message = String(input.message || '').trim();
    if (!subject || !message) {
      throw Object.assign(new Error('Sujet et message requis'), { status: 400 });
    }
    if (!env.emailConfigured) {
      throw Object.assign(
        new Error('Email non configuré (EMAIL_HOST / EMAIL_USER / EMAIL_PASS)'),
        { status: 503 }
      );
    }

    const subscribers = await this.ensureActiveSubscribers();
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const unsub = unsubscribeUrl(sub.unsubscribeToken);
      const text = `${message}\n\n---\nSe désabonner : ${unsub}`;
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.6">
          <p style="color:#666;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Newsletter Bany Talks</p>
          <div style="white-space:pre-wrap">${escapeHtml(message)}</div>
          <p style="color:#999;font-size:12px;margin-top:32px">
            <a href="${unsub}" style="color:#999">Se désabonner</a>
          </p>
        </div>
      `;

      try {
        await sendMail({ to: sub.email, subject, text, html });
        sub.lastNotifiedAt = new Date();
        await sub.save();
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error('[newsletter] campaign failed for', sub.email, err);
      }
    }

    return { success: true, sent, failed, total: subscribers.length };
  }
}

export const newsletterService = new NewsletterService();
