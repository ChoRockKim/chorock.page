import "server-only";
import { cache } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import { PostModel } from "@/models/Post";
import { SeriesModel } from "@/models/Series";

export type SeriesSummary = {
  slug: string;
  title: string;
  description: string;
  count: number;
};

export type SeriesPost = {
  slug: string;
  title: string;
  part: string; // "2/3"
  dateLabel: string;
  readTime: number;
};

export type SeriesWithPosts = {
  slug: string;
  title: string;
  description: string;
  posts: SeriesPost[];
};

export async function listSeriesWithCounts(): Promise<SeriesSummary[]> {
  await connectToDatabase();

  const counts = await PostModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { status: "published", seriesId: { $ne: null } } },
    { $group: { _id: "$seriesId", count: { $sum: 1 } } },
  ]);
  const countBySeriesId = new Map(counts.map((c) => [String(c._id), c.count]));

  const series = await SeriesModel.find().lean<{ _id: unknown; slug: string; title: string; description: string }[]>();

  return series
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      count: countBySeriesId.get(String(s._id)) ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

export type SeriesOption = { id: string; title: string };

/** All series (regardless of published-post count) for the write form's series <select>. */
export async function listSeriesOptions(): Promise<SeriesOption[]> {
  await connectToDatabase();

  const docs = await SeriesModel.find({}, { title: 1 })
    .sort({ title: 1 })
    .lean<{ _id: unknown; title: string }[]>();

  return docs.map((d) => ({ id: String(d._id), title: d.title }));
}

/** Slugs of series with at least one published post — generateStaticParams() for
 *  app/series/[slug]/page.tsx. Mirrors listSeriesWithCounts()'s published-count filter so a
 *  slug that would 404 via getSeriesWithPosts (no published posts) is never pre-rendered. */
export async function listSeriesSlugs(): Promise<string[]> {
  await connectToDatabase();

  const counts = await PostModel.aggregate<{ _id: unknown }>([
    { $match: { status: "published", seriesId: { $ne: null } } },
    { $group: { _id: "$seriesId" } },
  ]);
  const seriesIds = counts.map((c) => c._id);

  const docs = await SeriesModel.find({ _id: { $in: seriesIds } }, { slug: 1 }).lean<{ slug: string }[]>();
  return docs.map((d) => d.slug);
}

async function fetchSeriesWithPosts(slug: string): Promise<SeriesWithPosts | null> {
  await connectToDatabase();

  const series = await SeriesModel.findOne({ slug }).lean<{
    _id: unknown;
    slug: string;
    title: string;
    description: string;
  } | null>();
  if (!series) return null;

  const docs = await PostModel.find(
    { seriesId: series._id, status: "published" },
    { slug: 1, title: 1, publishedAt: 1, content: 1 }
  )
    .sort({ publishedAt: 1 })
    .lean<{ slug: string; title: string; publishedAt: Date; content: string }[]>();
  if (docs.length === 0) return null;

  const { estimateReadTime } = await import("@/lib/markdown");

  return {
    slug: series.slug,
    title: series.title,
    description: series.description,
    posts: docs.map((doc, i) => ({
      slug: doc.slug,
      title: doc.title,
      part: `${i + 1}/${docs.length}`,
      dateLabel: new Date(doc.publishedAt).toISOString().slice(0, 10).split("-").join("."),
      readTime: estimateReadTime(doc.content),
    })),
  };
}

/** Wrapped in React's cache() so generateMetadata() and the page body (both call this with the
 *  same slug during the same request) share one pair of Mongo round-trips instead of two —
 *  same pattern as lib/posts.ts#getPostBySlug / lib/projects.ts#getProjectBySlug. */
export const getSeriesWithPosts = cache(fetchSeriesWithPosts);

/**
 * Sitemap rows for every series that has at least one published post.
 *
 * `lastModified` is the newest post in the series, not the Series document's own `updatedAt` —
 * the series page's actual content is its post list, so adding a post to a series changes the
 * page even though the Series document itself never gets touched.
 */
export async function listSeriesSitemapEntries(): Promise<{ slug: string; lastModified: Date }[]> {
  await connectToDatabase();

  const groups = await PostModel.aggregate<{ _id: unknown; lastModified: Date }>([
    { $match: { status: "published", seriesId: { $ne: null } } },
    { $group: { _id: "$seriesId", lastModified: { $max: { $ifNull: ["$updatedAt", "$publishedAt"] } } } },
  ]);
  const lastModifiedBySeriesId = new Map(groups.map((g) => [String(g._id), g.lastModified]));

  const docs = await SeriesModel.find(
    { _id: { $in: groups.map((g) => g._id) } },
    { slug: 1 }
  ).lean<{ _id: unknown; slug: string }[]>();

  return docs.map((d) => ({
    slug: d.slug,
    lastModified: new Date(lastModifiedBySeriesId.get(String(d._id)) ?? Date.now()),
  }));
}
