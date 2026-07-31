import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const postSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true }, // Markdown
    tags: { type: [String], default: [] },
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    publishedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    coverImage: { type: String, default: null },
    // Old forum post's MongoDB _id (hex string). Only present on posts brought over by
    // scripts/migrate-from-forum.ts — used as the upsert key (safe to re-run) and to
    // resolve old /detail/:id links. sparse so manually-authored posts (no legacyId)
    // don't collide with each other under the unique index.
    legacyId: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

postSchema.index({ tags: 1, publishedAt: -1 });
postSchema.index({ seriesId: 1, publishedAt: 1 });
// Covers getRelatedPosts()'s { status, tags: $in, publishedAt sort } query shape.
postSchema.index({ status: 1, tags: 1, publishedAt: -1 });

export type Post = InferSchemaType<typeof postSchema> & { _id: Types.ObjectId };

export const PostModel = models.Post || model("Post", postSchema);
