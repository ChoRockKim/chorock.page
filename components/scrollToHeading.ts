/**
 * 목차 링크의 스크롤. **네이티브 `<a href="#id">` 내비게이션에 맡기지 않는다.**
 *
 * 원래는 그냥 앵커였고 `html { scroll-behavior: smooth }`가 부드럽게 굴려 줬다. 그런데 사용자
 * Chrome(153, Mac)에서 **이미 제자리인 해시로 다시 내비게이션하면 4,016~4,017ms 동안 프레임이 한
 * 장도 안 그려진다** — 롱태스크 0, 클릭 이벤트는 접수되는데 화면만 멈추고, `scrollend`가 뜨면서
 * 풀린다. "읽고 있는 섹션의 목차 항목을 클릭하면 페이지가 잠깐 멈춘다"는 제보가 정확히 이것이었고,
 * 사용자 Chrome에서 실제 마우스 클릭으로 3회 재현했다(합성 `.click()`과 깨끗한 Playwright
 * Chromium에서는 재현되지 않는다 — 안정판 프로필에서만 나는 Chrome 동작이라 그쪽에서 검증해야 한다).
 * 같은 페이지에서 A/B: 앵커 기본 동작을 막고 `scrollIntoView`로 굴리면 멈춤 0, 도착 위치는 동일.
 *
 * - `scroll-margin-top`(globals.css의 `.pd-body h2/h3`)은 `scrollIntoView`도 존중한다.
 * - 해시는 `replaceState`로만 반영한다. 네이티브 앵커는 클릭마다 히스토리를 쌓아 뒤로가기가 헤딩
 *   사이를 되감았고, 같은 해시로의 `popstate`가 위 버그의 진입점이기도 하다. Next가 패치한
 *   `history`를 그대로 통과한다(PostsListClient#syncUrl과 같은 경로).
 * - JS 스크롤이라 감축 모션은 CSS 미디어쿼리가 아니라 `matchMedia`로 읽는다(Header의 테마 토글과
 *   같은 이유).
 *
 * 반환값: 실제로 스크롤이 시작됐으면 true. 이미 제자리라 스크롤이 일어나지 않으면 `scrollend`가
 * 오지 않으므로, 호출부(TableOfContents)는 이 값으로 스크롤 락을 걸지 말지 정한다.
 */
export function scrollToHeading(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  // 도착 위치 = 헤딩 상단 − scroll-margin-top. 1px 미만이면 브라우저가 스크롤을 시작하지 않는다.
  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const targetY = el.getBoundingClientRect().top + window.scrollY - marginTop;
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const willMove = Math.abs(Math.min(targetY, maxY) - window.scrollY) >= 1;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return willMove;
}

/** 수정키·중클릭은 브라우저에 맡긴다(새 탭 열기). PostsListClient의 페이지 링크와 같은 규칙. */
export function isPlainLeftClick(e: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
