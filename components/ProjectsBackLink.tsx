"use client";

import { Link } from "next-view-transitions";
import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

const SUPPRESS_CLASS = "projects-nav-no-stagger";
/**
 * Must outlast the stagger's FULL timeline measured from when the grid mounts — cardIn is 0.45s
 * and the largest animation-delay in app/globals.css is 0.56s (the fallback for children past
 * the explicit nth-child list), so 1.01s, plus however long the navigation itself took before
 * those elements existed. 1.6s clears that with room. Raise it if those delays grow again. The
 * suppression must not lift early: see the globals.css comment on why the override shortens the
 * animation rather than removing it, and why lifting it too soon would replay the whole stagger.
 */
const SUPPRESS_MS = 1600;

function suppressStagger() {
  const html = document.documentElement;
  html.classList.add(SUPPRESS_CLASS);
  window.setTimeout(() => html.classList.remove(SUPPRESS_CLASS), SUPPRESS_MS);
}

/** The only Link that navigates INTO /projects through next-view-transitions (every other
 *  arrival — Header nav, direct load — uses a plain next/link, so .stagger-list's entrance
 *  fade is always safe there). Clicking it briefly flags <html> so the list page's stagger
 *  doesn't play on top of the View Transition morphing the cover image/title back into place. */
export default function ProjectsBackLink({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  useEffect(() => {
    // The browser back button and the trackpad/edge swipe-back gesture reach /projects without
    // ever touching the link below, so they need the same flag. This component only renders on
    // a project detail page, so the listener can't fire anywhere else.
    const onPopState = () => suppressStagger();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <Link href="/projects" className="btn btn-ghost" style={style} onClick={suppressStagger}>
      {children}
    </Link>
  );
}
