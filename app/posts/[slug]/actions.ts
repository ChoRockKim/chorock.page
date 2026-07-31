"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { PostModel } from "@/models/Post";

async function requireOwner() {
  const session = await auth();
  if (!session) throw new Error("로그인이 필요합니다.");
}

export async function deletePost(slug: string): Promise<void> {
  await requireOwner();
  await connectToDatabase();

  const result = await PostModel.deleteOne({ slug });
  if (result.deletedCount === 0) throw new Error("삭제할 글을 찾지 못했습니다.");

  // Same cache-busting as app/posts/write/actions.ts#revalidatePosts — otherwise the deleted
  // post keeps showing on /posts (0.7.26) and its own now-404 detail page keeps serving the
  // stale ISR'd content (0.7.29) until the 300s window lapses.
  revalidateTag("posts");
  revalidatePath("/posts");
  // Must be percent-encoded for non-ASCII (Korean) slugs — see the identical note in
  // app/posts/write/actions.ts#revalidatePosts.
  revalidatePath(`/posts/${encodeURIComponent(slug)}`);
}
