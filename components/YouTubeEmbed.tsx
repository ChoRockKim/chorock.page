"use client";

import { useState } from "react";
import { youTubeThumb } from "@/lib/youtube";

/**
 * A lone YouTube link in a post renders as this (lib/markdown.ts#remarkYouTube). Click-to-play:
 * until pressed it is only a thumbnail and a play button, so opening a post sets no YouTube
 * cookies and loads no player (a player is several hundred KB and a few seconds of main-thread
 * time per video). Pressing it swaps in a youtube-nocookie.com iframe with autoplay. The box
 * has a fixed aspect ratio, so nothing below it shifts when the iframe arrives.
 */
export default function YouTubeEmbed(props: Record<string, unknown>) {
  const id = String(props["data-id"] ?? "");
  const start = Number(props["data-start"] ?? 0);
  const shorts = props["data-shorts"] === "1";
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState<"maxresdefault" | "hqdefault">("maxresdefault");

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const src =
    `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` + (start > 0 ? `&start=${start}` : "");

  return (
    <div className={`yt-embed${shorts ? " is-shorts" : ""}`}>
      {playing ? (
        <iframe
          src={src}
          title="YouTube 영상"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="yt-embed-play" onClick={() => setPlaying(true)} aria-label="영상 재생">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youTubeThumb(id, thumb)}
            alt=""
            loading="lazy"
            // maxresdefault does not exist for every video (YouTube serves a 120px grey
            // placeholder, which fires no error) — hqdefault always does.
            onLoad={(e) => {
              if (thumb === "maxresdefault" && e.currentTarget.naturalWidth <= 120) setThumb("hqdefault");
            }}
            onError={() => setThumb("hqdefault")}
          />
          <span className="yt-embed-icon" aria-hidden>
            <svg width="68" height="48" viewBox="0 0 68 48">
              <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3S12.8.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3Z" fill="#f00" />
              <path d="m27 34 18-10-18-10v20Z" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
