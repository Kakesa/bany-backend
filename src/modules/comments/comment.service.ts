import mongoose from 'mongoose';
import { Comment } from './comment.model.js';
import { Article } from '../articles/article.model.js';

export interface CommentInput {
  author?: string;
  email?: string;
  content?: string;
  parentId?: string | null;
}

function serialize(comment: Record<string, unknown>) {
  return {
    id: String(comment._id),
    articleId: String(comment.article),
    parentId: comment.parent ? String(comment.parent) : null,
    author: comment.author as string,
    email: (comment.email as string) || undefined,
    content: comment.content as string,
    likes: Number(comment.likes || 0),
    approved: Boolean(comment.approved),
    createdAt: new Date(comment.createdAt as string).toISOString(),
    updatedAt: new Date(comment.updatedAt as string).toISOString(),
  };
}

async function resolveArticleId(articleRef: string) {
  if (mongoose.isValidObjectId(articleRef)) {
    const byId = await Article.findById(articleRef).select('_id').lean();
    if (byId) return byId._id;
  }
  const bySlug = await Article.findOne({ slug: articleRef }).select('_id').lean();
  return bySlug?._id || null;
}

export class CommentService {
  async listByArticle(articleRef: string) {
    const articleId = await resolveArticleId(articleRef);
    if (!articleId) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }

    const comments = await Comment.find({ article: articleId, approved: true })
      .sort({ createdAt: 1 })
      .lean();

    return {
      items: comments.map((c) => serialize(c as Record<string, unknown>)),
      total: comments.length,
    };
  }

  async create(articleRef: string, input: CommentInput) {
    const articleId = await resolveArticleId(articleRef);
    if (!articleId) {
      throw Object.assign(new Error('Article introuvable'), { status: 404 });
    }

    const author = String(input.author || '').trim();
    const content = String(input.content || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    const parentId = input.parentId || null;

    if (!author) {
      throw Object.assign(new Error('Le nom est requis'), { status: 400 });
    }
    if (!content || content.length < 1) {
      throw Object.assign(new Error('Le commentaire est trop court'), { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Email invalide'), { status: 400 });
    }

    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        throw Object.assign(new Error('Réponse invalide'), { status: 400 });
      }
      const parent = await Comment.findOne({ _id: parentId, article: articleId });
      if (!parent) {
        throw Object.assign(new Error('Commentaire parent introuvable'), { status: 404 });
      }
    }

    const comment = await Comment.create({
      article: articleId,
      parent: parentId,
      author,
      email: email || undefined,
      content,
      likes: 0,
      approved: true,
    });

    return serialize(comment.toObject() as Record<string, unknown>);
  }

  async like(id: string) {
    const comment = await Comment.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true }).lean();
    if (!comment) {
      throw Object.assign(new Error('Commentaire introuvable'), { status: 404 });
    }
    return serialize(comment as Record<string, unknown>);
  }

  async unlike(id: string) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw Object.assign(new Error('Commentaire introuvable'), { status: 404 });
    }
    comment.likes = Math.max(0, (comment.likes || 0) - 1);
    await comment.save();
    return serialize(comment.toObject() as Record<string, unknown>);
  }

  async remove(id: string) {
    const deleted = await Comment.findByIdAndDelete(id);
    if (!deleted) {
      throw Object.assign(new Error('Commentaire introuvable'), { status: 404 });
    }
    // Also remove replies
    await Comment.deleteMany({ parent: id });
    return { success: true };
  }

  async listAll(limit = 50) {
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('article', 'title slug')
      .lean();

    return {
      items: comments.map((c) => {
        const article = c.article as { _id?: unknown; title?: string; slug?: string } | null;
        return {
          ...serialize(c as Record<string, unknown>),
          articleTitle: article?.title,
          articleSlug: article?.slug,
        };
      }),
    };
  }
}

export const commentService = new CommentService();
