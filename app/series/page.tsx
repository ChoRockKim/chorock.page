import Link from "next/link";
import type { Metadata } from "next";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import { listSeriesWithCounts } from "@/lib/series";

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
          View Transitions와의 충돌은 /series에는 해당하지 않는다(이 경로는 모프를 쓰지 않는다). */}
      <div
        className="stagger-list"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      >
        {series.map((s) => (
          <Link key={s.slug} href={`/series/${s.slug}`} className="series-card elev-sm">
            <div className="series-card-head">
              <h3 className="series-card-title">{s.title}</h3>
              <span className="series-card-count">{s.count}편</span>
            </div>
            {/* 실제 데이터의 description은 전부 비어 있다. 빈 <p>를 그리면 공백만 생기므로
                내용이 있을 때만 렌더한다(나중에 설명을 채우면 자동으로 살아난다). */}
            {s.description?.trim() && <p className="card-body">{s.description}</p>}

            {/* 1편짜리 시리즈는 목차가 한 줄이라 오히려 허전해서 생략한다. */}
            {s.count > 1 && s.previewTitles.length > 0 && (
              <ol className="series-card-toc">
                {s.previewTitles.map((title, i) => (
                  <li key={title}>
                    <span className="series-card-num">{i + 1}</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </span>
                  </li>
                ))}
                {s.count > s.previewTitles.length && (
                  <li className="series-card-more">
                    … 외 {s.count - s.previewTitles.length}편
                  </li>
                )}
              </ol>
            )}

            {s.lastUpdated && (
              <p className="card-meta" style={{ margin: 0 }}>
                {s.lastUpdated} 마지막 업데이트
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
