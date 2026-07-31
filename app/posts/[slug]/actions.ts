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
  // post keeps showing on /posts until the unstable_cache's 300s window lapses (see 0.7.26).
  revalidateTag("posts");
  revalidatePath("/posts");
}
