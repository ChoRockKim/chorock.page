import { Schema, model, models, type InferSchemaType } from "mongoose";

const seriesSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export type Series = InferSchemaType<typeof seriesSchema> & { _id: string };

export const SeriesModel = models.Series || model("Series", seriesSchema);
