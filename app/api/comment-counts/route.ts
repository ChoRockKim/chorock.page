import { NextResponse, type NextRequest } from "next/server";
import { getCommentCounts } from "@/lib/giscusCounts";

// app/api/post-views/route.ts의 `?slugs=` 모드와 같은 형태. 목록 카드들이 화면에 뜬 slug를 모아
// 한 번에 묻는다(components/PostCommentCount.tsx). 상한도 같은 이유로 같은 값.
const MAX_BATCH = 50;

/**
 * `?slugs=a,b` → `{ counts: { a: number, b: number } }`. giscus 댓글 수(댓글+답글).
 * 실제 GitHub 호출은 lib/giscusCounts.ts가 300초 캐시로 묶고 있어, 이 라우트는 캐시된 맵에서
 * 꺼내기만 한다. 토큰 미설정·GitHub 실패 시에도 전부 0으로 채워 200을 돌려준다.
 */
export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = [...new Set(slugsParam.split(",").map((s) => s.trim()).filter(Boolean))];
  if (slugs.length === 0) return NextResponse.json({ counts: {} });
  if (slugs.length > MAX_BATCH) {
    return NextResponse.json({ error: `최대 ${MAX_BATCH}개까지 조회할 수 있습니다.` }, { status: 400 });
  }
  return NextResponse.json({ counts: await getCommentCounts(slugs) });
}
