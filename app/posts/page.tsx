import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCachedPosts } from "@/lib/posts";
import PostsListClient from "@/components/PostsListClient";
import WritePostLink from "@/components/WritePostLink";

export const metadata: Metadata = {
  title: "글 · chorock.page",
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
