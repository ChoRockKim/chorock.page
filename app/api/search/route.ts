import { NextRequest, NextResponse } from "next/server";
import { searchPosts } from "@/lib/posts";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchPosts(q);
  return NextResponse.json({ results });
}
