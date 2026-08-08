import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCachedPosts } from "@/lib/posts";
import PostsListClient from "@/components/PostsListClient";
import WritePostLink from "@/components/WritePostLink";

// Next's metadata merging doesn't sync `title` into an inherited `openGraph` object — a child
// route that only sets `title` still shows the root layout's openGraph.title when shared, so
// this needs its own explicit openGraph.title/description (see CLAUDE.md). Setting a partial
// openGraph object here also REPLACES (not merges) the images the root's opengraph-image.tsx
// would otherwise contribute via inheritance — confirmed by curling this route's rendered HTML
// and seeing og:image disappear — so `images` has to be restated explicitly too.
export const metadata: Metadata = {
  title: "글 · chorock.page",
  openGraph: { title: "글 · chorock.page", description: "개발 기록을 남기는 블로그", images: ["/opengraph-image"] },
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
