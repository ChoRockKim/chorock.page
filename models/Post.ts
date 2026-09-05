import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const postSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true }, // Markdown
    tags: { type: [String], default: [] },
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    // 시리즈 안에서의 수동 순서(1부터). null이면 publishedAt으로 정렬한다.
    // 시리즈 문서에 글 ID 배열을 두지 않는 이유는 글이 추가·삭제·이동될 때마다 동기화해야
    // 하기 때문이다. 순서를 저장한 시리즈는 저장 시 모든 글에 1..N을 다시 쓰므로 한 시리즈
    // 안에 null과 숫자가 섞이지 않는다(섞이면 정렬이 어긋난다 — lib/series.ts 참고).
    seriesOrder: { type: Number, default: null },
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
postSchema.index({ seriesId: 1, seriesOrder: 1, publishedAt: 1 });
// Covers getRelatedPosts()'s { status, tags: $in, publishedAt sort } query shape.
postSchema.index({ status: 1, tags: 1, publishedAt: -1 });

export type Post = InferSchemaType<typeof postSchema> & { _id: Types.ObjectId };

export const PostModel = models.Post || model("Post", postSchema);
