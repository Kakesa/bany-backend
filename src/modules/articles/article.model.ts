import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const seoSchema = new Schema(
  {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    ogImage: { type: String },
    canonicalUrl: { type: String },
  },
  { _id: false }
);

const articleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    youtubeUrl: { type: String },
    author: { type: String, default: 'Bany' },
    authorTitle: {
      type: String,
      default: 'Founder & CEO – Yolo Group | Honorary Doctor (Entrepreneurship & Host of Bany Talks)',
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    readingTimeMinutes: { type: Number, default: 1 },
    likes: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    seo: { type: seoSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

articleSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text', author: 'text' });

export type ArticleStatus = 'draft' | 'scheduled' | 'published';

export type ArticleDocument = InferSchemaType<typeof articleSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const Article: Model<ArticleDocument> =
  mongoose.models.Article || mongoose.model<ArticleDocument>('Article', articleSchema);
