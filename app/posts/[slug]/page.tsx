import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getRelatedPosts, getSeriesNav, listPostSlugs } from "@/lib/posts";
import { compileMarkdown, extractHeadings } from "@/lib/markdown";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import ShareButton from "@/components/ShareButton";
import SeriesNav from "@/components/SeriesNav";
import TocMobile from "@/components/TocMobile";
import TableOfContents from "@/components/TableOfContents";
import PostCard from "@/components/PostCard";
import GiscusComments from "@/components/GiscusComments";
import PostOwnerActions from "@/components/PostOwnerActions";
import PostAuthorCard from "@/components/PostAuthorCard";

function formatDate(iso: string) {
  return iso.slice(0, 10).split("-").join(".");
}

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) return {};
  return {
    title: `${post.title} · chorock.page`,
    description: post.summary,
    openGraph: { title: post.title, description: post.summary },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) notFound();

  const [seriesNav, related, { content }] = await Promise.all([
    getSeriesNav(post.slug, post.seriesId),
    getRelatedPosts(post),
    compileMarkdown(post.content),
  ]);
  const headings = extractHeadings(post.content);

  return (
    <>
      <ReadingProgressBar />
      <div className="pd-grid">
        <article className="pd-body">
          <Link
            href="/posts"
            className="btn btn-ghost"
            style={{ fontSize: 13, paddingLeft: 0, marginBottom: "var(--space-4)" }}
          >
            ← 목록으로
          </Link>

          {seriesNav && <SeriesNav nav={seriesNav} />}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/posts?tag=${encodeURIComponent(tag)}`}
                className="tag tag-accent"
                style={{ textDecoration: "none", cursor: "pointer" }}
              >
                {tag}
              </Link>
            ))}
          </div>

          <h1 style={{ fontSize: 34, margin: "0 0 var(--space-2)", lineHeight: 1.2 }}>{post.title}</h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              marginBottom: "var(--space-6)",
            }}
          >
            <p style={{ fontSize: 13, opacity: 0.55, margin: 0 }}>
              {formatDate(post.publishedAt)} · {post.readTime}분 읽기
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <PostOwnerActions slug={post.slug} />
              <ShareButton title={post.title} />
            </div>
          </div>

          <TocMobile headings={headings} />

          <div>{content}</div>

          <div style={{ marginTop: "var(--space-6)" }}>
            <PostAuthorCard />
          </div>

          <div style={{ marginTop: "var(--space-6)" }}>
            <h3 style={{ fontSize: 16, margin: "0 0 var(--space-3)" }}>댓글</h3>
            <GiscusComments />
          </div>

          {related.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--color-divider)",
                paddingTop: "var(--space-4)",
                marginTop: "var(--space-6)",
              }}
            >
              <h3 style={{ fontSize: 16, margin: "0 0 var(--space-2)" }}>관련 글</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {related.map((r) => (
                  <PostCard key={r.id} post={r} compact />
                ))}
              </div>
            </div>
          )}
        </article>

        <TableOfContents headings={headings} />
      </div>
    </>
  );
}
