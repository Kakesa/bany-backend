import { SiteContent } from './site-content.model.js';

export type SiteStatistic = {
  label: string;
  value: string;
};

export const DEFAULT_STATISTICS: SiteStatistic[] = [
  { label: 'Auditeurs Mensuels', value: '450K+' },
  { label: 'Épisodes Sortis', value: '124' },
  { label: 'Histoires Inspirantes', value: '2.5M+' },
  { label: 'Note Moyenne (Spotify)', value: '4.9/5' },
];

function normalizeStatistics(input: unknown): SiteStatistic[] {
  if (!Array.isArray(input)) {
    throw Object.assign(new Error('statistics doit être un tableau'), { status: 400 });
  }

  const stats = input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const label = String((item as { label?: unknown }).label ?? '').trim();
      const value = String((item as { value?: unknown }).value ?? '').trim();
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((item): item is SiteStatistic => Boolean(item));

  if (stats.length === 0) {
    throw Object.assign(new Error('Ajoutez au moins un chiffre clé'), { status: 400 });
  }

  if (stats.length > 12) {
    throw Object.assign(new Error('Maximum 12 chiffres clés'), { status: 400 });
  }

  return stats;
}

export class SiteContentService {
  async getOrCreate() {
    let doc = await SiteContent.findOne({ key: 'main' });
    if (!doc) {
      doc = await SiteContent.create({
        key: 'main',
        statistics: DEFAULT_STATISTICS,
      });
    }
    return doc.toJSON();
  }

  async updateStatistics(rawStatistics: unknown) {
    const statistics = normalizeStatistics(rawStatistics);
    const doc = await SiteContent.findOneAndUpdate(
      { key: 'main' },
      { $set: { statistics } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc!.toJSON();
  }
}

export const siteContentService = new SiteContentService();
