import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';

const campaignSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, default: '' },
    htmlContent: { type: String, required: true },
    textContent: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    scheduledAt: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    segment: {
      sources: { type: [String], default: [] },
      tags: { type: [String], default: [] },
      activeOnly: { type: Boolean, default: true },
    },
    stats: {
      recipients: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    createdBy: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
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

export type CampaignDocument = InferSchemaType<typeof campaignSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const Campaign: Model<CampaignDocument> =
  mongoose.models.Campaign || mongoose.model<CampaignDocument>('Campaign', campaignSchema);
