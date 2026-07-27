import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export type EmailTemplateCategory = 'welcome' | 'article' | 'announcement' | 'custom';

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      enum: ['welcome', 'article', 'announcement', 'custom'],
      default: 'custom',
      index: true,
    },
    subject: { type: String, required: true },
    previewText: { type: String, default: '' },
    htmlBody: { type: String, required: true },
    textBody: { type: String, default: '' },
    isSystem: { type: Boolean, default: false },
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

export type EmailTemplateDocument = InferSchemaType<typeof emailTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const EmailTemplate: Model<EmailTemplateDocument> =
  mongoose.models.EmailTemplate ||
  mongoose.model<EmailTemplateDocument>('EmailTemplate', emailTemplateSchema);
