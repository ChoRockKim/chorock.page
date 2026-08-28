/**
 * Shared site-level metadata values. Not "server-only" — these are plain display constants
 * read from Server Components' `metadata`/`generateMetadata` exports only.
 *
 * This exists because of a Next.js metadata merging trap already documented in CLAUDE.md for
 * `openGraph.images`: Next merges parent→child metadata **per top-level key**, not per field.
 * A child route that sets `openGraph: { title, description }` REPLACES the root layout's whole
 * openGraph object — so `type`, `siteName` and `locale` silently vanished from every route
 * that overrode it (confirmed by curling the rendered HTML: not one page on the live site
 * emitted og:type/og:site_name/og:locale). Spreading SITE_OG_BASE into each route's own
 * openGraph is what keeps them.
 */
export const SITE_TITLE = "chorock.page";
export const SITE_DESCRIPTION = "개발 기록을 남기는 블로그";
export const SITE_URL = "https://chorock.page";

/**
 * Deliberately does NOT include `type` — routes set their own ("website" for list/static
 * pages, "article" for post detail), and baking a `type: "website"` in here would make every
 * article route override a union member TypeScript then has to widen awkwardly.
 *
 * Also deliberately does NOT include `images`. Routes with their own per-segment
 * opengraph-image.tsx (/posts/[slug], /projects/[slug]) get theirs from that file convention,
 * and restating a default here would override the per-slug image with the generic one.
 * Routes without one use SITE_OG_IMAGE below.
 */
export const SITE_OG_BASE = {
  siteName: SITE_TITLE,
  locale: "ko_KR",
} as const;

/** The root app/opengraph-image.tsx, restated for routes that override `openGraph` but have
 *  no opengraph-image.tsx of their own (see CLAUDE.md — the override drops the inherited one). */
export const SITE_OG_IMAGE = ["/opengraph-image"];

/**
 * Builds a canonical path. Slugs can contain Korean, and a canonical URL must be a real URL —
 * same encodeURIComponent requirement as app/sitemap.ts and permanentRedirect's Location
 * header (see CLAUDE.md). Returns a root-relative path; Next resolves it against
 * `metadataBase` and leaves already-percent-encoded sequences alone.
 */
export function canonicalPath(...segments: string[]): string {
  return "/" + segments.map((s) => encodeURIComponent(s)).join("/");
}

/** Stable @id for the site owner's schema.org Person node, declared once in app/layout.tsx's
 *  @graph. Post/project structured data references this instead of re-inlining the Person. */
export const PERSON_ID = `${SITE_URL}/about#person`;
