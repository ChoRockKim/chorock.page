import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 700;
  style: "normal";
};

/**
 * Satori (what next/og's ImageResponse renders through) ships with no Korean glyphs in its
 * default font, so any Korean text in an ImageResponse silently renders blank unless a font
 * with those glyphs is passed explicitly via the `fonts` option. Loaded from a local file
 * (public/fonts/Pretendard-Bold.otf) rather than fetched from a CDN on every image request —
 * no network dependency, and Satori only supports ttf/otf/woff (not woff2, which needs Brotli
 * decompression Satori doesn't implement).
 *
 * `public/` isn't bundled into serverless functions and this runtime `readFile` is invisible
 * to Next's file tracer, so the font only reaches the per-slug OG routes because
 * next.config.ts's `outputFileTracingIncludes` names it explicitly — see the comment there.
 * Returns null instead of throwing if that ever regresses: a Korean title rendering blank is
 * bad, but a 500 here is worse (link scrapers fall back to scraping the page's first <img>,
 * which on a post detail page is the author's own profile photo).
 */
export async function loadOgFont(): Promise<OgFont | null> {
  try {
    const data = await readFile(path.join(process.cwd(), "public/fonts/Pretendard-Bold.otf"));
    return { name: "Pretendard", data, weight: 700, style: "normal" };
  } catch {
    return null;
  }
}
