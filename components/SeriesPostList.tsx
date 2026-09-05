"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { SeriesPost } from "@/lib/series";
import { reorderSeriesPosts } from "@/app/series/[slug]/actions";

/**
 * 시리즈 상세의 글 목록. 보기/순서 편집 두 상태를 한 컴포넌트가 담당한다 — 서버와 클라이언트에
 * 같은 목록 마크업을 두 벌 두면 반드시 어긋난다.
 *
 * 소유자 판별을 `useSession()`(클라이언트)으로 하는 이유: 페이지에서 `auth()`를 부르면 쿠키를
 * 읽어 `/series/[slug]` 라우트가 통째로 동적이 된다. PostOwnerActions·FooterAuthLink가 같은
 * 이유로 이미 이 패턴을 쓴다. 클라이언트 컴포넌트도 서버에서 HTML로 렌더되므로 SEO에는 영향이 없다.
 */
export default function SeriesPostList({
  seriesSlug,
  posts,
}: {
  seriesSlug: string;
  posts: SeriesPost[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SeriesPost[]>(posts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    setDraft((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const start = () => {
    setDraft(posts);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await reorderSeriesPosts(
        seriesSlug,
        draft.map((p) => p.slug)
      );
      // Server Action은 의도된 실패를 던지지 않고 돌려준다 — 먼저 이걸 확인해야 한다.
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("저장에 실패했습니다.");
      setSaving(false);
    }
  };

  const rows = editing ? draft : posts;

  return (
    <>
      {session && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-3)",
          }}
        >
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                aria-busy={saving}
                onClick={save}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
              >
                {saving ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> 저장 중…
                  </>
                ) : (
                  "순서 저장"
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setEditing(false)}
                style={{ fontSize: 13 }}
              >
                취소
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={start} style={{ fontSize: 13 }}>
              순서 바꾸기
            </button>
          )}
          {error && (
            <span style={{ fontSize: 12, color: "var(--color-danger, #e5484d)" }}>{error}</span>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {rows.map((post, i) => {
          const body = (
            <>
              <span
                style={{
                  flex: "none",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--color-accent-100)",
                  color: "var(--color-accent-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {editing ? i + 1 : post.part.split("/")[0]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, margin: "0 0 3px" }}>{post.title}</h3>
                <p style={{ fontSize: 12, margin: 0, opacity: 0.55 }}>
                  {post.dateLabel} · {post.readTime}분 읽기
                </p>
              </div>
            </>
          );

          const rowStyle = {
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) 0",
            borderBottom: "1px solid var(--color-divider)",
            textDecoration: "none",
            color: "inherit",
          } as const;

          // 편집 중에는 링크가 아니라 행으로 둔다 — 순서를 옮기려다 글로 이동해버리면 안 된다.
          return editing ? (
            <div key={post.slug} style={rowStyle}>
              {body}
              <div style={{ flex: "none", display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-icon btn-secondary"
                  aria-label="위로"
                  disabled={i === 0 || saving}
                  onClick={() => move(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-secondary"
                  aria-label="아래로"
                  disabled={i === rows.length - 1 || saving}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ) : (
            <Link key={post.slug} href={`/posts/${post.slug}`} style={rowStyle}>
              {body}
            </Link>
          );
        })}
      </div>
    </>
  );
}
