import mongoose from 'mongoose';
import { Article, type ArticleStatus } from './article.model.js';
import { Category } from '../categories/category.model.js';
import { Comment } from '../comments/comment.model.js';
import { newsletterService } from '../newsletter/newsletter.service.js';
import { estimateReadingTime, extractYoutubeEmbed, slugify } from '../../common/utils.js';

export interface ArticleQuery {
  q?: string;
  category?: string;
  author?: string;
  tag?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}

export interface ArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  gallery?: string[];
  youtubeUrl?: string;
  author?: string;
  categoryId?: string;
  tags?: string[];
  status?: ArticleStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  featured?: boolean;
  publishNow?: boolean;
  /** Notifier les abonnés newsletter (défaut: true à la 1re publication) */
  notifySubscribers?: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
  };
}

function queueArticleNotify(
  article: { title?: string; slug?: string; excerpt?: string },
  notify = true
) {
  if (!notify || !article.title || !article.slug) return;
  void newsletterService
    .notifyNewArticle({
      title: String(article.title),
      slug: String(article.slug),
      excerpt: article.excerpt ? String(article.excerpt) : '',
    })
    .then((result) => console.log('[newsletter] article notify', result))
    .catch((err) => console.error('[newsletter] article notify error', err));
}

function mapCategory(category: unknown) {
  if (!category || typeof category !== 'object') return null;
  const cat = category as { _id?: unknown; name?: string; slug?: string; description?: string };
  if (!cat._id) return null;
  return {
    id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
  };
}

function serialize(article: Record<string, unknown>, commentCount = 0) {
  const category = mapCategory(article.category);
  return {
    id: String(article._id),
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage,
    gallery: article.gallery || [],
    youtubeUrl: article.youtubeUrl,
    author: article.author,
    categoryId: category?.id || String(article.category),
    category,
    tags: article.tags || [],
    status: article.status,
    publishedAt: article.publishedAt ? new Date(article.publishedAt as string).toISOString() : null,
    scheduledAt: article.scheduledAt ? new Date(article.scheduledAt as string).toISOString() : null,
    readingTimeMinutes: article.readingTimeMinutes,
    likes: Number(article.likes || 0),
    commentCount,
    featured: article.featured,
    seo: article.seo || {},
    createdAt: new Date(article.createdAt as string).toISOString(),
    updatedAt: new Date(article.updatedAt as string).toISOString(),
  };
}

