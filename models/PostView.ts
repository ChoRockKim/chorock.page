import { Schema, model, models, type InferSchemaType } from "mongoose";

const postViewSchema = new Schema(
  {
    // 글 slug + KST 기준 YYYY-MM-DD. models/Visit.ts의 DailyVisit와 같은 모양으로, 하루에 문서
    // 하나씩 $inc로 원자적으로 올린다. 글의 총 조회수는 이 컬렉션의 SUM 집계로 구한다 —
    // 별도의 누적 카운터를 따로 유지하지 않으므로 두 숫자가 어긋날 수 없다.
    // 날짜별로 쪼갠 덕에 나중에 기간별 통계("이번 주 인기 글")를 새로 만들지 않고도 낼 수 있다.
    slug: { type: String, required: true },
    date: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// upsert가 이 조합으로 정확히 한 문서를 찾도록 하는 것이 핵심이다. 유니크가 아니면 동시 요청이
// 같은 (slug, date)에 문서를 여러 개 만들 수 있고, 그러면 집계는 맞아도 문서가 지저분해진다.
postViewSchema.index({ slug: 1, date: 1 }, { unique: true });

export type PostView = InferSchemaType<typeof postViewSchema> & { _id: string };

export const PostViewModel = models.PostView || model("PostView", postViewSchema);
