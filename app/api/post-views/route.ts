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

// 목록 화면은 카드마다 요청을 보내는 대신 화면에 뜬 slug를 모아 한 번에 묻는다
// (components/PostViews.tsx). 상한을 두는 건 임의의 긴 $in 배열이 들어오는 걸 막기 위한 것이고,
// 한 화면에 뜨는 카드 수(목록 5개, /about 3개)보다 넉넉하다.
const MAX_BATCH = 50;

/**
 * 조회수를 올리지 않고 읽기만 한다.
 * - `?slug=x`  → `{ views: number }` — 상세 페이지에서 24시간 안에 이미 본 글일 때.
 * - `?slugs=a,b` → `{ views: { a: number, b: number } }` — 목록 카드들이 한 번에 묻는 경우.
 *   기록이 없는 slug도 0으로 채워 돌려준다(클라이언트가 빈 값을 따로 다루지 않아도 되게).
 */
export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs");
  if (slugsParam !== null) {
    const slugs = [...new Set(slugsParam.split(",").map((s) => s.trim()).filter(Boolean))];
    if (slugs.length === 0) return NextResponse.json({ views: {} });
    if (slugs.length > MAX_BATCH) {
      return NextResponse.json({ error: `최대 ${MAX_BATCH}개까지 조회할 수 있습니다.` }, { status: 400 });
    }
    await connectToDatabase();
    const agg = await PostViewModel.aggregate<{ _id: string; total: number }>([
      { $match: { slug: { $in: slugs } } },
      { $group: { _id: "$slug", total: { $sum: "$count" } } },
    ]);
    const found = new Map(agg.map((r) => [r._id, r.total]));
    const views = Object.fromEntries(slugs.map((s) => [s, found.get(s) ?? 0]));
    return NextResponse.json({ views });
  }

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
