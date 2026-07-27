import crypto from 'crypto';
import { sendMail, escapeHtml } from '../../common/mail.service.js';
import { env } from '../../config/env.js';
import { Campaign } from './campaign.model.js';
import { ensureDefaultEmailTemplates } from './default-templates.js';
import { applyMergeTags, htmlToPlainText, wrapBanyLayout } from './email-render.js';
import { Subscriber } from './subscriber.model.js';
import { EmailTemplate } from './template.model.js';

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

function siteUrl() {
  return env.frontendUrl.replace(/\/$/, '') || 'https://banyofficial.com';
}

function serializeSubscriber(s: Record<string, unknown>) {
  return {
    id: String(s._id),
    email: s.email,
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    source: s.source,
    tags: s.tags || [],
    active: s.active !== false,
    subscribedAt: s.subscribedAt ? new Date(s.subscribedAt as string).toISOString() : null,
    consentAt: s.consentAt ? new Date(s.consentAt as string).toISOString() : null,
    lastNotifiedAt: s.lastNotifiedAt ? new Date(s.lastNotifiedAt as string).toISOString() : null,
    welcomeSentAt: s.welcomeSentAt ? new Date(s.welcomeSentAt as string).toISOString() : null,
  };
}

export type NotifyArticleInput = {
  title: string;
  slug: string;
  excerpt?: string;
};

export type SegmentFilter = {
  sources?: string[];
  tags?: string[];
  activeOnly?: boolean;
};

export type CampaignInput = {
  name?: string;
  subject?: string;
  previewText?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string | null;
  scheduledAt?: string | null;
  status?: 'draft' | 'scheduled';
  segment?: SegmentFilter;
  createdBy?: string;
};

export class NewsletterService {
  async ensureReady() {
    await ensureDefaultEmailTemplates();
  }

  async subscribe(
    emailRaw?: string,
    source = 'blog',
    extra?: { firstName?: string; lastName?: string; tags?: string[] }
  ) {
    const email = String(emailRaw || '')
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Adresse email invalide'), { status: 400 });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      const wasInactive = existing.active === false;
      existing.active = true;
      existing.source = source || existing.source;
      if (wasInactive) existing.subscribedAt = new Date();
      existing.consentAt = new Date();
      if (!existing.unsubscribeToken) existing.unsubscribeToken = newToken();
      if (extra?.firstName) existing.firstName = extra.firstName;
      if (extra?.lastName) existing.lastName = extra.lastName;
      if (extra?.tags?.length) {
        existing.tags = Array.from(new Set([...(existing.tags || []), ...extra.tags]));
      }
      await existing.save();

      if (!existing.welcomeSentAt) {
        void this.sendWelcome(existing).catch((err) => console.error('[newsletter] welcome', err));
      }

      return {
        success: true,
        message: wasInactive ? 'Inscription réactivée' : 'Vous êtes déjà abonné',
        created: wasInactive,
      };
    }

    const subscriber = await Subscriber.create({
      email,
      firstName: extra?.firstName || '',
      lastName: extra?.lastName || '',
      source,
      tags: extra?.tags || [],
      subscribedAt: new Date(),
      consentAt: new Date(),
      active: true,
      unsubscribeToken: newToken(),
    });

    void this.sendWelcome(subscriber).catch((err) => console.error('[newsletter] welcome', err));

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

  async listSubscribers(query?: { q?: string; source?: string; tag?: string; active?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.source) filter.source = query.source;
    if (query?.tag) filter.tags = query.tag;
    if (query?.active === 'true') filter.active = true;
    if (query?.active === 'false') filter.active = false;
    if (query?.q?.trim()) {
      const q = query.q.trim();
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
      ];
    }

    const items = await Subscriber.find(filter).sort({ subscribedAt: -1 }).lean();
    const all = await Subscriber.find().select('active source tags').lean();
    const sources = Array.from(new Set(all.map((s) => s.source).filter(Boolean)));
    const tags = Array.from(new Set(all.flatMap((s) => s.tags || [])));

    return {
      items: items.map((s) => serializeSubscriber(s as Record<string, unknown>)),
      stats: {
        total: all.length,
        active: all.filter((s) => s.active !== false).length,
        inactive: all.filter((s) => s.active === false).length,
      },
      meta: { sources, tags },
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
    return serializeSubscriber(subscriber.toObject() as Record<string, unknown>);
  }

