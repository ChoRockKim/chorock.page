"use client";

import { useEffect } from "react";

/**
 * No UI — fires once per mount to record a site-wide visit (app/api/visits/route.ts dedupes
 * via cookie, so repeat mounts across page navigations within the same day are cheap no-ops
 * server-side). Mounted once in app/layout.tsx, same pattern as QueryProvider/
 * AuthSessionProvider, so this runs on every route, not just /about — a client-side effect is
 * required rather than counting during a server render because /about (and most pages) are
 * ISR, so a server-render-time count would only tick on cache regeneration, not real visits.
 */
export default function VisitTracker() {
  useEffect(() => {
    fetch("/api/visits", { method: "POST" }).catch(() => {
      // Best-effort — a failed visit count shouldn't surface anywhere in the UI.
    });
  }, []);

  return null;
}
