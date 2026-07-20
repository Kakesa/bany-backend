import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const commentSchema = new Schema(
  {
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    author: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    likes: { type: Number, default: 0, min: 0 },
    approved: { type: Boolean, default: true },
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

export type CommentDocument = InferSchemaType<typeof commentSchema> & {
  _id: mongoose.Types.ObjectId;
  id: string;
};

export const Comment: Model<CommentDocument> =
  mongoose.models.Comment || mongoose.model<CommentDocument>('Comment', commentSchema);