  async updateSubscriber(
    id: string,
    input: { firstName?: string; lastName?: string; tags?: string[]; source?: string; active?: boolean }
  ) {
    const subscriber = await Subscriber.findById(id);
    if (!subscriber) {
      throw Object.assign(new Error('Abonné introuvable'), { status: 404 });
    }
    if (input.firstName !== undefined) subscriber.firstName = input.firstName;
    if (input.lastName !== undefined) subscriber.lastName = input.lastName;
    if (input.tags !== undefined) subscriber.tags = input.tags;
    if (input.source !== undefined) subscriber.source = input.source;
    if (input.active !== undefined) subscriber.active = input.active;
    if (!subscriber.unsubscribeToken) subscriber.unsubscribeToken = newToken();
    await subscriber.save();
    return serializeSubscriber(subscriber.toObject() as Record<string, unknown>);
  }

  async deleteSubscriber(id: string) {
    const result = await Subscriber.findByIdAndDelete(id);
    if (!result) {
      throw Object.assign(new Error('Abonné introuvable'), { status: 404 });
    }
    return { success: true };
  }

  private buildSegmentQuery(segment?: SegmentFilter) {
    const filter: Record<string, unknown> = {};
    if (segment?.activeOnly !== false) filter.active = { $ne: false };
    if (segment?.sources?.length) filter.source = { $in: segment.sources };
    if (segment?.tags?.length) filter.tags = { $in: segment.tags };
    return filter;
  }

  private async ensureActiveSubscribers(segment?: SegmentFilter) {
    const subscribers = await Subscriber.find(this.buildSegmentQuery(segment));
    for (const sub of subscribers) {
      if (!sub.unsubscribeToken) {
        sub.unsubscribeToken = newToken();
        await sub.save();
      }
    }
    return subscribers;
  }

  private async sendWelcome(subscriber: {
    email: string;
    firstName?: string;
    unsubscribeToken: string;
    welcomeSentAt?: Date | null;
    save: () => Promise<unknown>;
  }) {
    if (!env.emailConfigured) return;
    await this.ensureReady();
    const tpl = await EmailTemplate.findOne({ slug: 'welcome' });
    if (!tpl) return;

    const unsub = unsubscribeUrl(subscriber.unsubscribeToken);
    const firstName = subscriber.firstName?.trim() || 'ami(e)';
    const ctx = {
      firstName,
      siteUrl: siteUrl(),
      unsubscribeUrl: unsub,
    };
    const subject = applyMergeTags(tpl.subject, ctx);
    const inner = applyMergeTags(tpl.htmlBody, ctx);
    const html = wrapBanyLayout({
      title: 'Bienvenue',
      preheader: tpl.previewText,
      bodyHtml: inner,
      unsubscribeUrl: unsub,
    });
    const text = applyMergeTags(tpl.textBody || htmlToPlainText(inner), ctx);

    await sendMail({
      to: subscriber.email,
      subject,
      text,
      html,
      listUnsubscribeUrl: unsub,
    });

    subscriber.welcomeSentAt = new Date();
    await subscriber.save();
  }

