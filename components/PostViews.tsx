"use client";

import { useEffect, useState } from "react";

/**
 * 목록 카드의 조회수. 카드마다 요청을 보내지 않고, **같은 틱에 마운트된 카드들의 slug를 모아
 * 한 요청으로** 묻는다(`GET /api/post-views?slugs=...`). 카드가 5개든 3개든 요청은 한 번이다.
 *
 * 조회수를 목록 데이터에 실어 보내지 않는 이유: /posts 목록은 getCachedPosts(unstable_cache,
 * 300초)를 거치는데 조회수는 계속 변하므로 항상 묵은 숫자가 된다. 캐시는 그대로 두고 숫자만
 * 클라이언트에서 따로 가져온다 — 상세 페이지의 PostViewCounter와 같은 이유다.
 *
 * **여기서는 절대 올리지 않는다.** 집계는 상세 페이지에서만 일어난다(목록에 뜬 것만으로
 * 조회수가 오르면 숫자가 의미를 잃는다).
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
  fetch(`/api/post-views?slugs=${slugs.map(encodeURIComponent).join(",")}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const map = data?.views;
      settle((s) => (typeof map?.[s] === "number" ? map[s] : 0));
    })
    // 장식성 지표라 실패해도 목록 읽기를 방해하지 않는다. 대기 중인 구독자를 그냥 두면
    // 영원히 안 풀리므로 0으로 정리한다.
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
    // 이 틱에 마운트되는 카드들을 다 모은 뒤 한 번에 보낸다.
    setTimeout(flush, 0);
  }
  pending.add(slug);
  return () => waiting.get(slug)?.delete(cb);
}

export default function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => subscribe(slug, setViews), [slug]);

  // 불러오기 전에는 아무것도 그리지 않는다. 상세 페이지와 달리 여기엔 카드가 여러 장이라,
  // 전부 "조회 0"을 띄웠다가 한꺼번에 바뀌면 그 자체가 깜빡임으로 읽힌다.
  if (views === null) return null;
  return (
    <>
      <span>·</span>
      <span>조회 {views.toLocaleString("ko-KR")}</span>
    </>
  );
}
