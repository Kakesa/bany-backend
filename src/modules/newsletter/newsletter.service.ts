import { Subscriber } from './subscriber.model.js';

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
      return { success: true, message: 'Vous êtes déjà abonné', created: false };
    }

    await Subscriber.create({ email, source, subscribedAt: new Date() });
    return { success: true, message: 'Inscription confirmée', created: true };
  }

  async listSubscribers() {
    const items = await Subscriber.find().sort({ subscribedAt: -1 }).lean();
    return {
      items: items.map((s) => ({
        id: String(s._id),
        email: s.email,
        source: s.source,
        subscribedAt: new Date(s.subscribedAt).toISOString(),
      })),
    };
  }
}

export const newsletterService = new NewsletterService();
