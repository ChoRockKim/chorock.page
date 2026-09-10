"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/markdown";

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const rootRef = useRef<HTMLElement>(null);
  /**
   * True while a click-initiated scroll is still travelling; the observer below ignores entries
   * until it clears.
   *
   * Clicking a link used to move the page but NOT the active marker: an anchor jump lands the
   * heading at `scroll-margin-top: 90px` (globals.css's `.pd-body h2`), while the observer's
   * active band is the viewport's 30%–40% strip — measured at 262–349px on an 872px viewport, so
   * the heading you just clicked lands ~170px ABOVE the band and is never reported as active.
   * The marker stayed on whatever was active before (usually still the first entry).
   *
   * The lock can't be a fixed timeout, because `html { scroll-behavior: smooth }` (globals.css)
   * means the trip takes as long as the distance demands — every heading passing through the
   * band on the way would otherwise drag the marker along and leave it on whatever ended up
   * there. `scrollend` is the exact signal; the timer is the fallback for browsers without it
   * and for a click that doesn't actually scroll (already at the target), where `scrollend`
   * never fires.
   */
  const scrollLocked = useRef(false);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLocked.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    // headings mount after the MDX body paints, so give it a tick before observing
    const timer = setTimeout(() => {
      headings.forEach((h) => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [headings]);

  const lockUntilScrollEnds = () => {
    scrollLocked.current = true;
    const release = () => {
      scrollLocked.current = false;
    };
    // Registering `scrollend` unconditionally is harmless where it isn't supported — the
    // listener simply never fires and the timer does the work. Branching on
    // `"onscrollend" in window` instead makes TypeScript narrow `window` to `never` in the else.
    window.addEventListener("scrollend", release, { once: true });
    window.setTimeout(release, 1200);
  };

  useEffect(() => {
    const measure = () => {
      const el = activeId ? linkRefs.current[activeId] : null;
      if (el) setIndicator({ top: el.offsetTop, height: el.offsetHeight });
    };
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  /**
   * 활성 항목이 목차 상자 밖으로 밀려나면 목차만 살짝 굴려 다시 보이게 한다. 목차가 길어
   * 스크롤이 생긴 글에서는(globals.css의 `.pd-grid .toc-desktop` max-height) 읽고 있는
   * 위치가 상자 아래로 넘어가 버려, 정작 "내가 어디쯤인지"를 알려주는 표시를 못 보게 된다.
   *
   * **`scrollIntoView`를 쓰면 안 된다.** 그건 스크롤 가능한 **모든 조상**을 움직이므로
   * 문서까지 같이 스크롤돼, 읽는 중인 페이지가 제멋대로 튄다. 컨테이너의 `scrollBy`만
   * 부르면 그 상자 하나만 움직인다.
   */
  const hasFollowed = useRef(false);
  useEffect(() => {
    const link = activeId ? linkRefs.current[activeId] : null;
    const root = rootRef.current;
    if (!link || !root) return;
    // 스크롤 컨테이너가 화면마다 다르다. /posts/[slug]에서는 이 <aside> 자신이고
    // (`.pd-grid .toc-desktop`), /projects/[slug]에서는 조상인 `.proj-toc`다. 자신부터
    // 위로 올라가며 실제로 넘치는 첫 요소를 찾되, <body>에 닿기 전에 멈춘다 — 문서 자체를
    // 컨테이너로 잡으면 위에 적은 "페이지가 튀는" 바로 그 동작이 된다.
    let box: HTMLElement | null = root;
    while (box && box !== document.body) {
      const overflowY = getComputedStyle(box).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && box.scrollHeight > box.clientHeight) break;
      box = box.parentElement;
    }
    if (!box || box === document.body) return; // 다 들어가면 따라갈 것도 없다

    const boxRect = box.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    // 가장자리에 딱 붙이지 않고 한 항목쯤 여유를 남긴다 — 위아래로 더 있다는 게 보인다.
    // 다만 상자가 작으면(프로젝트 사이드바는 낮은 화면에서 90px까지 줄어든다) 위아래 여유를
    // 합친 것이 항목 하나 들어갈 자리보다 커져, 위로 밀어도 아래로 밀어도 조건이 계속 참인
    // 상태가 된다 — 실제로 그 화면에서 항목이 끝내 다 안 보이는 걸 확인했다. 남는 공간의
    // 절반을 넘지 않게 묶으면 어느 상자에서든 항목 전체가 안으로 들어온다.
    const margin = Math.min(28, Math.max(0, (box.clientHeight - link.offsetHeight) / 2));
    let delta = 0;
    if (linkRect.top < boxRect.top + margin) delta = linkRect.top - boxRect.top - margin;
    else if (linkRect.bottom > boxRect.bottom - margin) delta = linkRect.bottom - boxRect.bottom + margin;
    if (Math.abs(delta) < 1) return;

    // CSS 애니메이션이 아니라 JS 스크롤이라 감축 모션 선호는 미디어 쿼리가 아니라
    // matchMedia로 읽어야 한다(Header의 테마 토글과 같은 이유). 첫 적용은 즉시 맞춘다 —
    // 글 중간에서 새로고침한 경우 맨 위에서부터 굴러 내려오는 게 오히려 산만하다.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollBy({
      top: delta,
      behavior: hasFollowed.current && !reduceMotion ? "smooth" : "auto",
    });
    hasFollowed.current = true;
  }, [activeId]);

  if (headings.length === 0) return null;

  return (
    // 고정 오프셋은 헤더가 실측해 :root에 심는 --header-h를 따른다(하드코딩 80px이었다).
    // /posts/[slug]에서 이 목차는 오른쪽 열에 있고 접힌 헤더 캡슐도 오른쪽 정렬이라, 둘이
    // 가로로 겹친 채 세로로 3px밖에 안 떨어져 있었다(캡슐 아래 77px, 목차 위 80px — 실측).
    // --space-8을 더해 30px을 띄운다. /projects/[slug]에서는 .proj-sidebar가 이 값을
    // position: static !important로 덮으므로(globals.css) 그쪽에는 영향이 없다.
    <aside
      ref={rootRef}
      className="toc-desktop"
      style={{
        position: "sticky",
        top: "calc(var(--header-h, 67px) + var(--space-8))",
        alignSelf: "start",
        fontSize: 13,
      }}
    >
      <p
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
          opacity: 0.5,
          margin: "0 0 var(--space-2)",
        }}
      >
        목차
      </p>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingLeft: "var(--space-3)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: "var(--color-divider)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 2,
            background: "var(--color-accent)",
            top: indicator.top,
            height: indicator.height,
            transition: "top .25s ease,height .25s ease",
          }}
        />
        {headings.map((h) => {
          const active = h.id === activeId;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              ref={(el) => {
                linkRefs.current[h.id] = el;
              }}
              // Marks the clicked entry active immediately — the anchor navigation alone never
              // would (see scrollLocked above). Not preventDefault'd: the native anchor gives
              // both the smooth scroll (from html's scroll-behavior) and the #hash in the URL.
              onClick={() => {
                setActiveId(h.id);
                lockUntilScrollEnds();
              }}
              style={{
                textDecoration: "none",
                color: active ? "var(--color-accent)" : "var(--color-text)",
                fontWeight: active ? 600 : 400,
                opacity: active ? 1 : 0.65,
                transition: "color .2s ease,opacity .2s ease",
                paddingLeft: h.depth === 3 ? 12 : 0,
              }}
            >
              {h.text}
            </a>
          );
        })}
      </div>
    </aside>
  );
}
