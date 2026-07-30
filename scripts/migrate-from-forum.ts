import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { PostModel } from "../models/Post";
import { slugify } from "../lib/slug";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

type ForumPost = {
  _id: unknown;
  title?: string;
  content?: string;
  summary?: string;
  img?: string | null;
  createdAt?: Date | string;
  category?: unknown;
};

type ForumCategory = {
  _id: unknown;
  name?: string;
};

/**
 * forum and next-blog live on the same Atlas cluster, split by database name —
 * swap the `/next-blog` (or whatever) path segment for `/forum` to read the old
 * blog's data without needing a separate connection string.
 */
function deriveForumUri(nextBlogUri: string): string {
  const match = nextBlogUri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^/?]*)(\?.*)?$/);
  if (!match) {
    throw new Error("MONGODB_URI에서 데이터베이스 이름 부분을 찾지 못했습니다.");
  }
  const [, base, , query = ""] = match;
  return `${base}/forum${query}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI가 설정되어 있지 않습니다. .env.local을 확인하세요.");
  }
  const forumUri = process.env.FORUM_MONGODB_URI || deriveForumUri(uri);

  await mongoose.connect(uri);
  console.log("next-blog DB(next-blog)에 연결되었습니다.");

  // Read-only connection — this script never calls insert/update/delete on it.
  const forumConn = await mongoose.createConnection(forumUri).asPromise();
  console.log("forum DB(forum)에 읽기 전용으로 연결되었습니다.");

  const [forumPosts, forumCategories] = await Promise.all([
    forumConn.collection("post").find({}).toArray() as unknown as Promise<ForumPost[]>,
    forumConn.collection("category").find({}).toArray() as unknown as Promise<ForumCategory[]>,
  ]);
  await forumConn.close();

  const categoryNameById = new Map<string, string>();
  for (const cat of forumCategories) {
    if (cat.name) categoryNameById.set(String(cat._id), cat.name);
  }

  const existing = await PostModel.find({}, { slug: 1, legacyId: 1 }).lean<
    { slug: string; legacyId?: string }[]
  >();
  const slugByLegacyId = new Map(
    existing.filter((p) => p.legacyId).map((p) => [p.legacyId as string, p.slug])
  );
  const usedSlugs = new Set(existing.map((p) => p.slug));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let slugCollisions = 0;

  for (const post of forumPosts) {
    const legacyId = String(post._id);

    if (!post.title || !post.content) {
      console.warn(`스킵 (title/content 없음): legacyId=${legacyId}`);
      skipped++;
      continue;
    }

    // Reuse the slug assigned on a previous run — stable across re-runs, and
    // avoids the /posts/:slug URL silently changing under someone who bookmarked it.
    let slug = slugByLegacyId.get(legacyId);
    if (!slug) {
      const base = slugify(post.title) || legacyId;
      slug = base;
      if (usedSlugs.has(slug)) {
        slug = `${base}-${legacyId.slice(-6)}`;
        slugCollisions++;
      }
      usedSlugs.add(slug);
    }

    const tags = post.category ? [categoryNameById.get(String(post.category))].filter(Boolean) : [];

    const wasExisting = slugByLegacyId.has(legacyId);
    await PostModel.findOneAndUpdate(
      { legacyId },
      {
        $set: {
          slug,
          title: post.title,
          summary: post.summary || post.title,
          content: post.content,
          tags: tags as string[],
          coverImage: post.img || null,
          publishedAt: post.createdAt ? new Date(post.createdAt) : new Date(),
          status: "published",
          legacyId,
        },
      },
      { upsert: true }
    );

    if (wasExisting) updated++;
    else inserted++;
  }

  console.log(
    `완료 — 신규 ${inserted}건, 갱신 ${updated}건, 스킵 ${skipped}건, slug 충돌 해소 ${slugCollisions}건 (forum 총 ${forumPosts.length}건 중)`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
