"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export default function ScrollReveal({
  children,
  style,
  className,
  delay,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Seconds — staggers reveal for siblings that enter the viewport at the same scroll
   *  position (e.g. cards in the same grid row), which would otherwise fade in simultaneously. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { ...style, transitionDelay: `${delay}s` } : style}
    >
      {children}
    </div>
  );
}
