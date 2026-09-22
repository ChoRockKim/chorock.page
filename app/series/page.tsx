import type { Metadata } from "next";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import { listSeriesWithCounts } from "@/lib/series";
import SeriesCard from "@/components/SeriesCard";

// See app/posts/page.tsx for why every field the root layout sets has to be repeated here.
export const metadata: Metadata = {
  title: "시리즈 · chorock.page",
  description: "여러 편으로 나눠 쓴 연재 글 모음",
  alternates: { canonical: "/series" },
  openGraph: {
    ...SITE_OG_BASE,
    type: "website",
    url: "/series",
    title: "시리즈 · chorock.page",
    description: "여러 편으로 나눠 쓴 연재 글 모음",
    images: SITE_OG_IMAGE,
  },
};

// Same bug/fix as /about (CHANGELOG 0.7.33): no dynamic data source here, so without this
// Next.js treats the page as fully static — rendered once at build time and never refreshed,
// so newly-created series or updated post counts silently never showed up.
export const revalidate = 300;

export default async function SeriesListPage() {
  const series = await listSeriesWithCounts();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 var(--space-2)" }}>시리즈</h1>
      <p style={{ fontSize: 14, opacity: 0.65, margin: "0 0 var(--space-6)" }}>
        여러 편으로 나눠 쓴 연재 글 모음입니다.
      </p>

      {/* stagger-list는 /projects가 쓰는 등장 애니메이션 그대로다. 거기서 문제가 됐던
          View Transitions와의 충돌은 /series에는 해당하지 않는다(이 경로는 모프를 쓰지 않는다).
          그리드도 /projects 목록과 같은 관례다 — auto-fill + minmax라 좁아지면 알아서 1단이
          되므로 새 미디어 쿼리가 필요 없다. 폭은 /about과 같은 760이다(안쪽 여백 30씩을 빼면
          700이라 320짜리 두 칸 + gap 30 = 670이 들어간다). */}
      <div
        className="stagger-list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {series.map((s) => (
          <SeriesCard key={s.slug} series={s} />
        ))}
      </div>
    </main>
  );
}
