import Link from "next/link";
import type { PostSummary } from "@/lib/posts";

function formatDate(iso: string) {
  return iso.slice(0, 10).split("-").join(".");
}

export default function PostCard({
  post,
  compact = false,
}: {
  post: PostSummary;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: `${compact ? "var(--space-2)" : "var(--space-4)"} 0`,
        borderBottom: "1px solid var(--color-divider)",
        textDecoration: "none",
        color: "inherit",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {post.seriesTitle && <span className="tag tag-neutral">{post.seriesTitle}</span>}
        {post.tags.map((tag) => (
          <span key={tag} className="tag tag-accent">
            {tag}
          </span>
        ))}
      </div>
      <h3
        style={{
          fontSize: compact ? 15 : 20,
          margin: 0,
          color: "var(--color-text)",
          lineHeight: 1.25,
        }}
      >
        {post.title}
      </h3>
      {!compact && (
        <p style={{ fontSize: 13.5, margin: 0, opacity: 0.72, maxWidth: "64ch" }}>{post.summary}</p>
      )}
      <div className="card-meta" style={{ fontSize: 11.5 }}>
        <span>{formatDate(post.publishedAt)}</span>
        <span>·</span>
        <span>{post.readTime}분 읽기</span>
      </div>
    </Link>
  );
}
