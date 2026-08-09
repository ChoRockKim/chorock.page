"use client";

import { useEffect, useState } from "react";

/**
 * Read-only display (GET, never records) — components/VisitTracker.tsx already records the
 * visit to this page via its own POST mounted in app/layout.tsx, so this fetching too would
 * double-count. Renders nothing until loaded, rather than a placeholder, to avoid a layout
 * shift once the real numbers arrive a moment later.
 */
export default function VisitCounter() {
  const [counts, setCounts] = useState<{ today: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then(setCounts)
      .catch(() => {
        // Best-effort — just don't show the counter if this fails.
      });
  }, []);

  if (!counts) return null;

  return (
    <span style={{ fontSize: 12.5, opacity: 0.55 }}>
      · 오늘 {counts.today} · 총 {counts.total}
    </span>
  );
}
