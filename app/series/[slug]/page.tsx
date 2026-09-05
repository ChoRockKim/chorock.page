import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeriesWithPosts, listSeriesSlugs } from "@/lib/series";
import JsonLd from "@/components/JsonLd";
import SeriesPostList from "@/components/SeriesPostList";
import { SITE_URL, SITE_OG_BASE, SITE_OG_IMAGE, canonicalPath } from "@/lib/siteMeta";

// Was fully dynamic (fresh Mongo round-trips + estimateReadTime() on every visit) with no
// loading.tsx — the exact "slow list->detail navigation" pattern already diagnosed and fixed
// for /posts/[slug] and /projects/[slug] (CHANGELOG 0.7.29). ISR here matches that fix.
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listSeriesSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesWithPosts(decodeURIComponent(slug));
  if (!series) return {};
  const url = canonicalPath("series", series.slug);
  return {
    title: `${series.title} · chorock.page`,
    description: series.description,
    alternates: { canonical: url },
    // See app/posts/page.tsx for why every field the root sets has to be restated here —
    // including `images`, since there's no per-series opengraph-image.tsx to fill it in.
    openGraph: {
      ...SITE_OG_BASE,
      type: "website",
      url,
      title: series.title,
      description: series.description,
      images: SITE_OG_IMAGE,
    },
  };
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesWithPosts(decodeURIComponent(slug));
  if (!series) notFound();

  const seriesUrl = `${SITE_URL}${canonicalPath("series", series.slug)}`;
  // A series is an ordered reading list, so its posts go in as an ItemList with explicit
  // positions rather than as an unordered CollectionPage — the order is the point.
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${seriesUrl}#series`,
        name: series.title,
        description: series.description,
        url: seriesUrl,
        inLanguage: "ko-KR",
        isPartOf: { "@id": `${SITE_URL}#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: series.posts.length,
          itemListElement: series.posts.map((post, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: post.title,
            url: `${SITE_URL}${canonicalPath("posts", post.slug)}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "시리즈", item: `${SITE_URL}/series` },
          { "@type": "ListItem", position: 2, name: series.title, item: seriesUrl },
        ],
      },
    ],
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
      <JsonLd data={seriesJsonLd} />
      <Link
        href="/series"
        className="btn btn-ghost"
        style={{ fontSize: 13, paddingLeft: 0, marginBottom: "var(--space-4)" }}
      >
        ← 시리즈 목록
      </Link>

      <h1 style={{ fontSize: 28, margin: "0 0 var(--space-2)" }}>{series.title}</h1>
      <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 var(--space-6)", maxWidth: "60ch" }}>
        {series.description}
      </p>

      <SeriesPostList seriesSlug={series.slug} posts={series.posts} />
    </main>
  );
}
