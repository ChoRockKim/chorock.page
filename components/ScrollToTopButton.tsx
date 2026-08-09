"use client";

import { useEffect, useRef, useState } from "react";

const SHOW_AFTER_PX = 400;
const LEAVE_ANIMATION_MS = 200;
const BOUNCE_ANIMATION_MS = 400;

/**
 * Mounted once in app/layout.tsx (site-wide, not just post pages, unlike
 * ReadingProgressBar). Stays mounted through its own exit animation instead of vanishing
 * instantly — `wasVisibleRef` tracks the last known shown/hidden state synchronously (a plain
 * setState read inside the scroll handler would be stale across renders), and `leaveTimer`
 * delays actually unmounting until scrollTopOut's animation (globals.css) has had time to play.
 */
export default function ScrollToTopButton() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const wasVisibleRef = useRef(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > SHOW_AFTER_PX;
      if (shouldShow && !wasVisibleRef.current) {
        wasVisibleRef.current = true;
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        setLeaving(false);
        setMounted(true);
      } else if (!shouldShow && wasVisibleRef.current) {
        wasVisibleRef.current = false;
        setLeaving(true);
        leaveTimer.current = setTimeout(() => setMounted(false), LEAVE_ANIMATION_MS);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  if (!mounted) return null;

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Re-triggers the .is-bouncing CSS animation on the arrow icon on every click, not just once.
    setBouncing(true);
    setTimeout(() => setBouncing(false), BOUNCE_ANIMATION_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="맨 위로 이동"
      className={`scroll-top-btn${leaving ? " is-leaving" : ""}${bouncing ? " is-bouncing" : ""}`}
    >
      <svg width="18" height="18" viewBox="0 0 256 256" fill="none">
        <path
          d="M64 112l64-64 64 64M128 56v152"
          stroke="currentColor"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
