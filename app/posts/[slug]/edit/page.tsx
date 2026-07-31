import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostForEditing, listDistinctTags } from "@/lib/posts";
import { listSeriesOptions } from "@/lib/series";
import WritePostForm from "@/components/WritePostForm";

export const metadata: Metadata = {
  title: "글 수정 · chorock.page",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // middleware.ts already redirects unauthenticated requests before this ever renders.
  const { slug } = await params;

  const [seriesOptions, allTags, existing] = await Promise.all([
    listSeriesOptions(),
    listDistinctTags(),
    getPostForEditing(decodeURIComponent(slug)),
  ]);

  if (!existing) notFound();

  return (
    <WritePostForm
      mode="edit"
      seriesOptions={seriesOptions}
      allTags={allTags}
      initial={{
        slug: existing.slug,
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        tags: existing.tags,
        seriesId: existing.seriesId,
      }}
    />
  );
}
