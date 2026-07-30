"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PostSummary } from "@/lib/posts";
import PostCard from "@/components/PostCard";

const PAGE_SIZE = 5;

/**
 * Reflects filter/page into the URL via the raw History API — deliberately NOT
 * next/navigation's router, which would re-fetch this (dynamic) route's Server
 * Component on every click and reintroduce the click-latency this page was
 * rewritten to avoid. `replaceState` (not push) so clicking chips/pages doesn't
 * pile up back-button stops of its own.
 */
function syncUrl(tag: string | null, page: number) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `/posts?${qs}` : "/posts");
}

export default function PostsListClient() {
  const { data: posts = [] } = useQuery({
    queryKey: ["posts"],
    queryFn: () =>
      fetch("/api/posts")
        .then((r) => r.json())
        .then((d) => d.posts as PostSummary[]),
  });

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Restores state on (re)mount from whatever is actually in the address bar —
  // this is what makes the browser back button work: leaving to /posts/[slug]
  // and coming back remounts this component fresh, but the history entry the
  // browser returns to still has the ?tag=/?page= that syncUrl() last wrote,
  // so reading it here (instead of only trusting the initial* props, which are
  // only reliable on the very first server render) restores the right view.
  // Runs client-only, after hydration, so it can't cause a hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTag = params.get("tag");
    const urlPage = Number(params.get("page"));
    setActiveTag(urlTag || null);
    setPage(Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1);
  }, []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    // Plain code-unit comparison, not localeCompare() — locale-aware collation of mixed
    // Korean/Latin strings can order differently between Node's ICU (SSR) and the
    // browser's, which made this list hydrate in a different order than the server
    // rendered it and broke hydration.
    return [...counts.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const filteredPosts = useMemo(
    () => (activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts),
    [posts, activeTag]
  );

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filteredPosts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const setFilter = (tag: string | null) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    setPage(1);
    syncUrl(next, 1);
  };

  const goToPage = (n: number) => {
    setPage(n);
    syncUrl(activeTag, n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <button
          className={`tag chip-btn ${!activeTag ? "tag-accent" : "tag-outline"}`}
          style={{
            border: !activeTag ? "none" : "1px solid var(--color-accent)",
            background: !activeTag ? "var(--color-accent-100)" : "none",
            cursor: "pointer",
            font: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
          onClick={() => setFilter(null)}
        >
          전체 <span style={{ opacity: 0.65, fontSize: 10 }}>{posts.length}</span>
        </button>
        {tags.map((t) => (
          <button
            key={t.name}
            className={`tag chip-btn ${activeTag === t.name ? "tag-accent" : "tag-outline"}`}
            style={{
              border: activeTag === t.name ? "none" : "1px solid var(--color-accent)",
              background: activeTag === t.name ? "var(--color-accent-100)" : "none",
              cursor: "pointer",
              font: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onClick={() => setFilter(t.name)}
          >
            {t.name} <span style={{ opacity: 0.65, fontSize: 10 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <p
        style={{
          fontSize: 12,
          opacity: 0.55,
          margin: "0 0 var(--space-2)",
          paddingTop: "var(--space-2)",
          borderTop: "1px solid var(--color-divider)",
        }}
      >
        총 {filteredPosts.length}개의 글
      </p>

      <div className="stagger-list" style={{ display: "flex", flexDirection: "column" }}>
        {pageItems.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            marginTop: "var(--space-6)",
          }}
        >
          <button
            className="btn btn-icon btn-secondary"
            aria-label="이전 페이지"
            disabled={current === 1}
            onClick={() => current > 1 && goToPage(current - 1)}
          >
            <svg width="14" height="14" viewBox="0 0 256 256" fill="none">
              <path
                d="M160 48 88 128l72 80"
                stroke="currentColor"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`tag page-num-btn ${n === current ? "tag-accent" : "tag-outline"}`}
              style={{
                border: n === current ? "none" : "1px solid var(--color-accent)",
                background: n === current ? "var(--color-accent-100)" : "none",
                cursor: "pointer",
                font: "inherit",
                width: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => goToPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="btn btn-icon btn-secondary"
            aria-label="다음 페이지"
            disabled={current === totalPages}
            onClick={() => current < totalPages && goToPage(current + 1)}
          >
            <svg width="14" height="14" viewBox="0 0 256 256" fill="none">
              <path
                d="M96 48 168 128l-72 80"
                stroke="currentColor"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </nav>
      )}
    </>
  );
}
