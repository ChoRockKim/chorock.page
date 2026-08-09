"use client";

import { useEffect, useState } from "react";

/**
 * Read-only display (GET, never records) — components/VisitTracker.tsx already records the
 * visit to this page via its own POST mounted in app/layout.tsx, so this fetching too would
 * double-count. Starts at 0/0 and renders immediately instead of waiting for the fetch to
 * resolve — rendering nothing until loaded meant the counter's text only popped in late (and,
 * per user feedback, was easy to miss entirely since there was nothing to signal it existed
 * before that). No layout shift either way since the label text is the same length regardless.
 */
export default function VisitCounter() {
  const [counts, setCounts] = useState<{ today: number; total: number }>({ today: 0, total: 0 });

  useEffect(() => {
    fetch("/api/visits")
      .then((res) => res.json())
      .then(setCounts)
      .catch(() => {
        // Best-effort — just keep showing 0/0 if this fails.
      });
  }, []);

  return (
    <span style={{ fontSize: 12.5, opacity: 0.55 }}>
      today {counts.today} · total {counts.total}
    </span>
  );
}
