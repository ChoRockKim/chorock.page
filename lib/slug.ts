const MAX_SLUG_LENGTH = 80;

/**
 * Slugifies a title while keeping non-Latin scripts (Korean titles stay Korean,
 * not romanized) — Next.js route segments handle non-ASCII fine via URL encoding.
 * Strips everything but letters/numbers/whitespace/hyphens, collapses whitespace
 * into single hyphens, and caps length so very long titles don't blow out the URL.
 * Returns "" if nothing usable remains (e.g. an emoji-only title) — callers should
 * fall back to something else (e.g. the legacy id) in that case.
 */
export function slugify(title: string): string {
  return title
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "")
    .toLowerCase();
}