  async notifyNewArticle(article: NotifyArticleInput) {
    if (!env.emailConfigured) {
      console.warn('[newsletter] skip notify — email non configuré');
      return { sent: 0, failed: 0, skipped: true };
    }

    await this.ensureReady();
    const tpl = await EmailTemplate.findOne({ slug: 'article-publish' });
    const subscribers = await this.ensureActiveSubscribers({ activeOnly: true });
    if (!subscribers.length) return { sent: 0, failed: 0, skipped: false };

    const link = articleUrl(article.slug);
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const unsub = unsubscribeUrl(sub.unsubscribeToken);
      const ctx = {
        title: article.title,
        excerpt: article.excerpt || '',
        articleUrl: link,
        firstName: sub.firstName?.trim() || 'ami(e)',
        siteUrl: siteUrl(),
        unsubscribeUrl: unsub,
      };

      const subject = applyMergeTags(tpl?.subject || 'Nouveau sur Bany Talks — {{title}}', ctx);
      const inner = applyMergeTags(
        tpl?.htmlBody ||
          `<h2 style="color:#fff">{{title}}</h2><p>{{excerpt}}</p><p><a href="{{articleUrl}}">Lire</a></p>`,
        ctx
      );
      const html = wrapBanyLayout({
        title: article.title,
        preheader: article.excerpt || '',
        bodyHtml: inner,
        unsubscribeUrl: unsub,
      });
      const text = applyMergeTags(
        tpl?.textBody || 'Nouveau : {{title}}\n\n{{excerpt}}\n\n{{articleUrl}}',
        ctx
      );

      try {
        await sendMail({ to: sub.email, subject, text, html, listUnsubscribeUrl: unsub });
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

  /** @deprecated use createCampaign + sendCampaignById */
  async sendCampaign(input: { subject?: string; message?: string }) {
    const subject = String(input.subject || '').trim();
    const message = String(input.message || '').trim();
    if (!subject || !message) {
      throw Object.assign(new Error('Sujet et message requis'), { status: 400 });
    }

    const campaign = await Campaign.create({
      name: subject,
      subject,
      previewText: message.slice(0, 120),
      htmlContent: `<div style="white-space:pre-wrap">${escapeHtml(message)}</div>`,
      textContent: message,
      status: 'draft',
      segment: { sources: [], tags: [], activeOnly: true },
      stats: { recipients: 0, sent: 0, failed: 0 },
    });

    return this.sendCampaignById(String(campaign._id));
  }

  async listTemplates() {
    await this.ensureReady();
    const items = await EmailTemplate.find().sort({ isSystem: -1, name: 1 }).lean();
    return {
      items: items.map((t) => ({
        id: String(t._id),
        name: t.name,
        slug: t.slug,
        category: t.category,
        subject: t.subject,
        previewText: t.previewText,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        isSystem: t.isSystem,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  }

  async createTemplate(input: {
    name?: string;
    slug?: string;
    category?: string;
    subject?: string;
    previewText?: string;
    htmlBody?: string;
    textBody?: string;
  }) {
    const name = String(input.name || '').trim();
    const subject = String(input.subject || '').trim();
    const htmlBody = String(input.htmlBody || '').trim();
    if (!name || !subject || !htmlBody) {
      throw Object.assign(new Error('Nom, sujet et HTML requis'), { status: 400 });
    }
    const slug =
      String(input.slug || name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `tpl-${Date.now().toString(36)}`;

    if (await EmailTemplate.exists({ slug })) {
      throw Object.assign(new Error('Ce slug de template existe déjà'), { status: 400 });
    }

    const created = await EmailTemplate.create({
      name,
      slug,
      category: (input.category as 'welcome' | 'article' | 'announcement' | 'custom') || 'custom',
      subject,
      previewText: input.previewText || '',
      htmlBody,
      textBody: input.textBody || htmlToPlainText(htmlBody),
      isSystem: false,
    });

    return {
      id: String(created._id),
      name: created.name,
      slug: created.slug,
      category: created.category,
      subject: created.subject,
      previewText: created.previewText,
      htmlBody: created.htmlBody,
      textBody: created.textBody,
      isSystem: created.isSystem,
    };
  }

  async updateTemplate(
    id: string,
    input: {
      name?: string;
      subject?: string;
      previewText?: string;
      htmlBody?: string;
      textBody?: string;
      category?: string;
    }
  ) {
    const tpl = await EmailTemplate.findById(id);
    if (!tpl) throw Object.assign(new Error('Template introuvable'), { status: 404 });
    if (input.name !== undefined) tpl.name = input.name;
    if (input.subject !== undefined) tpl.subject = input.subject;
    if (input.previewText !== undefined) tpl.previewText = input.previewText;
    if (input.htmlBody !== undefined) tpl.htmlBody = input.htmlBody;
    if (input.textBody !== undefined) tpl.textBody = input.textBody;
    if (input.category !== undefined) tpl.category = input.category as typeof tpl.category;
    await tpl.save();
    return {
      id: String(tpl._id),
      name: tpl.name,
      slug: tpl.slug,
      category: tpl.category,
      subject: tpl.subject,
      previewText: tpl.previewText,
      htmlBody: tpl.htmlBody,
      textBody: tpl.textBody,
      isSystem: tpl.isSystem,
    };
  }

  async deleteTemplate(id: string) {
    const tpl = await EmailTemplate.findById(id);
    if (!tpl) throw Object.assign(new Error('Template introuvable'), { status: 404 });
    if (tpl.isSystem) {
      throw Object.assign(new Error('Impossible de supprimer un template système'), { status: 400 });
    }
    await tpl.deleteOne();
    return { success: true };
  }

  async listCampaigns() {
    const items = await Campaign.find().sort({ createdAt: -1 }).lean();
    return {
      items: items.map((c) => ({
        id: String(c._id),
        name: c.name,
        subject: c.subject,
        previewText: c.previewText,
        htmlContent: c.htmlContent,
        textContent: c.textContent,
        status: c.status,
        templateId: c.templateId ? String(c.templateId) : null,
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : null,
        sentAt: c.sentAt ? new Date(c.sentAt).toISOString() : null,
        segment: c.segment,
        stats: c.stats,
        createdBy: c.createdBy,
        errorMessage: c.errorMessage,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  async getCampaign(id: string) {
    const c = await Campaign.findById(id).lean();
    if (!c) throw Object.assign(new Error('Campagne introuvable'), { status: 404 });
    return {
      id: String(c._id),
      name: c.name,
      subject: c.subject,
      previewText: c.previewText,
      htmlContent: c.htmlContent,
      textContent: c.textContent,
      status: c.status,
      templateId: c.templateId ? String(c.templateId) : null,
      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : null,
      sentAt: c.sentAt ? new Date(c.sentAt).toISOString() : null,
      segment: c.segment,
      stats: c.stats,
      createdBy: c.createdBy,
      errorMessage: c.errorMessage,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async createCampaign(input: CampaignInput) {
    const name = String(input.name || input.subject || '').trim();
    const subject = String(input.subject || '').trim();
    const htmlContent = String(input.htmlContent || '').trim();
    if (!name || !subject || !htmlContent) {
      throw Object.assign(new Error('Nom, sujet et contenu HTML requis'), { status: 400 });
    }

    const status = input.status === 'scheduled' ? 'scheduled' : 'draft';
    if (status === 'scheduled' && !input.scheduledAt) {
      throw Object.assign(new Error('Date de planification requise'), { status: 400 });
    }

    const created = await Campaign.create({
      name,
      subject,
      previewText: input.previewText || '',
      htmlContent,
      textContent: input.textContent || htmlToPlainText(htmlContent),
      status,
      templateId: input.templateId || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      segment: {
        sources: input.segment?.sources || [],
        tags: input.segment?.tags || [],
        activeOnly: input.segment?.activeOnly !== false,
      },
      createdBy: input.createdBy || '',
      stats: { recipients: 0, sent: 0, failed: 0 },
    });

    return this.getCampaign(String(created._id));
  }

  async updateCampaign(id: string, input: CampaignInput) {
    const campaign = await Campaign.findById(id);
    if (!campaign) throw Object.assign(new Error('Campagne introuvable'), { status: 404 });
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      throw Object.assign(new Error('Campagne déjà envoyée / en cours'), { status: 400 });
    }

    if (input.name !== undefined) campaign.name = input.name;
    if (input.subject !== undefined) campaign.subject = input.subject;
    if (input.previewText !== undefined) campaign.previewText = input.previewText;
    if (input.htmlContent !== undefined) {
      campaign.htmlContent = input.htmlContent;
      campaign.textContent = input.textContent || htmlToPlainText(input.htmlContent);
    } else if (input.textContent !== undefined) {
      campaign.textContent = input.textContent;
    }
    if (input.templateId !== undefined) campaign.templateId = input.templateId as never;
    if (input.segment) {
      campaign.segment = {
        sources: input.segment.sources || [],
        tags: input.segment.tags || [],
        activeOnly: input.segment.activeOnly !== false,
      };
    }
    if (input.status === 'scheduled') {
      if (!input.scheduledAt && !campaign.scheduledAt) {
        throw Object.assign(new Error('Date de planification requise'), { status: 400 });
      }
      campaign.status = 'scheduled';
      if (input.scheduledAt) campaign.scheduledAt = new Date(input.scheduledAt);
    } else if (input.status === 'draft') {
      campaign.status = 'draft';
    }
    if (input.scheduledAt === null) campaign.scheduledAt = null;
    else if (input.scheduledAt) campaign.scheduledAt = new Date(input.scheduledAt);

    await campaign.save();
    return this.getCampaign(id);
  }

  async deleteCampaign(id: string) {
    const campaign = await Campaign.findById(id);
    if (!campaign) throw Object.assign(new Error('Campagne introuvable'), { status: 404 });
    if (campaign.status === 'sending') {
      throw Object.assign(new Error('Impossible de supprimer une campagne en cours d’envoi'), {
        status: 400,
      });
    }
    await campaign.deleteOne();
    return { success: true };
  }

  async sendCampaignById(id: string) {
    if (!env.emailConfigured) {
      throw Object.assign(
        new Error('Email non configuré (EMAIL_* ou RESEND_API_KEY)'),
        { status: 503 }
      );
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) throw Object.assign(new Error('Campagne introuvable'), { status: 404 });
    if (campaign.status === 'sent') {
      throw Object.assign(new Error('Cette campagne a déjà été envoyée'), { status: 400 });
    }
    if (campaign.status === 'sending') {
      throw Object.assign(new Error('Envoi déjà en cours'), { status: 400 });
    }

    campaign.status = 'sending';
    campaign.errorMessage = '';
    await campaign.save();

    try {
      const subscribers = await this.ensureActiveSubscribers(campaign.segment || { activeOnly: true });
      campaign.stats.recipients = subscribers.length;
      campaign.stats.sent = 0;
      campaign.stats.failed = 0;
      await campaign.save();

      for (const sub of subscribers) {
        const unsub = unsubscribeUrl(sub.unsubscribeToken);
        const ctx = {
          firstName: sub.firstName?.trim() || 'ami(e)',
          email: sub.email,
          siteUrl: siteUrl(),
          unsubscribeUrl: unsub,
          subject: campaign.subject,
          message: htmlToPlainText(campaign.htmlContent),
        };

        const subject = applyMergeTags(campaign.subject, ctx);
        const inner = applyMergeTags(campaign.htmlContent, ctx);
        const html = wrapBanyLayout({
          title: subject,
          preheader: campaign.previewText || '',
          bodyHtml: inner,
          unsubscribeUrl: unsub,
        });
        const text =
          applyMergeTags(campaign.textContent || htmlToPlainText(campaign.htmlContent), ctx) +
          `\n\nSe désabonner : ${unsub}`;

        try {
          await sendMail({ to: sub.email, subject, text, html, listUnsubscribeUrl: unsub });
          sub.lastNotifiedAt = new Date();
          await sub.save();
          campaign.stats.sent += 1;
        } catch (err) {
          campaign.stats.failed += 1;
          console.error('[newsletter] campaign send failed', sub.email, err);
        }
      }

      campaign.status = 'sent';
      campaign.sentAt = new Date();
      await campaign.save();

      return {
        success: true,
        id: String(campaign._id),
        sent: campaign.stats.sent,
        failed: campaign.stats.failed,
        total: campaign.stats.recipients,
      };
    } catch (err: unknown) {
      campaign.status = 'failed';
      campaign.errorMessage = err instanceof Error ? err.message : String(err);
      await campaign.save();
      throw err;
    }
  }

  async processScheduledCampaigns() {
    const due = await Campaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });
    for (const campaign of due) {
      try {
        await this.sendCampaignById(String(campaign._id));
      } catch (err) {
        console.error('[newsletter] scheduled campaign failed', campaign._id, err);
      }
    }
    return { processed: due.length };
  }

  async overview() {
    await this.ensureReady();
    const [subs, campaigns, templates] = await Promise.all([
      Subscriber.find().select('active source').lean(),
      Campaign.find().sort({ createdAt: -1 }).limit(5).lean(),
      EmailTemplate.countDocuments(),
    ]);
    return {
      audience: {
        total: subs.length,
        active: subs.filter((s) => s.active !== false).length,
        inactive: subs.filter((s) => s.active === false).length,
      },
      templates,
      recentCampaigns: campaigns.map((c) => ({
        id: String(c._id),
        name: c.name,
        subject: c.subject,
        status: c.status,
        sentAt: c.sentAt,
        stats: c.stats,
      })),
    };
  }
}

export const newsletterService = new NewsletterService();
