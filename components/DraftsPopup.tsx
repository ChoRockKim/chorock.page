"use client";

import { useCallback, useEffect, useState } from "react";
import { listDrafts, type DraftSummary } from "@/app/posts/write/actions";

function formatUpdatedAt(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/**
 * There's no standalone "my drafts" page — resuming a draft only ever worked if you still had
 * its /posts/write?slug= URL. This is a modal (same .dialog-backdrop/.dialog/modalPop/backdropIn
 * conventions as Header.tsx's search modal) that lists them instead. Picking one does a real
 * `<a href>` navigation rather than a client-side route change: /posts/write isn't a [slug]
 * dynamic segment (the slug lives in a searchParam), so a searchParams-only client nav would
 * likely just re-render WritePostForm with a new `initial` prop in place — but its title/body
 * state is seeded from `initial` via useState's initializer, which only runs on first mount, so
 * the form would keep showing whatever was being edited before instead of the picked draft. A
 * full navigation forces WritePostForm to remount from scratch, avoiding that entirely.
 */
export default function DraftsPopup({ currentSlug }: { currentSlug: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const handleOpen = () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    listDrafts()
      .then(setDrafts)
      .catch((err) => setError(err instanceof Error ? err.message : "임시글 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  const visibleDrafts = drafts?.filter((d) => d.slug !== currentSlug) ?? null;

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleOpen}>
        임시글 목록
      </button>

      {open && (
        <div
          className="dialog-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "12vh var(--space-4) var(--space-4)",
          }}
          onClick={close}
        >
          <div
            className="dialog elev-lg"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: "var(--space-4)",
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="dialog-title" style={{ fontSize: 18, margin: 0 }}>
                임시글 목록
              </p>
              <button className="btn btn-icon btn-secondary" aria-label="닫기" onClick={close}>
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <path
                    d="M64 64l128 128M192 64L64 192"
                    stroke="currentColor"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {loading ? (
              <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>불러오는 중…</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: "var(--color-danger, #e5484d)", margin: 0 }}>{error}</p>
            ) : visibleDrafts && visibleDrafts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                {visibleDrafts.map((d) => (
                  <a
                    key={d.slug}
                    href={`/posts/write?slug=${encodeURIComponent(d.slug)}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <h4 style={{ fontSize: 14, margin: 0 }}>{d.title}</h4>
                    {d.summary && (
                      <p
                        style={{
                          fontSize: 12,
                          margin: 0,
                          opacity: 0.6,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.summary}
                      </p>
                    )}
                    <p style={{ fontSize: 11, margin: 0, opacity: 0.45 }}>{formatUpdatedAt(d.updatedAt)} 수정</p>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>임시 저장된 글이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
