import Link from "next/link";
import type { Metadata } from "next";
import { listSeriesWithCounts } from "@/lib/series";

export const metadata: Metadata = {
  title: "시리즈 · chorock.page",
};

export default async function SeriesListPage() {
  const series = await listSeriesWithCounts();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 var(--space-2)" }}>시리즈</h1>
      <p style={{ fontSize: 14, opacity: 0.65, margin: "0 0 var(--space-6)" }}>
        여러 편으로 나눠 쓴 연재 글 모음입니다.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {series.map((s) => (
          <Link
            key={s.slug}
            href={`/series/${s.slug}`}
            className="card elev-sm"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <p className="card-kicker">{s.count}편의 연재</p>
            <h3 className="card-title">{s.title}</h3>
            <p className="card-body">{s.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
