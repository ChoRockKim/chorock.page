import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { PostModel } from "@/models/Post";
import { SeriesModel } from "@/models/Series";
import { compareSeriesPosts } from "@/lib/series";

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  seriesTitle?: string;
};

export type SeriesNav = {
  slug: string;
  title: string;
  part: string; // "2/5"
  prevSlug: string | null;
  nextSlug: string | null;
};

export type PostDetail = PostSummary & {
  content: string;
  seriesId: string | null;
  /** mongoose `{ timestamps: true }` (models/Post.ts) gives this for free — used only as
   *  schema.org `dateModified` on the post detail page's BlogPosting JSON-LD. Optional
   *  because getPostForEditing() doesn't bother projecting it. */
  updatedAt?: string;
};

type LeanPostDoc = {
  _id: unknown;
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags?: string[];
  publishedAt: Date | string;
  updatedAt?: Date | string;
};

type LeanPostDocWithSeries = LeanPostDoc & { seriesId?: { title?: string } | null };

function toSummary(doc: LeanPostDoc, readTime: number, seriesTitle?: string): PostSummary {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    tags: doc.tags ?? [],
    publishedAt: new Date(doc.publishedAt).toISOString(),
    readTime,
    seriesTitle,
  };
}

async function fetchPostBySlug(slug: string): Promise<PostDetail | null> {
  await connectToDatabase();
  const doc = await PostModel.findOne({ slug, status: "published" }).lean<
    LeanPostDoc & { seriesId?: unknown }
  >();
  if (!doc) return null;

  const { estimateReadTime } = await import("@/lib/markdown");
  const readTime = estimateReadTime(doc.content);

  return {
    ...toSummary(doc, readTime),
    content: doc.content,
    seriesId: doc.seriesId ? String(doc.seriesId) : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/**
 * Wrapped in React's cache() so generateMetadata() and the page body (both call this with the
 * same slug during the same request) share one Mongo round-trip instead of two.
 */
export const getPostBySlug = cache(fetchPostBySlug);

/**
 * Same query, not cache()-wrapped — for app/posts/[slug]/opengraph-image.tsx. React's cache()
 * is only defined for use inside a React Server Component render; calling the cache()-wrapped
 * getPostBySlug from an opengraph-image route (which Next invokes outside that render context)
 * 500'd in production even though it worked in a local `next start` — confirmed by isolating
 * it: root opengraph-image.tsx (no cache()-wrapped call) succeeded on the same deployment,
 * every per-slug one (calling the cache()-wrapped version) failed, regardless of which slug.
 * No memoization benefit lost either way, since the image route is a separate HTTP request
 * from the page anyway — cache() only dedupes within one render pass.
 */
export const getPostBySlugForOg = fetchPostBySlug;

/** Published post slugs, for generateStaticParams — pre-renders every post at build time. */
export async function listPostSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await PostModel.find({ status: "published" }, { slug: 1 }).lean<{ slug: string }[]>();
  return docs.map((d) => d.slug);
}

export async function getPostByLegacyId(legacyId: string): Promise<{ slug: string } | null> {
  await connectToDatabase();
  return PostModel.findOne({ legacyId }, { slug: 1 }).lean<{ slug: string } | null>();
}

export type PostForEditing = PostDetail & {
  seriesId: string | null;
  status: "draft" | "published";
};

/**
 * Like getPostBySlug, but with no status filter (finds drafts too) and includes
 * seriesId/status — used only by the write form to resume an in-progress draft
 * (app/posts/write/page.tsx?slug=...), never rendered on any public page.
 */
export async function getPostForEditing(slug: string): Promise<PostForEditing | null> {
  await connectToDatabase();
  const doc = await PostModel.findOne({ slug }).lean<
    LeanPostDoc & { seriesId?: unknown; status: "draft" | "published" }
  >();
  if (!doc) return null;

  const { estimateReadTime } = await import("@/lib/markdown");
  const readTime = estimateReadTime(doc.content);

  return {
    ...toSummary(doc, readTime),
    content: doc.content,
    seriesId: doc.seriesId ? String(doc.seriesId) : null,
    status: doc.status,
  };
}

/**
 * Takes the current post's slug + seriesId directly (both already available on the PostDetail
 * getPostBySlug returns) instead of re-querying Post by slug just to look up seriesId — that
 * used to be a third redundant round-trip to the very document the caller already has.
 */
export async function getSeriesNav(
  currentSlug: string,
  seriesId: string | null
): Promise<SeriesNav | null> {
  if (!seriesId) return null;
  await connectToDatabase();

  const series = await SeriesModel.findById(seriesId).lean<{ slug: string; title: string } | null>();
  if (!series) return null;

  // 시리즈 상세 목록과 반드시 같은 순서여야 한다 — 이전/다음과 화면의 목록이 어긋나면 안 된다.
  // compareSeriesPosts가 그 단일 규칙이다(Mongo sort는 null을 맨 앞으로 보내 쓸 수 없다).
  const found = await PostModel.find(
    { seriesId, status: "published" },
    { slug: 1, publishedAt: 1, seriesOrder: 1 }
  ).lean<{ slug: string; publishedAt: Date; seriesOrder?: number | null }[]>();
  const siblings = [...found].sort(compareSeriesPosts);

  const idx = siblings.findIndex((s) => s.slug === currentSlug);
  if (idx === -1) return null;

  return {
    slug: series.slug,
    title: series.title,
    part: `${idx + 1}/${siblings.length}`,
    prevSlug: idx > 0 ? siblings[idx - 1].slug : null,
    nextSlug: idx < siblings.length - 1 ? siblings[idx + 1].slug : null,
  };
}

export async function getRelatedPosts(post: PostDetail, limit = 3): Promise<PostSummary[]> {
  await connectToDatabase();
  const docs = await PostModel.find({
    slug: { $ne: post.slug },
    status: "published",
    tags: { $in: post.tags },
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate("seriesId", "title")
    .lean<LeanPostDocWithSeries[]>();

  const { estimateReadTime } = await import("@/lib/markdown");
  return docs.map((doc) => toSummary(doc, estimateReadTime(doc.content), doc.seriesId?.title));
}

export async function countPublishedPosts(): Promise<number> {
  await connectToDatabase();
  return PostModel.countDocuments({ status: "published" });
}

export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  await connectToDatabase();
  const rows = await PostModel.aggregate<{ _id: string; count: number }>([
    { $match: { status: "published" } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ name: r._id, count: r.count }));
}

/**
 * Distinct tag strings across every post regardless of status — feeds the write form's tag
 * autocomplete, where a tag used only on an existing draft should still be suggested. (Separate
 * from getAllTags(), which is published-only and kept for a future public tag-browsing UI.)
 */
export async function listDistinctTags(): Promise<string[]> {
  await connectToDatabase();
  const tags = await PostModel.distinct("tags");
  return (tags as string[]).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function listPosts({
  tag,
  page = 1,
  pageSize = 5,
}: {
  tag?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ posts: PostSummary[]; total: number }> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { status: "published" };
  if (tag) filter.tags = tag;

  const [total, docs] = await Promise.all([
    PostModel.countDocuments(filter),
    PostModel.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("seriesId", "title")
      .lean<LeanPostDocWithSeries[]>(),
  ]);

  const { estimateReadTime } = await import("@/lib/markdown");
  return {
    posts: docs.map((doc) => toSummary(doc, estimateReadTime(doc.content), doc.seriesId?.title)),
    total,
  };
}

/**
 * All published posts, unpaginated — used by /posts, which does tag-filtering and
 * pagination client-side (components/PostsListClient.tsx) rather than round-tripping
 * to Mongo on every click. Fine at current post volumes; revisit if this ever needs
 * to hold more than a few hundred posts.
 */
export async function listAllPosts(): Promise<PostSummary[]> {
  await connectToDatabase();
  const docs = await PostModel.find({ status: "published" })
    .sort({ publishedAt: -1 })
    .populate("seriesId", "title")
    .lean<LeanPostDocWithSeries[]>();

  const { estimateReadTime } = await import("@/lib/markdown");
  return docs.map((doc) => toSummary(doc, estimateReadTime(doc.content), doc.seriesId?.title));
}

/**
 * Cached wrapper around listAllPosts — reused by both the /posts server prefetch and
 * app/api/posts's route handler so client fetches and the server's own hydration prefetch
 * share the same Next.js Data Cache entry instead of each hitting Mongo separately.
 */
export const getCachedPosts = unstable_cache(listAllPosts, ["posts-all"], {
  revalidate: 300,
  tags: ["posts"],
});

export async function searchPosts(query: string, limit = 8): Promise<PostSummary[]> {
  const q = query.trim();
  if (!q) return [];

  await connectToDatabase();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const docs = await PostModel.find({
    status: "published",
    $or: [{ title: regex }, { summary: regex }, { tags: regex }],
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean<LeanPostDoc[]>();

  const { estimateReadTime } = await import("@/lib/markdown");
  return docs.map((doc) => toSummary(doc, estimateReadTime(doc.content)));
}

/**
 * Sitemap rows for every published post, carrying a real `lastModified`.
 *
 * app/sitemap.ts used to emit bare `<loc>` entries with no `<lastmod>` at all, which gives
 * Google no freshness signal to prioritise crawling with — one of the contributing causes of
 * the "Discovered – currently not indexed" backlog in Search Console. Falls back to
 * `publishedAt` for the (migrated) documents that predate `{ timestamps: true }`.
 */
export async function listPostSitemapEntries(): Promise<{ slug: string; lastModified: Date }[]> {
  await connectToDatabase();
  const docs = await PostModel.find(
    { status: "published" },
    { slug: 1, updatedAt: 1, publishedAt: 1 }
  ).lean<{ slug: string; updatedAt?: Date; publishedAt: Date }[]>();
  return docs.map((d) => ({ slug: d.slug, lastModified: new Date(d.updatedAt ?? d.publishedAt) }));
}
