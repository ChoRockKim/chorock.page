import { Schema, model, models, type InferSchemaType } from "mongoose";

const dailyVisitSchema = new Schema(
  {
    // YYYY-MM-DD in KST (Asia/Seoul) — see app/api/visits/route.ts's date helper. One document
    // per calendar day, incremented atomically via $inc; the site total is a SUM aggregation
    // across this collection rather than a separately-maintained running counter, so there's
    // only one source of truth and the two numbers can never drift apart.
    date: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export type DailyVisit = InferSchemaType<typeof dailyVisitSchema> & { _id: string };

export const DailyVisitModel = models.DailyVisit || model("DailyVisit", dailyVisitSchema);
