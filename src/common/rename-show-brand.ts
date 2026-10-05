import { Article } from '../modules/articles/article.model.js';
import { Category } from '../modules/categories/category.model.js';
import { Campaign } from '../modules/newsletter/campaign.model.js';
import { EmailTemplate } from '../modules/newsletter/template.model.js';
import { SiteContent } from '../modules/site-content/site-content.model.js';

/** Ancien nom d’émission → Bany Talks Experience, sans doubler un libellé déjà à jour. */
export function renameShowBrand(value: string): string {
  return value
    .replaceAll('Bany Experience', 'Bany Talks Experience')
    .replace(/Bany Talks(?! Experience)/g, 'Bany Talks Experience');
}

function patchString(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const next = renameShowBrand(value);
  return next === value ? undefined : next;
}

function patchFields<T extends object>(doc: T, keys: (keyof T)[]): boolean {
  let dirty = false;
  for (const key of keys) {
    const next = patchString(doc[key]);
    if (next !== undefined) {
      doc[key] = next as T[keyof T];
      dirty = true;
    }
  }
  return dirty;
}

/** Met à jour le contenu déjà enregistré (articles, parcours, modèles et campagnes mail). */
export async function migrateShowBrandNames(): Promise<void> {
  const articles = await Article.find();
  for (const article of articles) {
    let dirty = patchFields(article, ['title', 'excerpt', 'content', 'author', 'authorTitle']);
    if (article.seo) {
      const metaTitle = patchString(article.seo.metaTitle);
      const metaDescription = patchString(article.seo.metaDescription);
      if (metaTitle !== undefined) {
        article.seo.metaTitle = metaTitle;
        dirty = true;
      }
      if (metaDescription !== undefined) {
        article.seo.metaDescription = metaDescription;
        dirty = true;
      }
    }
    if (dirty) await article.save();
  }

  const categories = await Category.find();
  for (const category of categories) {
    if (patchFields(category, ['name', 'description'])) await category.save();
  }

  const sites = await SiteContent.find();
  for (const site of sites) {
    let dirty = false;
    for (const stat of site.statistics || []) {
      const label = patchString(stat.label);
      if (label !== undefined) {
        stat.label = label;
        dirty = true;
      }
    }
    for (const step of site.timeline || []) {
      const title = patchString(step.title);
      const desc = patchString(step.desc);
      if (title !== undefined) {
        step.title = title;
        dirty = true;
      }
      if (desc !== undefined) {
        step.desc = desc;
        dirty = true;
      }
    }
    if (dirty) await site.save();
  }

  const templates = await EmailTemplate.find();
  for (const template of templates) {
    if (patchFields(template, ['name', 'subject', 'previewText', 'htmlBody', 'textBody'])) {
      await template.save();
    }
  }

  const campaigns = await Campaign.find();
  for (const campaign of campaigns) {
    if (patchFields(campaign, ['name', 'subject', 'previewText', 'htmlContent', 'textContent'])) {
      await campaign.save();
    }
  }
}
