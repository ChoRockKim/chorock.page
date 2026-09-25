"use client";

import { useEffect, useState } from "react";

/**
 * 목록 카드의 giscus 댓글 수. 배치 방식은 components/PostViews.tsx와 같다 — 같은 틱에 마운트된
 * 카드들의 slug를 모아 `GET /api/comment-counts?slugs=...` 한 번으로 묻고, 모듈 캐시로 나눠 준다.
 * (같은 배처를 두 번 쓰는 셈이지만, 응답 키와 실패 시 처리가 달라 억지로 합치지 않았다.)
 *
 * 조회수와 달리 **0개면 아무것도 그리지 않는다**(구분점 `·`까지). 개인 블로그는 대부분의 글이
 * 0개라 "댓글 0"이 줄줄이 붙으면 노이즈고, 토큰 미설정·GitHub 실패로 전부 0이 와도 화면이
 * 조용히 원래대로다. 같은 이유로 카운트업 애니메이션도 쓰지 않는다 — 0에서 시작하면 첫 프레임에
 * 숨겨졌다가 튀어나오는 꼴이 된다. 나타날 때 짧은 페이드만 준다(.card-meta-fade).
 */
const cache = new Map<string, number>();
const waiting = new Map<string, Set<(n: number) => void>>();
let pending: Set<string> | null = null;

function flush() {
  const slugs = [...(pending ?? [])];
  pending = null;
  if (slugs.length === 0) return;
  const settle = (get: (slug: string) => number) => {
    for (const s of slugs) {
      const n = get(s);
      cache.set(s, n);
      waiting.get(s)?.forEach((cb) => cb(n));
      waiting.delete(s);
    }
  };
  fetch(`/api/comment-counts?slugs=${slugs.map(encodeURIComponent).join(",")}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const map = data?.counts;
      settle((s) => (typeof map?.[s] === "number" ? map[s] : 0));
    })
    .catch(() => settle(() => 0));
}

function subscribe(slug: string, cb: (n: number) => void): () => void {
  const hit = cache.get(slug);
  if (hit !== undefined) {
    cb(hit);
    return () => {};
  }
  if (!waiting.has(slug)) waiting.set(slug, new Set());
  waiting.get(slug)!.add(cb);
  if (!pending) {
    pending = new Set();
    setTimeout(flush, 0);
  }
  pending.add(slug);
  return () => waiting.get(slug)?.delete(cb);
}

export default function PostCommentCount({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => subscribe(slug, setCount), [slug]);

  if (!count) return null;

  return (
    <>
      <span className="card-meta-fade">·</span>
      <span
        className="tnum card-meta-fade"
        aria-label={`댓글 ${count}개`}
        style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        {/* Phosphor ChatCircle — 다른 인라인 아이콘(ShareButton 등)과 같은 256 뷰박스·currentColor 선 */}
        <svg width="12" height="12" viewBox="0 0 256 256" fill="none" aria-hidden="true">
          <path
            d="M79.93 211.11a96 96 0 1 0-35-35h0L32.42 213.5a8 8 0 0 0 10.08 10.08l37.43-12.47Z"
            stroke="currentColor"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count.toLocaleString("ko-KR")}
      </span>
    </>
  );
}
