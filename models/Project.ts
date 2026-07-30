import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const stackGroupSchema = new Schema(
  {
    label: { type: String, required: true },
    items: { type: [String], default: [] },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    role: { type: String, default: "" },
    team: { type: String, default: "" },
    period: { type: String, default: "" },
    tags: { type: [String], default: [] },
    stack: { type: [stackGroupSchema], default: [] },
    overviewMd: { type: String, default: "" }, // Markdown
    coverImage: { type: String, default: null },
    coverImageFit: { type: String, enum: ["cover", "contain"], default: "cover" },
    demoUrl: { type: String, default: null },
    repoUrl: { type: String, default: null },
    playStoreUrl: { type: String, default: null },
    appStoreUrl: { type: String, default: null },
    publishedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true }
);

projectSchema.index({ status: 1, publishedAt: -1 });

export type Project = InferSchemaType<typeof projectSchema> & { _id: Types.ObjectId };

export const ProjectModel = models.Project || model("Project", projectSchema);
