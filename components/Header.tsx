"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PostSummary } from "@/lib/posts";
import LiquidGlassFilter from "@/components/LiquidGlassFilter";

type NavKey = "about" | "posts" | "series" | "projects";

/** 메뉴가 사라지는 애니메이션 길이(ms). globals.css의 navPanelOut과 함께 바꿔야 한다. */
const MENU_EXIT_MS = 320;

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "about", label: "소개", href: "/about" },
  { key: "posts", label: "글", href: "/posts" },
  { key: "series", label: "시리즈", href: "/series" },
  { key: "projects", label: "프로젝트", href: "/projects" },
];

export default function Header() {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key;
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [scrolled, setScrolled] = useState(false);
  const [spacerH, setSpacerH] = useState(66);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 굴절은 수축이 "끝난 뒤"에만 켠다 — 크기가 바뀔 때마다 변위 맵을 다시 만들어야 해서
  // 애니메이션 중에 켜 두면 비싸다.
  const [settled, setSettled] = useState(false);
  // 그리고 크로뮴에서만 켠다. backdrop-filter에 물린 SVG 필터는 사파리·파이어폭스에서
  // 동작하지 않는데, 이 환경에는 크롬밖에 없어 그쪽 강등 동작을 직접 확인할 수 없다.
  // Houdini Paint API는 현재 크로뮴 전용이라 확실한 판별자로 쓴다.
  const [hasLens, setHasLens] = useState(false);
  // 모인 상태의 폭(px). CSS만으로는 전 구간에 걸쳐 폭을 움직일 수 없어 직접 잰다
  // (globals.css의 .site-bar 주석 참고).
  const [barW, setBarW] = useState<number | null>(null);
  // 변위 맵은 캡슐 크기에 맞춰 만들어야 해서 높이도 함께 잰다.
  const [barH, setBarH] = useState(0);
  // 모바일 메뉴도 같은 유리로 보이려면 자기 크기에 맞는 변위 맵이 따로 필요하다.
  const panelRef = useRef<HTMLElement>(null);
  const [panelSize, setPanelSize] = useState<{ w: number; h: number } | null>(null);
  // 사라지는 애니메이션을 보여주려면 열림 상태가 false가 된 뒤에도 잠깐 더 붙어 있어야 한다.
  // (ScrollToTopButton이 쓰는 것과 같은 "퇴장까지 마운트 유지" 패턴)
  const [menuMounted, setMenuMounted] = useState(false);
  // 물방울 키프레임은 첫 상태 전환 이후에만 건다. 그러지 않으면 페이지가 로드되는 순간
  // "펼침" 쪽 애니메이션이 한 번 재생돼, 아무것도 안 했는데 헤더가 출렁인다.
  const [hasMotion, setHasMotion] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 기본값은 다크. layout.tsx의 하이드레이션 전 스크립트와 반드시 같은 값이어야 한다.
    const saved = (localStorage.getItem("chorock-theme") as "light" | "dark" | null) || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setSpacerH(el.offsetHeight);
    const ro = new ResizeObserver(() => setSpacerH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // 단일 임계값이면 모양이 바뀌는 전환이 경계에서 떨린다 — 스크롤을 조금만 움직여도
    // 캡슐이 왕복한다. 펼침→축소 48px, 축소→펼침 12px로 이력을 둔다.
    const onScroll = () => {
      setScrolled((prev) => (prev ? window.scrollY > 12 : window.scrollY > 48));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setHasLens(typeof CSS !== "undefined" && CSS.supports("background", "paint(x)"));
  }, []);

  // 모인 폭 = 자식들의 실제 폭 합 + 간격 + 축소 상태의 가로 패딩. 요소의 min-width를 잠시
  // 풀었다 되돌리는 식으로 재면 전이가 걸려 있어 값이 튀므로, 자식들을 직접 더한다.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const px = (name: string) => parseFloat(rootStyle.getPropertyValue(name)) || 0;
      const gap = px("--space-4");
      // 축소 시 padding-inline은 --space-4 (모바일 포함, globals.css와 같은 값)
      const padX = px("--space-4");
      const kids = Array.from(bar.children).filter(
        (el) => getComputedStyle(el).display !== "none"
      );
      if (kids.length === 0) return;
      const sum = kids.reduce((acc, el) => acc + el.getBoundingClientRect().width, 0);
      const w = Math.ceil(sum + gap * (kids.length - 1) + padX * 2);
      setBarW((prev) => (prev === w ? prev : w));
      const bh = Math.round(bar.getBoundingClientRect().height);
      setBarH((prev) => (prev === bh ? prev : bh));
    };
    measure();
    // 폰트가 늦게 오면 글자 폭이 달라진다(Pretendard는 비동기 로드).
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!scrolled) {
      setSettled(false);
      return;
    }
    const bar = barRef.current;
    // 폭 전환(min-width)이 끝나면 정착으로 본다. transitionend를 놓치는 경우(탭 비활성 등)를
    // 대비해 전환 길이보다 넉넉한 타이머를 함께 둔다.
    const done = () => setSettled(true);
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "min-width") done();
    };
    bar?.addEventListener("transitionend", onEnd);
    const timer = window.setTimeout(done, 600);
    return () => {
      bar?.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timer);
    };
  }, [scrolled]);

  // 마운트 직후 한 번은 건너뛰고, 그 뒤 scrolled가 실제로 바뀌는 시점부터 모션을 허용한다.
  // (상태 업데이터 안에서 다른 setState를 부르면 StrictMode에서 두 번 실행될 수 있어 피한다.)
  const firstStateSync = useRef(true);
  useEffect(() => {
    if (firstStateSync.current) {
      firstStateSync.current = false;
      return;
    }
    setHasMotion(true);
  }, [scrolled]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMenuMounted(true);
      return;
    }
    // globals.css의 navPanelOut 길이(0.3s)보다 넉넉하게. 이보다 짧으면 사라지는 도중에 잘린다.
    const timer = window.setTimeout(() => setMenuMounted(false), MENU_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!menuMounted) {
      setPanelSize(null);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setPanelSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [menuMounted]);

  // Close the mobile nav whenever the route actually changes (link click already
  // closes it directly, but this also covers back/forward navigation).
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      } else if (e.key === "Escape" && searchOpen) {
        closeSearch();
      } else if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, closeSearch, searchOpen, mobileMenuOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleTheme = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      localStorage.setItem("chorock-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
    };
    // Use the click event's own coordinates rather than the button ref's
    // getBoundingClientRect() — same result in practice, but doesn't depend on
    // the ref having attached correctly, so it can't silently fall back to
    // the viewport-center default if that ref is ever null/stale.
    const rect = themeBtnRef.current?.getBoundingClientRect();
    const x = e.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const y = e.clientY || (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);
    // View Transitions API isn't in every TS DOM lib version yet — read it
    // off `document` as an optional field instead of relying on ambient types.
    // Must stay a method call on `document` (not detached into a bare
    // variable) or the browser throws "Illegal invocation".
    const docWithViewTransition = document as unknown as {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    const canTransition =
      typeof docWithViewTransition.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (canTransition) {
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.style.setProperty("--theme-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-r", `${r}px`);
      document.documentElement.classList.add("theme-transition");
      const t = docWithViewTransition.startViewTransition!(apply);
      t.finished
        .catch(() => {})
        .finally(() => document.documentElement.classList.remove("theme-transition"));
    } else {
      apply();
    }
  };

  const linkStyle = (key: NavKey): CSSProperties => ({
    fontSize: 14,
    textDecoration: "none",
    color: active === key ? "var(--color-accent)" : "var(--color-text)",
    fontWeight: active === key ? 600 : 400,
  });

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header${scrolled ? " is-condensed" : ""}${
          hasLens && settled ? " has-lens" : ""
        }${hasMotion ? " has-motion" : ""}`}
        style={barW ? ({ "--bar-w": `${barW}px` } as CSSProperties) : undefined}
      >
        {hasLens && barW ? <LiquidGlassFilter width={barW} height={barH} /> : null}
        {hasLens && panelSize ? (
          <LiquidGlassFilter
            id="liquid-glass-lens-menu"
            width={panelSize.w}
            height={panelSize.h}
          />
        ) : null}
        <div className="site-bar" ref={barRef}>
        <Link
          href="/about"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)" as CSSProperties["fontWeight"],
            fontSize: 19,
            color: "var(--color-text)",
            textDecoration: "none",
            marginRight: "auto",
            letterSpacing: "-0.01em",
          }}
        >
          chorock.page
        </Link>
        <nav className="nav-desktop" style={{ alignItems: "center", gap: "var(--space-4)" }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} style={linkStyle(item.key)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button
            className="btn btn-icon btn-secondary"
            aria-label="검색"
            title="검색 (Cmd+K)"
            onClick={openSearch}
          >
            <svg width="17" height="17" viewBox="0 0 256 256" fill="none">
              <circle cx="112" cy="112" r="80" stroke="currentColor" strokeWidth="16" />
              <line x1="168" y1="168" x2="224" y2="224" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="btn btn-icon btn-secondary"
            aria-label="다크모드 전환"
            ref={themeBtnRef}
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 256 256" fill="none">
                <path
                  d="M128 40V24M128 232v-16M40 128H24M232 128h-16M65 65 54 54M202 202l-11-11M65 191 54 202M202 54l-11 11"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <circle cx="128" cy="128" r="48" fill="currentColor" opacity="0.25" />
                <circle cx="128" cy="128" r="48" stroke="currentColor" strokeWidth="16" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 256 256" fill="none">
                <path
                  d="M216 136A96 96 0 1 1 120 40a80 80 0 0 0 96 96Z"
                  fill="currentColor"
                  opacity="0.25"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            className="nav-mobile-toggle btn btn-icon btn-secondary"
            aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? (
              <svg width="17" height="17" viewBox="0 0 256 256" fill="none">
                <path d="M64 64l128 128M192 64L64 192" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 256 256" fill="none">
                <path d="M40 88h176M40 168h176" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
              </svg>
            )}
          </button>
          </div>
        </div>
        {menuMounted && (
          // 위치·재질은 globals.css의 .nav-mobile-panel에 있다. 헤더의 자식이라 top: 100%만으로
          // 캡슐 아래에 붙는다 — 예전처럼 spacerH(=펼침 높이)를 쓰면 떠오른 캡슐과 어긋난다.
          <nav
            ref={panelRef}
            className={`nav-mobile-panel${hasLens && panelSize ? " has-lens" : ""}${
              mobileMenuOpen ? "" : " is-closing"
            }`}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link-mobile${active === item.key ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <div style={{ height: spacerH }} />


      {searchOpen && (
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
            animation: "backdropIn .2s ease both",
          }}
          onClick={closeSearch}
        >
          <div
            className="dialog elev-lg"
            style={{
              width: "100%",
              maxWidth: 600,
              padding: "var(--space-4)",
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              animation: "modalPop .28s cubic-bezier(.34,1.56,.64,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="dialog-title" style={{ fontSize: 18, margin: 0 }}>
                검색
              </p>
              <button className="btn btn-icon btn-secondary" aria-label="닫기" onClick={closeSearch}>
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
            <input
              className="input"
              ref={inputRef}
              placeholder="제목, 요약, 태그로 검색  ·  Cmd+K"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() ? (
              <>
                <p style={{ fontSize: 12, opacity: 0.55, margin: 0 }}>
                  {searching ? "검색 중…" : `글 ${results.length}개 결과`}
                </p>
                {results.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                    {results.map((r) => (
                      <Link
                        key={r.id}
                        href={`/posts/${r.slug}`}
                        onClick={closeSearch}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="tag tag-neutral" style={{ fontSize: 10 }}>
                            글
                          </span>
                          <h4 style={{ fontSize: 14, margin: 0 }}>{r.title}</h4>
                        </div>
                        <p style={{ fontSize: 12, margin: 0, opacity: 0.6, paddingLeft: 44 }}>
                          {r.publishedAt.slice(0, 10).split("-").join(".")} · {r.tags.join(", ")}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  !searching && (
                    <p style={{ fontSize: 13, opacity: 0.5, padding: "var(--space-4) 0", textAlign: "center" }}>
                      &ldquo;{query}&rdquo;에 대한 결과가 없습니다.
                    </p>
                  )
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>
                현재는 글만 검색합니다. 프로젝트·TIL이 추가되면 결과에 함께 표시될 예정입니다.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
