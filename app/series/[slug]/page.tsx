import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeriesWithPosts } from "@/lib/series";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesWithPosts(decodeURIComponent(slug));
  if (!series) return {};
  return {
    title: `${series.title} · chorock.page`,
    description: series.description,
    // See app/posts/page.tsx for why images needs restating here too (no per-series
    // opengraph-image.tsx, so this would otherwise silently lose the inherited root image).
    openGraph: { title: series.title, description: series.description, images: ["/opengraph-image"] },
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

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {series.posts.map((post) => (
          <Link
            key={post.slug}
            href={`/posts/${post.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) 0",
              borderBottom: "1px solid var(--color-divider)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span
              style={{
                flex: "none",
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--color-accent-100)",
                color: "var(--color-accent-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {post.part.split("/")[0]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, margin: "0 0 3px" }}>{post.title}</h3>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.55 }}>
                {post.dateLabel} · {post.readTime}분 읽기
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
