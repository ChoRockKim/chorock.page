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
  /** 가장 최근 글의 게시일. "2026년 8월 21일" */
  lastUpdated: string;
};

/**
 * 시리즈 안에서의 글 순서. `seriesOrder`가 있으면 그 순서, 없으면 `publishedAt` 순.
 *
 * **Mongo의 `.sort()`에 맡기면 안 된다** — Mongo는 null/누락을 맨 앞으로 보내므로, 순서를
 * 지정해 둔 시리즈에 새 글이 들어오면 그 글이 1편으로 튀어 오른다. 여기서는 null을 맨 뒤로
 * 보낸다. 시리즈의 글 전체를 어차피 가져오는 곳(상세 목록, 이전/다음)은 이 함수로 JS 정렬한다.
 *
 * 두 소비처(시리즈 상세 · 글 상세의 이전/다음)가 반드시 같은 규칙을 써야 한다. 하나라도
 * 어긋나면 화면마다 다른 순서를 말하게 된다. 세 번째 소비처였던 목록 카드의 목차 미리보기는
 * /series가 카드 그리드로 바뀌면서 사라졌고, 그래서 집계 쪽 $ifNull 흉내도 같이 없앴다.
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

/**
 * 카드 메타에 쓰는 "2026년 9월 14일" 표기.
 *
 * **UTC 게터를 쓴다.** 이 사이트는 글 날짜를 전부 `toISOString().slice(0, 10)`로 뽑는다
 * (같은 파일 getSeriesWithPosts의 dateLabel, lib/posts.ts의 publishedAt). 여기서만 getFullYear
 * 같은 로컬 게터를 쓰면 두 가지가 깨진다 — 같은 글이 목록 카드와 시리즈 상세에서 다른 날짜로
 * 보이고, Vercel(UTC)과 이 맥(KST)의 렌더 결과가 갈린다. 한국 시간 기준으로 바꾸고 싶다면
 * 이 함수만이 아니라 날짜를 만드는 모든 곳을 같이 옮겨야 한다.
 *
 * 로케일 API(toLocaleDateString/Intl)를 거치지 않는 이유는 호출부 주석 참고.
 */
function formatKoreanDate(d: Date): string {
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export async function listSeriesWithCounts(): Promise<SeriesSummary[]> {
  await connectToDatabase();

  // 편수와 최신 날짜만 있으면 카드가 그려진다(왕복은 2회).
  // 예전에는 카드에 목차 미리보기가 있어서 제목을 연재 순서대로 $push 했고, 그 순서를 맞추려고
  // $group 앞에 $ifNull + $sort가 있었다. 목차가 사라진 지금 $sum/$max는 순서와 무관하므로
  // 그 단계들을 들고 있을 이유가 없다 — 되살릴 일이 생기면 compareSeriesPosts 주석을 보라.
  const grouped = await PostModel.aggregate<{
    _id: unknown;
    count: number;
    last: Date;
  }>([
    { $match: { status: "published", seriesId: { $ne: null } } },
    {
      $group: {
        _id: "$seriesId",
        count: { $sum: 1 },
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
          // "2026년 9월 14일". toLocaleDateString/Intl은 쓰지 않는다 — 이 값은 서버에서
          // 만들어져 그대로 HTML에 박히므로 Node ICU와 브라우저의 표기가 갈리면 곤란하고,
          // 직접 조립하면 월·일에 0이 붙지도 않는다(CLAUDE.md의 localeCompare 주의와 같은 취지).
          lastUpdated: at ? formatKoreanDate(new Date(at)) : "",
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
