import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCachedPosts, countPublishedPosts } from "@/lib/posts";
import { POSTS_PAGE_SIZE } from "@/lib/postsPagination";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import PostsListClient from "@/components/PostsListClient";
import WritePostLink from "@/components/WritePostLink";

/**
 * Crawlable counterpart to /posts' client-side pagination.
 *
 * /posts renders exactly one page of five cards and paginates in local state, so its raw HTML
 * only ever contained five post links — Googlebot never reached the rest, and five posts had no
 * inbound link anywhere on the site (sitemap-only, which is what Search Console's "Discovered –
 * currently not indexed" was reporting). components/PostsListClient.tsx's page-number controls
 * are now anchors pointing here, and this route server-renders the matching slice so those
 * links exist in the HTML. Visitors with JS still never land here — the click handler
 * paginates in place — so this is effectively a crawler-facing mirror that also happens to be a
 * perfectly usable page on a direct hit or a modifier-click.
 *
 * Static, like /posts itself: no searchParams are read, so ISR is preserved (reading
 * `?page=` on /posts instead is what would have forced the whole route dynamic).
 */
export const revalidate = 300;

async function resolvePage(params: Promise<{ n: string }>) {
  const { n } = await params;
  // Page 1 lives at /posts. Redirecting rather than rendering it keeps a single URL for that
  // content instead of handing Google a duplicate to pick a canonical between.
  if (n === "1") permanentRedirect("/posts");
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();

  const total = await countPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE));
  if (page > totalPages) notFound();

  return { page, totalPages };
}

export async function generateStaticParams() {
  const total = await countPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE));
  // Page 1 is /posts, so this starts at 2. Pages past the build-time count are still served —
  // `dynamicParams` defaults to true — they just aren't pre-rendered.
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const title = `글 (${n}페이지) · chorock.page`;
  const description = "개발 기록을 남기는 블로그";
  // Self-canonical, not a canonical back to /posts: these pages hold different posts, so
  // pointing them at /posts would tell Google the content here is a duplicate of page 1 and
  // undo the whole reason the route exists.
  const url = `/posts/page/${n}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...SITE_OG_BASE,
      type: "website",
      url,
      title,
      description,
      images: SITE_OG_IMAGE,
    },
  };
}

export default async function PostsPaginatedPage({ params }: { params: Promise<{ n: string }> }) {
  const { page } = await resolvePage(params);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ["posts"], queryFn: getCachedPosts });

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}
      >
        <h1 style={{ fontSize: 30, margin: 0 }}>글</h1>
        <WritePostLink />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostsListClient initialPage={page} />
      </HydrationBoundary>
    </main>
  );
}
