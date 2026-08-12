import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const statisticSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const timelineMilestoneSchema = new Schema(
  {
    year: { type: String, required: true, trim: true },
    month: { type: Number, min: 1, max: 12, default: null },
    endYear: { type: String, default: null, trim: true },
    endMonth: { type: Number, min: 1, max: 12, default: null },
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const siteContentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    statistics: {
      type: [statisticSchema],
      default: [],
    },
    timeline: {
      type: [timelineMilestoneSchema],
      default: [],
    },
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

export type SiteContentDocument = InferSchemaType<typeof siteContentSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const SiteContent: Model<SiteContentDocument> =
  mongoose.models.SiteContent ||
  mongoose.model<SiteContentDocument>('SiteContent', siteContentSchema);
