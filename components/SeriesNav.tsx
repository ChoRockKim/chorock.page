import Link from "next/link";
import type { SeriesNav as SeriesNavType } from "@/lib/posts";

export default function SeriesNav({ nav }: { nav: SeriesNavType }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-3)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-4)",
        fontSize: 12.5,
      }}
    >
      <Link
        href={`/series/${nav.slug}`}
        style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}
      >
        {nav.title} · {nav.part}
      </Link>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {nav.prevSlug && (
          <Link
            href={`/posts/${nav.prevSlug}`}
            style={{ color: "var(--color-text)", textDecoration: "none", opacity: 0.75 }}
          >
            ← 이전 글
          </Link>
        )}
        {nav.nextSlug && (
          <Link
            href={`/posts/${nav.nextSlug}`}
            style={{ color: "var(--color-text)", textDecoration: "none", opacity: 0.75 }}
          >
            다음 글 →
          </Link>
        )}
      </div>
    </div>
  );
}
