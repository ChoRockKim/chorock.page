import Link from "next/link";
import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getCachedPosts } from "@/lib/posts";
import PostsListClient from "@/components/PostsListClient";

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
        <Link href="/posts/write" className="btn btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>
          새 글 작성
        </Link>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostsListClient />
      </HydrationBoundary>
    </main>
  );
}
