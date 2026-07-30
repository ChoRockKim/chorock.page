import { NextResponse } from "next/server";
import { getCachedPosts } from "@/lib/posts";

export async function GET() {
  const posts = await getCachedPosts();
  return NextResponse.json({ posts });
}
