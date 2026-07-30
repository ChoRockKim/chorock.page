import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { PostModel } from "../models/Post";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  console.log(`${label}: ${(performance.now() - start).toFixed(1)}ms`);
  return result;
}

async function main() {
  await time("mongoose.connect (cold)", () => mongoose.connect(process.env.MONGODB_URI!));

  await time("countDocuments (1st, cold query planner)", () =>
    PostModel.countDocuments({ status: "published" })
  );
  await time("countDocuments (2nd, warm)", () => PostModel.countDocuments({ status: "published" }));
  await time("aggregate (getAllTags-equivalent)", () =>
    PostModel.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
    ])
  );
  await time("find + populate (listPosts-equivalent)", () =>
    PostModel.find({ status: "published" }).sort({ publishedAt: -1 }).limit(5).populate("seriesId", "title").lean()
  );
  await time("find + populate (2nd, warm)", () =>
    PostModel.find({ status: "published" }).sort({ publishedAt: -1 }).limit(5).populate("seriesId", "title").lean()
  );

  await mongoose.disconnect();
}
main();
