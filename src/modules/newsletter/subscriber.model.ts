import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'blog' },
    subscribedAt: { type: Date, default: Date.now },
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

export type SubscriberDocument = InferSchemaType<typeof subscriberSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const Subscriber: Model<SubscriberDocument> =
  mongoose.models.Subscriber || mongoose.model<SubscriberDocument>('Subscriber', subscriberSchema);
