"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { pingIndexNow } from "@/lib/indexnow";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { PostModel } from "@/models/Post";

async function requireOwner() {
  const session = await auth();
  if (!session) throw new Error("로그인이 필요합니다.");
}

// See app/posts/write/actions.ts's ActionResult comment — Next.js masks every thrown Server
// Action error into a generic production message, so an intentional/expected error like "already
// deleted" needs to be a return value instead of a throw to actually reach the user.
export async function deletePost(slug: string): Promise<{ error: string } | void> {
  await requireOwner();
  await connectToDatabase();

  const result = await PostModel.deleteOne({ slug });
  if (result.deletedCount === 0) return { error: "삭제할 글을 찾지 못했습니다." };

  // Same cache-busting as app/posts/write/actions.ts#revalidatePosts — otherwise the deleted
  // post keeps showing on /posts (0.7.26), its own now-404 detail page keeps serving the
  // stale ISR'd content (0.7.29), /about's "최근 글" keeps listing it (0.7.32), and /series's
  // post counts (or the series itself, if this was its last post) stay stale (0.7.36) until
  // each page's 300s window lapses.
  revalidateTag("posts");
  revalidatePath("/posts");
  // Must be percent-encoded for non-ASCII (Korean) slugs — see the identical note in
  // app/posts/write/actions.ts#revalidatePosts.
  revalidatePath(`/posts/${encodeURIComponent(slug)}`);
  revalidatePath("/about");
  revalidatePath("/series");
  // 삭제된 URL도 제출한다 — IndexNow 스펙상 검색엔진이 재크롤해 404를 보고 색인에서 내린다.
  await pingIndexNow([`/posts/${encodeURIComponent(slug)}`]);
}
