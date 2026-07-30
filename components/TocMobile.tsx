import type { Heading } from "@/lib/markdown";

export default function TocMobile({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <details
      className="toc-mobile"
      style={{
        marginBottom: "var(--space-6)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-2) var(--space-3)",
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>목차</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "var(--space-2)" }}>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            style={{
              fontSize: 13,
              color: "var(--color-text)",
              opacity: 0.75,
              textDecoration: "none",
              paddingLeft: h.depth === 3 ? 12 : 0,
            }}
          >
            {h.text}
          </a>
        ))}
      </div>
    </details>
  );
}