async function commentCountsByArticleIds(ids: mongoose.Types.ObjectId[]) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { article: { $in: ids }, approved: true } },
    { $group: { _id: '$article', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

async function serializeMany(articles: Record<string, unknown>[]) {
  const ids = articles.map((a) => a._id as mongoose.Types.ObjectId);
  const counts = await commentCountsByArticleIds(ids);
  return articles.map((a) => serialize(a, counts.get(String(a._id)) || 0));
}

async function serializeOne(article: Record<string, unknown>) {
  const counts = await commentCountsByArticleIds([article._id as mongoose.Types.ObjectId]);
  return serialize(article, counts.get(String(article._id)) || 0);
}

export class ArticleService {
  async publishDueScheduled() {
    const now = new Date();
    const due = await Article.find({ status: 'scheduled', scheduledAt: { $lte: now } });
    if (!due.length) return;

    await Article.updateMany(
      { _id: { $in: due.map((a) => a._id) } },
      { $set: { status: 'published', publishedAt: now } }
    );

    for (const article of due) {
      queueArticleNotify(article);
    }
  }

  async listPublic(query: ArticleQuery) {
    await this.publishDueScheduled();

    const filter: Record<string, unknown> = {
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: new Date() } },
      ],
    };

    if (query.featured) filter.featured = true;

    if (query.category) {
      const category = mongoose.isValidObjectId(query.category)
        ? await Category.findById(query.category)
        : await Category.findOne({ slug: query.category });
      if (!category) {
        return { items: [], pagination: { page: 1, limit: query.limit || 9, total: 0, totalPages: 1 } };
      }
      filter.category = category._id;
    }

    if (query.author) {
      filter.author = { $regex: query.author, $options: 'i' };
    }

    if (query.tag) {
      filter.tags = { $regex: new RegExp(`^${query.tag}$`, 'i') };
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      const matchingCategories = await Category.find({
        name: { $regex: q, $options: 'i' },
      }).select('_id');

      filter.$and = [
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } },
            { author: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } },
            { category: { $in: matchingCategories.map((c) => c._id) } },
          ],
        },
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 9));
    const total = await Article.countDocuments(filter);
    const articles = await Article.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category')
      .lean();

    return {
      items: await serializeMany(articles as Record<string, unknown>[]),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listAdmin() {
    await this.publishDueScheduled();
    const articles = await Article.find().sort({ updatedAt: -1 }).populate('category').lean();
    return { items: await serializeMany(articles as Record<string, unknown>[]) };
  }

  async getBySlug(slug: string) {
    await this.publishDueScheduled();
    const article = await Article.findOne({
      slug,
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: new Date() } },
      ],
    })
      .populate('category')
      .lean();

    if (!article) return null;

    const related = await Article.find({
      _id: { $ne: article._id },
      status: 'published',
      $or: [{ category: article.category }, { tags: { $in: article.tags || [] } }],
    })
      .sort({ publishedAt: -1 })
      .limit(3)
      .populate('category')
      .lean();

    const published = await Article.find({
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledAt: { $lte: new Date() } },
      ],
    })
      .sort({ publishedAt: -1 })
      .populate('category')
      .lean();

    const idx = published.findIndex((a) => String(a._id) === String(article._id));
    const [serializedArticle, relatedItems, prevItem, nextItem] = await Promise.all([
      serializeOne(article as Record<string, unknown>),
      serializeMany(related as Record<string, unknown>[]),
      idx < published.length - 1
        ? serializeOne(published[idx + 1] as Record<string, unknown>)
        : Promise.resolve(null),
      idx > 0 ? serializeOne(published[idx - 1] as Record<string, unknown>) : Promise.resolve(null),
    ]);

    return {
      article: serializedArticle,
      related: relatedItems,
      prev: prevItem,
      next: nextItem,
    };
  }

  async create(input: ArticleInput) {
    if (!input.title || !input.content) {
      throw Object.assign(new Error('Titre et contenu requis'), { status: 400 });
    }

    let slug = (input.slug?.trim() || slugify(input.title)).toLowerCase();
    if (await Article.exists({ slug })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const categoryId = input.categoryId || (await Category.findOne())?._id;
    if (!categoryId) {
      throw Object.assign(new Error('Aucune catégorie disponible'), { status: 400 });
    }

    const now = new Date();
    let status: ArticleStatus = input.status || 'draft';
    let publishedAt: Date | null = input.publishedAt ? new Date(input.publishedAt) : null;
    let scheduledAt: Date | null = input.scheduledAt ? new Date(input.scheduledAt) : null;

    if (input.publishNow) {
      status = 'published';
      publishedAt = now;
      scheduledAt = null;
    } else if (status === 'published' && !publishedAt) {
      publishedAt = now;
    }

    const article = await Article.create({
      title: input.title,
      slug,
      excerpt: input.excerpt || '',
      content: input.content,
      coverImage: input.coverImage || '',
      gallery: input.gallery || [],
      youtubeUrl: extractYoutubeEmbed(input.youtubeUrl),
      author: input.author || 'Bany',
      category: categoryId,
      tags: input.tags || [],
      status,
      publishedAt,
      scheduledAt,
      readingTimeMinutes: estimateReadingTime(input.content),
      featured: Boolean(input.featured),
      seo: {
        metaTitle: input.seo?.metaTitle || input.title,
        metaDescription: input.seo?.metaDescription || input.excerpt || '',
        ogImage: input.seo?.ogImage || input.coverImage,
        canonicalUrl: input.seo?.canonicalUrl,
      },
    });

    const populated = await Article.findById(article._id).populate('category').lean();
    if (status === 'published') {
      queueArticleNotify(article, input.notifySubscribers !== false);
    }
    return serializeOne(populated as Record<string, unknown>);
  }

  async update(id: string, input: ArticleInput) {
    const article = await Article.findById(id);
    if (!article) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }

    const wasPublished = article.status === 'published';
    const now = new Date();
    if (input.title !== undefined) article.title = input.title;
    if (input.excerpt !== undefined) article.excerpt = input.excerpt;
    if (input.content !== undefined) {
      article.content = input.content;
      article.readingTimeMinutes = estimateReadingTime(input.content);
    }
    if (input.coverImage !== undefined) article.coverImage = input.coverImage;
    if (input.gallery !== undefined) article.gallery = input.gallery;
    if (input.youtubeUrl !== undefined) article.youtubeUrl = extractYoutubeEmbed(input.youtubeUrl);
    if (input.author !== undefined) article.author = input.author;
    if (input.categoryId !== undefined) article.category = new mongoose.Types.ObjectId(input.categoryId);
    if (input.tags !== undefined) article.tags = input.tags;
    if (input.featured !== undefined) article.featured = input.featured;

    if (input.slug?.trim()) {
      const slug = input.slug.trim().toLowerCase();
      const exists = await Article.exists({ slug, _id: { $ne: article._id } });
      if (exists) {
        throw Object.assign(new Error('Ce slug est déjà utilisé'), { status: 400 });
      }
      article.slug = slug;
    }

    let status = input.status ?? article.status;
    if (input.publishNow || status === 'published') {
      status = 'published';
      article.publishedAt = input.publishedAt ? new Date(input.publishedAt) : article.publishedAt || now;
      article.scheduledAt = null;
    } else if (status === 'scheduled') {
      article.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : article.scheduledAt;
      if (!article.scheduledAt) {
        throw Object.assign(new Error('Date de publication requise pour un article programmé'), { status: 400 });
      }
    } else if (status === 'draft') {
      article.scheduledAt = null;
      if (input.publishedAt !== undefined) {
        article.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
      }
    } else {
      if (input.publishedAt !== undefined) {
        article.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
      }
      if (input.scheduledAt !== undefined) {
        article.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
      }
    }
    article.status = status;

    if (input.seo) {
      article.seo = {
        metaTitle: input.seo.metaTitle ?? article.seo?.metaTitle ?? article.title,
        metaDescription: input.seo.metaDescription ?? article.seo?.metaDescription ?? '',
        ogImage: input.seo.ogImage ?? article.seo?.ogImage,
        canonicalUrl: input.seo.canonicalUrl ?? article.seo?.canonicalUrl,
      };
    }

    await article.save();
    const populated = await Article.findById(article._id).populate('category').lean();
    const justPublished = status === 'published' && !wasPublished;
    if (justPublished) {
      queueArticleNotify(article, input.notifySubscribers !== false);
    }
    return serializeOne(populated as Record<string, unknown>);
  }

  async like(id: string) {
    const article = await Article.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      .populate('category')
      .lean();
    if (!article) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }
    return serializeOne(article as Record<string, unknown>);
  }

  async unlike(id: string) {
    const article = await Article.findById(id);
    if (!article) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }
    article.likes = Math.max(0, (article.likes || 0) - 1);
    await article.save();
    const populated = await Article.findById(article._id).populate('category').lean();
    return serializeOne(populated as Record<string, unknown>);
  }

  async remove(id: string) {
    const deleted = await Article.findByIdAndDelete(id);
    if (!deleted) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }
    await Comment.deleteMany({ article: id });
    return { success: true };
  }
}

export const articleService = new ArticleService();
