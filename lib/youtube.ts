/**
 * YouTube URL parsing, shared by the server-side markdown pipeline (lib/markdown.ts turns a lone
 * YouTube link into an embed) and the live editor (which draws the same card in place). No
 * "server-only": the client bundle imports it too.
 */
export type YouTubeRef = { id: string; start: number; shorts: boolean };

const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"]);

/** "90", "90s", "1m30s", "1h2m3s" → seconds. */
function parseTime(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function parseYouTube(href: string): YouTubeRef | null {
  let url: URL;
  try {
    url = new URL(href.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!HOSTS.has(url.hostname)) return null;

  let id: string | null = null;
  let shorts = false;
  if (url.hostname === "youtu.be") {
    id = url.pathname.split("/")[1] || null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
    if (m) {
      id = m[2];
      shorts = m[1] === "shorts";
    }
  }
  // Video ids are exactly 11 chars of [A-Za-z0-9_-]; anything else is not a single video.
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const start = parseTime(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return { id, start, shorts };
}

export const youTubeThumb = (id: string, quality: "maxresdefault" | "hqdefault" = "maxresdefault") =>
  `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
