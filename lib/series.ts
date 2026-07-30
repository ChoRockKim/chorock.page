import "server-only";
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

export async function getSeriesWithPosts(slug: string): Promise<SeriesWithPosts | null> {
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
