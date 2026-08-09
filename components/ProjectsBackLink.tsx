"use client";

import { Link } from "next-view-transitions";
import type { CSSProperties, ReactNode } from "react";

const SUPPRESS_CLASS = "projects-nav-no-stagger";
// Comfortably longer than both the View Transition's default duration (~300ms) and
// .stagger-list's own cardIn animation (0.45s) — see app/globals.css's html.projects-nav-
// no-stagger rule for what this class actually suppresses.
const SUPPRESS_MS = 700;

/** The only Link that navigates INTO /projects through next-view-transitions (every other
 *  arrival — Header nav, direct load — uses a plain next/link, so .stagger-list's entrance
 *  fade is always safe there). Clicking this one briefly flags <html> so the list page's
 *  stagger doesn't replay and fight the View Transition morphing the cover image/title back
 *  into place. */
export default function ProjectsBackLink({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const handleClick = () => {
    document.documentElement.classList.add(SUPPRESS_CLASS);
    setTimeout(() => {
      document.documentElement.classList.remove(SUPPRESS_CLASS);
    }, SUPPRESS_MS);
  };

  return (
    <Link href="/projects" className="btn btn-ghost" style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}
