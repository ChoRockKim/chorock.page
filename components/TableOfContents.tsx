"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/markdown";

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
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

  if (headings.length === 0) return null;

  return (
    <aside className="toc-desktop" style={{ position: "sticky", top: 80, alignSelf: "start", fontSize: 13 }}>
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
