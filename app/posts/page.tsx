import type { Metadata } from "next";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCachedPosts } from "@/lib/posts";
import PostsListClient from "@/components/PostsListClient";
import WritePostLink from "@/components/WritePostLink";

// Next's metadata merging doesn't sync `title` into an inherited `openGraph` object — a child
// route that only sets `title` still shows the root layout's openGraph.title when shared, so
// this needs its own explicit openGraph.title/description (see CLAUDE.md). Setting a partial
// openGraph object here also REPLACES (not merges) the rest of the root's openGraph —
// confirmed by curling this route's rendered HTML: og:image disappeared until `images` was
// restated, and og:type/og:site_name/og:locale were missing site-wide until SITE_OG_BASE was
// spread back in here. Anything the root sets and this route wants has to be repeated.
export const metadata: Metadata = {
  title: "글 · chorock.page",
  description: "개발 기록을 남기는 블로그",
  alternates: { canonical: "/posts" },
  openGraph: {
    ...SITE_OG_BASE,
    type: "website",
    url: "/posts",
    title: "글 · chorock.page",
    description: "개발 기록을 남기는 블로그",
    images: SITE_OG_IMAGE,
  },
};

export const revalidate = 300;

export default async function PostsPage() {
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
        <PostsListClient />
      </HydrationBoundary>
    </main>
  );
}
