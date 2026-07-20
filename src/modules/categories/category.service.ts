import { Category } from './category.model.js';
import { slugify } from '../../common/utils.js';

export interface CategoryInput {
  name?: string;
  slug?: string;
  description?: string;
}

export class CategoryService {
  async listWithCounts() {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const { Article } = await import('../articles/article.model.js');

    return Promise.all(
      categories.map(async (cat) => {
        const articleCount = await Article.countDocuments({
          category: cat._id,
        });
        return {
          id: String(cat._id),
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          articleCount,
        };
      })
    );
  }

  async getBySlug(slug: string) {
    const category = await Category.findOne({ slug }).lean();
    if (!category) return null;

    const { Article } = await import('../articles/article.model.js');
    const articles = await Article.find({
      category: category._id,
      status: 'published',
    })
      .sort({ publishedAt: -1 })
      .populate('category')
      .lean();

    return {
      category: {
        id: String(category._id),
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      articles: await Promise.all(articles.map((a) => this.mapArticle(a as Record<string, unknown>))),
    };
  }

  async create(input: CategoryInput) {
    if (!input.name?.trim()) {
      throw Object.assign(new Error('Le nom est requis'), { status: 400 });
    }

    let slug = (input.slug?.trim() || slugify(input.name)).toLowerCase();
    if (await Category.exists({ slug })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const category = await Category.create({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || '',
    });

    return {
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      description: category.description,
      articleCount: 0,
    };
  }

  async update(id: string, input: CategoryInput) {
    const category = await Category.findById(id);
    if (!category) {
      throw Object.assign(new Error('Catégorie introuvable'), { status: 404 });
    }

    if (input.name !== undefined) category.name = input.name.trim();
    if (input.description !== undefined) category.description = input.description.trim();

    if (input.slug?.trim()) {
      const slug = input.slug.trim().toLowerCase();
      const exists = await Category.exists({ slug, _id: { $ne: category._id } });
      if (exists) {
        throw Object.assign(new Error('Ce slug est déjà utilisé'), { status: 400 });
      }
      category.slug = slug;
    } else if (input.name?.trim()) {
      // keep existing slug on rename unless explicitly provided
    }

    await category.save();

    const { Article } = await import('../articles/article.model.js');
    const articleCount = await Article.countDocuments({ category: category._id });

    return {
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      description: category.description,
      articleCount,
    };
  }

  async remove(id: string) {
    const category = await Category.findById(id);
    if (!category) {
      throw Object.assign(new Error('Catégorie introuvable'), { status: 404 });
    }

    const { Article } = await import('../articles/article.model.js');
    const count = await Article.countDocuments({ category: category._id });
    if (count > 0) {
      throw Object.assign(
        new Error(`Impossible de supprimer : ${count} article(s) utilisent cette catégorie`),
        { status: 400 }
      );
    }

    await category.deleteOne();
    return { success: true };
  }

  private async mapArticle(article: Record<string, unknown>) {
    const category = article.category as { _id?: unknown; name?: string; slug?: string; description?: string } | null;
    const { Comment } = await import('../comments/comment.model.js');
    const commentCount = await Comment.countDocuments({ article: article._id, approved: true });
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
      categoryId: category?._id ? String(category._id) : String(article.category),
      category: category?._id
        ? {
            id: String(category._id),
            name: category.name,
            slug: category.slug,
            description: category.description,
          }
        : null,
      tags: article.tags || [],
      status: article.status,
      publishedAt: article.publishedAt ? new Date(article.publishedAt as string).toISOString() : null,
      scheduledAt: article.scheduledAt ? new Date(article.scheduledAt as string).toISOString() : null,
      readingTimeMinutes: article.readingTimeMinutes,
      likes: Number(article.likes || 0),
      commentCount,
      featured: article.featured,
      seo: article.seo,
      createdAt: new Date(article.createdAt as string).toISOString(),
      updatedAt: new Date(article.updatedAt as string).toISOString(),
    };
  }
}

export const categoryService = new CategoryService();
