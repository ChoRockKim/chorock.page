"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/components/useCountUp";

/**
 * Read-only display (GET, never records) — components/VisitTracker.tsx already records the
 * visit to this page via its own POST mounted in app/layout.tsx, so this fetching too would
 * double-count. Starts at 0/0 and renders immediately instead of waiting for the fetch to
 * resolve — rendering nothing until loaded meant the counter's text only popped in late (and,
 * per user feedback, was easy to miss entirely since there was nothing to signal it existed
 * before that). No layout shift either way since the label text is the same length regardless.
 */
export default function VisitCounter() {
  const [counts, setCounts] = useState<{ today: number; total: number } | null>(null);
  // 0에서 실제 값까지 세어 올린다(조회수와 같은 훅). 이전에는 0을 그리다 응답이 오면 툭 바뀌었다.
  const today = useCountUp(counts?.today ?? null);
  const total = useCountUp(counts?.total ?? null);

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then(setCounts)
      .catch(() => {
        // Best-effort — just keep showing 0/0 if this fails.
      });
  }, []);

  return (
    <span className="tnum" style={{ fontSize: 12.5, opacity: 0.55 }}>
      today {today} · total {total}
    </span>
  );
}
