import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { DailyVisitModel } from "@/models/Visit";

const LAST_VISIT_COOKIE = "chorock_last_visit";

// Vercel's serverless functions run in UTC — a plain `new Date().toISOString().slice(0, 10)`
// would roll "today" over at 9am KST instead of midnight, which looks wrong for a "오늘 방문자"
// count aimed at Korean visitors. Intl with an explicit timeZone sidesteps the server's own
// clock/locale entirely.
function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function currentCounts(today: string): Promise<{ today: number; total: number }> {
  const [todayDoc, totalAgg] = await Promise.all([
    DailyVisitModel.findOne({ date: today }).lean<{ count: number } | null>(),
    DailyVisitModel.aggregate<{ _id: null; total: number }>([
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
  ]);
  return { today: todayDoc?.count ?? 0, total: totalAgg[0]?.total ?? 0 };
}

/** Read-only — used by components/VisitCounter.tsx to display counts without recording a visit. */
export async function GET() {
  await connectToDatabase();
  const counts = await currentCounts(todayKst());
  return NextResponse.json(counts);
}

/**
 * Records a visit (once per browser per KST calendar day, deduped via an httpOnly cookie) and
 * returns the resulting counts. Called by components/VisitTracker.tsx, mounted once in
 * app/layout.tsx, so this fires on every page — not just /about — for a site-wide count.
 */
export async function POST(request: NextRequest) {
  await connectToDatabase();
  const today = todayKst();

  const lastVisit = request.cookies.get(LAST_VISIT_COOKIE)?.value;
  if (lastVisit !== today) {
    await DailyVisitModel.updateOne({ date: today }, { $inc: { count: 1 } }, { upsert: true });
  }

  const counts = await currentCounts(today);
  const response = NextResponse.json(counts);
  response.cookies.set(LAST_VISIT_COOKIE, today, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 26, // a little over a day, comfortably covers the KST day boundary
  });
  return response;
}
