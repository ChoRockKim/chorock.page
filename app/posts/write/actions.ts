"use server";

import type { ReactNode } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { compileMarkdown, estimateReadTime } from "@/lib/markdown";
import { slugify } from "@/lib/slug";
import { PostModel } from "@/models/Post";
import { SeriesModel } from "@/models/Series";

async function requireOwner() {
  const session = await auth();
  if (!session) throw new Error("로그인이 필요합니다.");
}

export async function previewMarkdown(markdown: string): Promise<{ content: ReactNode; readTime: number }> {
  await requireOwner();
  const [{ content }, readTime] = [await compileMarkdown(markdown), estimateReadTime(markdown)];
  return { content, readTime };
}

export type SavePostInput = {
  slug: string | null; // existing post's slug when resuming a draft, null when creating new
  title: string;
  summary: string;
  content: string;
  tags: string[];
  seriesId: string | null; // an existing series picked from the autocomplete list
  newSeriesTitle: string | null; // typed text that didn't match any existing series — create one
};

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "untitled";
  let candidate = root;
  let n = 2;
  while (await PostModel.exists({ slug: candidate })) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * Resolves the series autocomplete input to an id: an explicit seriesId wins outright, a
 * newSeriesTitle is matched by title first (so retrying the same save doesn't create a
 * duplicate series after the first save already created it under stale client-side
 * seriesOptions) and only creates a Series document if no match exists.
 */
async function resolveSeriesId(input: SavePostInput): Promise<string | null> {
  if (input.seriesId) return input.seriesId;
  const title = input.newSeriesTitle?.trim();
  if (!title) return null;

  const existing = await SeriesModel.findOne({ title });
  if (existing) return String(existing._id);

  const slug = await uniqueSeriesSlug(slugify(title));
  const created = await SeriesModel.create({ slug, title });
  return String(created._id);
}

async function uniqueSeriesSlug(base: string): Promise<string> {
  const root = base || "series";
  let candidate = root;
  let n = 2;
  while (await SeriesModel.exists({ slug: candidate })) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

async function upsertPost(input: SavePostInput, status: "draft" | "published"): Promise<string> {
  await requireOwner();

  // Post.summary/content are required at the schema level (no separate "empty draft" state),
  // so validate up front with a message the form can show as-is — otherwise this only
  // surfaces as a raw Mongoose ValidationError with no client-side handler to display it,
  // which looks like the save silently did nothing.
  if (!input.title.trim()) throw new Error("제목을 입력해주세요.");
  if (!input.summary.trim()) throw new Error("요약을 입력해주세요.");
  if (!input.content.trim()) throw new Error("본문을 입력해주세요.");

  await connectToDatabase();

  const seriesId = await resolveSeriesId(input);

  if (input.slug) {
    const existing = await PostModel.findOne({ slug: input.slug });
    if (existing) {
      existing.title = input.title;
      existing.summary = input.summary;
      existing.content = input.content;
      existing.tags = input.tags;
      existing.seriesId = seriesId;
      // Only stamp publishedAt on the actual draft->published transition (schema requires
      // publishedAt to always have a value, so its mere presence can't signal "never
      // published" the way a nullable field could).
      if (status === "published" && existing.status !== "published") {
        existing.publishedAt = new Date();
      }
      existing.status = status;
      await existing.save();
      revalidatePosts();
      return existing.slug;
    }
  }

  const slug = await uniqueSlug(slugify(input.title));
  await PostModel.create({
    slug,
    title: input.title,
    summary: input.summary,
    content: input.content,
    tags: input.tags,
    seriesId,
    status,
    publishedAt: new Date(),
  });
  revalidatePosts();
  return slug;
}

/**
 * Busts both the unstable_cache entry behind lib/posts.ts#getCachedPosts (tags: ["posts"] —
 * shared by /posts's SSR prefetch and the /api/posts route TanStack Query hits) and the /posts
 * page's own ISR cache. Without this, a newly published/edited post only shows up on /posts
 * once the 300s revalidate window happens to lapse — publishing looked like it silently did
 * nothing to the list.
 */
function revalidatePosts() {
  revalidateTag("posts");
  revalidatePath("/posts");
}

export async function saveDraft(input: SavePostInput): Promise<{ slug: string }> {
  const slug = await upsertPost(input, "draft");
  return { slug };
}

export async function publishPost(input: SavePostInput): Promise<{ slug: string }> {
  const slug = await upsertPost(input, "published");
  return { slug };
}
