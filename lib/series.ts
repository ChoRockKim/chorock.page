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
  /** 목록 카드에 목차처럼 보여줄 앞부분 글 제목. 연재 순서(게시일 오름차순). */
  previewTitles: string[];
  /** 가장 최근 글의 게시일. "2026.08.21" */
  lastUpdated: string;
};

/** 카드에 미리 보여줄 편수. 이보다 많으면 "… 외 N편"으로 접는다. */
const PREVIEW_COUNT = 3;

/**
 * 시리즈 안에서의 글 순서. `seriesOrder`가 있으면 그 순서, 없으면 `publishedAt` 순.
 *
 * **Mongo의 `.sort()`에 맡기면 안 된다** — Mongo는 null/누락을 맨 앞으로 보내므로, 순서를
 * 지정해 둔 시리즈에 새 글이 들어오면 그 글이 1편으로 튀어 오른다. 여기서는 null을 맨 뒤로
 * 보낸다. 시리즈의 글 전체를 어차피 가져오는 곳(상세 목록, 이전/다음)은 이 함수로 JS 정렬하고,
 * 집계로 처리하는 곳은 `$ifNull`로 같은 규칙을 흉내 낸다(listSeriesWithCounts).
 *
 * 세 소비처(목록 카드 미리보기 · 시리즈 상세 · 글 상세의 이전/다음)가 반드시 같은 규칙을
 * 써야 한다. 하나라도 어긋나면 화면마다 다른 순서를 말하게 된다.
 */
export function compareSeriesPosts(
  a: { seriesOrder?: number | null; publishedAt: Date | string },
  b: { seriesOrder?: number | null; publishedAt: Date | string }
): number {
  const ao = a.seriesOrder ?? Number.POSITIVE_INFINITY;
  const bo = b.seriesOrder ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
}

/** 순서 미지정(null)을 맨 뒤로 보내기 위한 대체값. 집계에서 $ifNull과 함께 쓴다. */
const UNORDERED_RANK = 1e9;

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

  // 개수만 세던 집계를 넓혀 제목과 최신 날짜까지 한 번에 가져온다(왕복은 그대로 2회).
  // $group 앞의 $sort가 $push의 순서를 보존하므로 titles는 연재 순서 그대로다.
  // 제목을 전부 push한 뒤 앞 3개만 쓰는 건 글이 수십 편인 현재 규모에서 문제가 없어서다.
  // 편수가 크게 늘면 $firstN으로 바꾸면 된다.
  const grouped = await PostModel.aggregate<{
    _id: unknown;
    count: number;
    titles: string[];
    last: Date;
  }>([
    { $match: { status: "published", seriesId: { $ne: null } } },
    // Mongo는 null을 맨 앞으로 정렬하므로 큰 수로 치환해 맨 뒤로 보낸다(compareSeriesPosts와 동일 규칙).
    { $addFields: { _ord: { $ifNull: ["$seriesOrder", UNORDERED_RANK] } } },
    { $sort: { _ord: 1, publishedAt: 1 } },
    {
      $group: {
        _id: "$seriesId",
        count: { $sum: 1 },
        titles: { $push: "$title" },
        last: { $max: "$publishedAt" },
      },
    },
  ]);
  const bySeriesId = new Map(grouped.map((g) => [String(g._id), g]));

  const series = await SeriesModel.find().lean<{ _id: unknown; slug: string; title: string; description: string }[]>();

  // 정렬 키(타임스탬프)는 반환 타입에 넣지 않고 여기서만 들고 있는다.
  return series
    .map((s) => {
      const g = bySeriesId.get(String(s._id));
      const at = g?.last ? new Date(g.last).getTime() : 0;
      return {
        at,
        item: {
          slug: s.slug,
          title: s.title,
          description: s.description,
          count: g?.count ?? 0,
          previewTitles: (g?.titles ?? []).slice(0, PREVIEW_COUNT),
          // 같은 파일의 getSeriesWithPosts가 쓰는 포맷과 동일하게 맞춘다.
          lastUpdated: at
            ? new Date(at).toISOString().slice(0, 10).split("-").join(".")
            : "",
        },
      };
    })
    .filter((x) => x.item.count > 0)
    // 카드에 날짜를 띄우므로 최신 업데이트 순으로 세운다. 동률이면 slug로 안정 정렬한다.
    // localeCompare는 쓰지 않는다 — 서버(Node ICU)와 브라우저의 정렬이 달라지면 하이드레이션이
    // 깨진다(CLAUDE.md).
    .sort(
      (a, b) =>
        b.at - a.at ||
        (a.item.slug < b.item.slug ? -1 : a.item.slug > b.item.slug ? 1 : 0)
    )
    .map((x) => x.item);
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

  // 정렬은 Mongo가 아니라 compareSeriesPosts로 한다(null을 맨 뒤로 보내야 하므로).
  const found = await PostModel.find(
    { seriesId: series._id, status: "published" },
    { slug: 1, title: 1, publishedAt: 1, content: 1, seriesOrder: 1 }
  ).lean<
    {
      slug: string;
      title: string;
      publishedAt: Date;
      content: string;
      seriesOrder?: number | null;
    }[]
  >();
  if (found.length === 0) return null;
  const docs = [...found].sort(compareSeriesPosts);

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
