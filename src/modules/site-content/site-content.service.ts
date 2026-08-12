import { SiteContent } from './site-content.model.js';

export type SiteStatistic = {
  label: string;
  value: string;
};

export type TimelineMilestone = {
  year: string;
  month: number | null;
  endYear: string | null;
  endMonth: number | null;
  title: string;
  desc: string;
};

export const DEFAULT_STATISTICS: SiteStatistic[] = [
  { label: 'Auditeurs Mensuels', value: '450K+' },
  { label: 'Épisodes Sortis', value: '124' },
  { label: 'Histoires Inspirantes', value: '2.5M+' },
  { label: 'Note Moyenne (Spotify)', value: '4.9/5' },
];

export const DEFAULT_TIMELINE: TimelineMilestone[] = [
  {
    year: '2025',
    month: null,
    endYear: null,
    endMonth: null,
    title: 'Référence Européenne',
    desc: 'Bany Talks élue l’une des émissions de podcasts francophones les plus décisives de la décennie.',
  },
  {
    year: '2024',
    month: null,
    endYear: null,
    endMonth: null,
    title: 'Invités de Prestige',
    desc: 'Entrée des PDG fondateurs du CAC40 et d’investisseurs légendaires de la tech dans l’émission.',
  },
  {
    year: '2023',
    month: null,
    endYear: null,
    endMonth: null,
    title: 'Studio Bany Talks',
    desc: 'Inauguration du studio professionnel à Paris et passage aux diffusions de haute qualité sur YouTube.',
  },
  {
    year: '2022',
    month: null,
    endYear: null,
    endMonth: null,
    title: 'Audience Explosive',
    desc: 'Le cap des 100K téléchargements cumulés est franchi grâce à des interviews franches de créateurs.',
  },
  {
    year: '2021',
    month: null,
    endYear: null,
    endMonth: null,
    title: 'Le Premier Micro',
    desc: 'Bany lance les émissions de sa propre chambre avec des invités locaux branchés.',
  },
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

function parseMonth(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return Math.trunc(n);
}

function sortTimeline(items: TimelineMilestone[]): TimelineMilestone[] {
  return [...items].sort((a, b) => {
    const yearA = Number.parseInt(a.year, 10) || 0;
    const yearB = Number.parseInt(b.year, 10) || 0;
    if (yearA !== yearB) return yearB - yearA;
    const monthA = a.month ?? 0;
    const monthB = b.month ?? 0;
    return monthB - monthA;
  });
}

function normalizeTimeline(input: unknown): TimelineMilestone[] {
  if (!Array.isArray(input)) {
    throw Object.assign(new Error('timeline doit être un tableau'), { status: 400 });
  }

  const milestones = input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const year = String((item as { year?: unknown }).year ?? '').trim();
      const title = String((item as { title?: unknown }).title ?? '').trim();
      const desc = String((item as { desc?: unknown }).desc ?? '').trim();
      const month = parseMonth((item as { month?: unknown }).month);
      const endYearRaw = String((item as { endYear?: unknown }).endYear ?? '').trim();
      const endYear = endYearRaw || null;
      const endMonth = parseMonth((item as { endMonth?: unknown }).endMonth);
      if (!year || !title || !desc) return null;
      return { year, month, endYear, endMonth, title, desc };
    })
    .filter((item): item is TimelineMilestone => Boolean(item));

  if (milestones.length === 0) {
    throw Object.assign(new Error('Ajoutez au moins une étape du parcours'), { status: 400 });
  }

  if (milestones.length > 40) {
    throw Object.assign(new Error('Maximum 40 étapes dans le parcours'), { status: 400 });
  }

  return sortTimeline(milestones);
}

export class SiteContentService {
  async getOrCreate() {
    let doc = await SiteContent.findOne({ key: 'main' });
    if (!doc) {
      doc = await SiteContent.create({
        key: 'main',
        statistics: DEFAULT_STATISTICS,
        timeline: DEFAULT_TIMELINE,
      });
    } else {
      let dirty = false;
      if (!doc.statistics?.length) {
        doc.statistics = DEFAULT_STATISTICS;
        dirty = true;
      }
      if (!doc.timeline?.length) {
        doc.timeline = DEFAULT_TIMELINE;
        dirty = true;
      }
      if (dirty) await doc.save();
    }

    const json = doc.toJSON() as Record<string, unknown>;
    const timeline = Array.isArray(json.timeline)
      ? sortTimeline(json.timeline as TimelineMilestone[])
      : DEFAULT_TIMELINE;
    return { ...json, timeline };
  }

  async update(payload: { statistics?: unknown; timeline?: unknown }) {
    const $set: Record<string, unknown> = {};

    if (payload.statistics !== undefined) {
      $set.statistics = normalizeStatistics(payload.statistics);
    }
    if (payload.timeline !== undefined) {
      $set.timeline = normalizeTimeline(payload.timeline);
    }

    if (Object.keys($set).length === 0) {
      throw Object.assign(new Error('Aucune donnée à mettre à jour'), { status: 400 });
    }

    const doc = await SiteContent.findOneAndUpdate(
      { key: 'main' },
      { $set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const json = doc!.toJSON() as Record<string, unknown>;
    const timeline = Array.isArray(json.timeline)
      ? sortTimeline(json.timeline as TimelineMilestone[])
      : [];
    return { ...json, timeline };
  }

  /** @deprecated use update() */
  async updateStatistics(rawStatistics: unknown) {
    return this.update({ statistics: rawStatistics });
  }
}

export const siteContentService = new SiteContentService();
