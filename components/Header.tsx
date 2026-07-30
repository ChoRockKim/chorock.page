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

type NavKey = "about" | "posts" | "series" | "projects";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "about", label: "소개", href: "/about" },
  { key: "posts", label: "글", href: "/posts" },
  { key: "series", label: "시리즈", href: "/series" },
  { key: "projects", label: "프로젝트", href: "/projects" },
];

export default function Header() {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [scrolled, setScrolled] = useState(false);
  const [spacerH, setSpacerH] = useState(66);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("chorock-theme") as "light" | "dark" | null) || "light";
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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-6)",
          flexWrap: "wrap",
          transition: "background .3s ease,backdrop-filter .3s ease,box-shadow .3s ease,border-color .3s ease",
          ...(scrolled
            ? {
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, white 10%, transparent) 0%, transparent 65%), radial-gradient(120% 80% at 12% 0%, color-mix(in srgb, white 14%, transparent) 0%, transparent 55%), color-mix(in srgb, var(--color-bg) 58%, transparent)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                  "inset 0 1px 0 color-mix(in srgb, white 22%, transparent), inset 0 -1px 0 color-mix(in srgb, black 6%, transparent)",
                borderBottom: "1px solid color-mix(in srgb, var(--color-text) 7%, transparent)",
              }
            : {
                background: "var(--color-bg)",
                borderBottom: "1px solid var(--color-divider)",
              }),
        }}
      >
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
      </header>
      <div style={{ height: spacerH }} />

      {mobileMenuOpen && (
        <nav
          className="nav-mobile-panel"
          style={{
            position: "fixed",
            top: spacerH,
            left: 0,
            right: 0,
            zIndex: 150,
            background: "var(--color-bg)",
            borderBottom: "1px solid var(--color-divider)",
            display: "flex",
            flexDirection: "column",
            padding: "var(--space-2) var(--space-6) var(--space-3)",
            animation: "navPanelIn .18s ease both",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                ...linkStyle(item.key),
                fontSize: 15,
                padding: "var(--space-3) 0",
                borderBottom: "1px solid var(--color-divider)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

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
