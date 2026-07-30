"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/markdown";

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
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
