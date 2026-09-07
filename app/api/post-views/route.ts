import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PostViewModel } from "@/models/PostView";

// app/api/visits/route.ts와 같은 이유로 Intl을 쓴다. Vercel 함수는 UTC로 도는데, 평범한
// toISOString().slice(0,10)은 KST 자정이 아니라 오전 9시에 날짜가 넘어간다.
function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function totalViews(slug: string): Promise<number> {
  const agg = await PostViewModel.aggregate<{ _id: null; total: number }>([
    { $match: { slug } },
    { $group: { _id: null, total: { $sum: "$count" } } },
  ]);
  return agg[0]?.total ?? 0;
}

function readSlug(request: NextRequest): string | null {
  const slug = request.nextUrl.searchParams.get("slug");
  return slug && slug.trim() ? slug.trim() : null;
}

/** 조회수를 올리지 않고 읽기만 한다 — 24시간 안에 이미 본 글일 때 클라이언트가 이쪽을 쓴다. */
export async function GET(request: NextRequest) {
  const slug = readSlug(request);
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  await connectToDatabase();
  return NextResponse.json({ views: await totalViews(slug) });
}

/**
 * 조회를 1 올리고 **그 결과 총합까지 한 번에** 돌려준다. /about의 방문자 카운터는 기록(POST)과
 * 표시(GET)가 서로 다른 컴포넌트라 첫 방문에 순서 보장이 없어 "오늘 1 · 총 0" 같은 순간이
 * 생기는 알려진 quirk가 있는데, 여기서는 한 요청으로 합쳐 그 경합 자체를 없앴다.
 *
 * 중복 방지는 클라이언트(components/PostViewCounter.tsx)의 localStorage가 맡는다. 방문자
 * 카운터처럼 httpOnly 쿠키로 막으려면 "본 글 목록"을 쿠키 하나에 담아야 하는데, 글이 늘수록
 * 4KB 제한에 걸리고 오래된 항목을 지우는 관리가 붙는다. 장식성 지표라 그만한 값을 치를 이유가 없다.
 */
export async function POST(request: NextRequest) {
  const slug = readSlug(request);
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  await connectToDatabase();
  await PostViewModel.updateOne(
    { slug, date: todayKst() },
    { $inc: { count: 1 } },
    { upsert: true }
  );
  return NextResponse.json({ views: await totalViews(slug) });
}
