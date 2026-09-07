"use client";

import { useEffect, useState } from "react";

const SEEN_PREFIX = "chorock-viewed:";
const DEDUP_MS = 24 * 60 * 60 * 1000;

/**
 * 글 상세의 조회수. **클라이언트에서 세고 클라이언트에서 그린다.**
 *
 * /posts/[slug]는 ISR(revalidate = 300)이라 서버에서 렌더하면 최대 5분 묵은 숫자가 정적 HTML에
 * 박힌다 — /about의 방문자 카운터가 클라이언트 컴포넌트인 것과 같은 이유다.
 *
 * 같은 브라우저가 24시간 안에 같은 글을 다시 열면 올리지 않고 읽기만 한다(GET). 서버 쿠키 대신
 * localStorage를 쓰는 이유는 app/api/post-views/route.ts의 주석 참고.
 *
 * 처음부터 0을 그린다. 불러오는 동안 아무것도 안 그리면 숫자가 뒤늦게 튀어나와 레이아웃이
 * 흔들리고, /about 카운터에서 "있는 줄도 몰랐다"는 피드백을 받은 적이 있다.
 */
export default function PostViewCounter({ slug }: { slug: string }) {
  const [views, setViews] = useState(0);

  useEffect(() => {
    const key = SEEN_PREFIX + slug;
    let recent = false;
    try {
      const last = Number(window.localStorage.getItem(key) ?? 0);
      recent = Number.isFinite(last) && Date.now() - last < DEDUP_MS;
    } catch {
      // 사파리 프라이빗 모드 등 localStorage가 막힌 환경. 중복 방지를 포기하고 집계는 계속한다.
    }

    const url = `/api/post-views?slug=${encodeURIComponent(slug)}`;
    fetch(url, { method: recent ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data?.views === "number") setViews(data.views);
        if (!recent) {
          try {
            window.localStorage.setItem(key, String(Date.now()));
          } catch {
            /* 위와 같음 */
          }
        }
      })
      .catch(() => {
        // 조회수는 장식성 지표다 — 실패해도 글 읽기를 방해하지 않는다.
      });
  }, [slug]);

  return <span>조회 {views.toLocaleString("ko-KR")}</span>;
}
