"use server";

import type { ReactNode } from "react";
import { pingIndexNow } from "@/lib/indexnow";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { compileMarkdown, estimateReadTime } from "@/lib/markdown";
import { slugify } from "@/lib/slug";
import { uploadPostImage } from "@/lib/uploadImage";
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

export type DraftSummary = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string; // ISO string — Date isn't serializable across the Server Action boundary
};

// There's no dedicated "drafts" page — DraftsPopup.tsx (a modal on /posts/write) calls this
// to list resumable drafts, since a draft's ?slug= URL was otherwise the only way back into it.
export async function listDrafts(): Promise<DraftSummary[]> {
  await requireOwner();
  await connectToDatabase();

  const docs = await PostModel.find({ status: "draft" }, { slug: 1, title: 1, summary: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .lean<{ slug: string; title: string; summary: string; updatedAt: Date }[]>();

  return docs.map((d) => ({
    slug: d.slug,
    title: d.title || "(제목 없음)",
    summary: d.summary,
    updatedAt: d.updatedAt.toISOString(),
  }));
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel's serverless function request body cap
// (~4.5MB) sits above this regardless of Next's own bodySizeLimit config — see next.config.ts.

// Next.js redacts EVERY thrown Server Action error into a generic "Server Components render"
// digest message in production, regardless of whether the throw was a genuine bug or a
// deliberate, safe-to-show validation message — confirmed the hard way: a plain
// `throw new Error("요약을 입력해주세요.")` for a missing field showed up to the user as the
// scary generic crash text instead. The fix Next.js actually supports for user-facing messages
// is to not throw at all for expected/validation outcomes — return a result object instead, so
// the message reaches the client verbatim. `throw` is reserved for genuinely unexpected errors
// (DB down, etc.), where showing the generic masked message is the correct/safe behavior.
export type ActionResult<T> = T | { error: string };

export async function uploadImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireOwner();

  const file = formData.get("image");
  if (!(file instanceof File)) return { error: "파일이 없습니다." };
  if (!file.type.startsWith("image/")) return { error: "이미지 파일만 업로드할 수 있습니다." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "이미지가 너무 큽니다 (4MB 이하로 올려주세요)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const url = await uploadPostImage(buffer);
    return { url };
  } catch (err) {
    // uploadPostImage (sharp decode/resize/encode, then S3 PutObject) is an external, fallible
    // operation — unlike requireOwner()'s throw (unreachable in practice, middleware already
    // blocks this), a real failure here (e.g. a malformed image, or a real-world animated GIF
    // large enough to hit sharp's default 268M-pixel safety limit once every frame counts
    // toward it) is exactly the kind of thing the single owner using this form needs to actually
    // see to diagnose, not Next's generic masked "Server Components render" message.
    return {
      error: `이미지 업로드에 실패했습니다: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * 저장 결과. `needsRevalidate`가 true면 클라이언트가 `POST /api/revalidate-posts`를 불러
 * 캐시를 비워야 한다 — 왜 액션 안에서 직접 비우지 않는지는 그 라우트 파일 주석에 있다.
 */
export type SaveResult = { slug: string; needsRevalidate: boolean };

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

async function upsertPost(input: SavePostInput, status: "draft" | "published"): Promise<ActionResult<SaveResult>> {
  await requireOwner();

  // Post.summary/content are required at the schema level (no separate "empty draft" state),
  // so validate up front with a message the form can show as-is — otherwise this only
  // surfaces as a raw Mongoose ValidationError with no client-side handler to display it,
  // which looks like the save silently did nothing.
  if (!input.title.trim()) return { error: "제목을 입력해주세요." };
  if (!input.summary.trim()) return { error: "요약을 입력해주세요." };
  if (!input.content.trim()) return { error: "본문을 입력해주세요." };

  await connectToDatabase();

  const seriesId = await resolveSeriesId(input);

  if (input.slug) {
    const existing = await PostModel.findOne({ slug: input.slug });
    if (existing) {
      const wasPublished = existing.status === "published";
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
      // 발행(또는 발행 글 수정)일 때만 검색엔진에 알린다 — 임시 저장은 공개 URL 변화가 없다.
      if (status === "published") await pingIndexNow([`/posts/${encodeURIComponent(existing.slug)}`]);
      // 재검증은 **여기서 하지 않는다.** app/api/revalidate-posts가 맡는다 — 이유는 그 파일 주석 참고.
      // 발행된 적 없는 초안 저장은 공개 페이지를 아예 바꾸지 않으므로 그것조차 부를 필요가 없다.
      return { slug: existing.slug, needsRevalidate: status === "published" || wasPublished };
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
  if (status === "published") await pingIndexNow([`/posts/${encodeURIComponent(slug)}`]);
  return { slug, needsRevalidate: status === "published" };
}

export async function saveDraft(input: SavePostInput): Promise<ActionResult<SaveResult>> {
  return upsertPost(input, "draft");
}

export async function publishPost(input: SavePostInput): Promise<ActionResult<SaveResult>> {
  return upsertPost(input, "published");
}
