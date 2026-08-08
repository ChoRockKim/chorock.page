import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Satori (what next/og's ImageResponse renders through) ships with no Korean glyphs in its
 * default font, so any Korean text in an ImageResponse silently renders blank unless a font
 * with those glyphs is passed explicitly via the `fonts` option. Loaded from a local file
 * (public/fonts/Pretendard-Bold.otf) rather than fetched from a CDN on every image request —
 * no network dependency, and Satori only supports ttf/otf/woff (not woff2, which needs Brotli
 * decompression Satori doesn't implement).
 */
export async function loadOgFont() {
  const data = await readFile(path.join(process.cwd(), "public/fonts/Pretendard-Bold.otf"));
  return { name: "Pretendard", data, weight: 700 as const, style: "normal" as const };
}
