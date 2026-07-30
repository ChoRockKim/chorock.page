import type { Metadata } from "next";
import { getPostForEditing, listDistinctTags } from "@/lib/posts";
import { listSeriesOptions } from "@/lib/series";
import WritePostForm from "@/components/WritePostForm";

export const metadata: Metadata = {
  title: "새 글 작성 · chorock.page",
};

export default async function WritePostPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  // middleware.ts already redirects unauthenticated requests before this ever renders.
  const { slug } = await searchParams;

  const [seriesOptions, allTags, existing] = await Promise.all([
    listSeriesOptions(),
    listDistinctTags(),
    slug ? getPostForEditing(decodeURIComponent(slug)) : Promise.resolve(null),
  ]);

  return (
    <WritePostForm
      seriesOptions={seriesOptions}
      allTags={allTags}
      initial={
        existing
          ? {
              slug: existing.slug,
              title: existing.title,
              summary: existing.summary,
              content: existing.content,
              tags: existing.tags,
              seriesId: existing.seriesId,
            }
          : undefined
      }
    />
  );
}
