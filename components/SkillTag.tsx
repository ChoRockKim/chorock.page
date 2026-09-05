"use client";

import { useEffect, useState } from "react";
import { MONOCHROME_ICON_SLUGS, normalizeSkillName, SKILL_ICON_SLUGS } from "@/lib/skillIcons";
import { useTheme } from "@/components/useTheme";

// Matches --color-text for each theme in globals.css — MONOCHROME_ICON_SLUGS icons get
// recolored to this instead of their near-black default so they stay visible against
// .tag-outline's transparent (page-background-showing-through) background in dark mode.
const TEXT_COLOR_BY_THEME = { light: "201e1d", dark: "eeecec" };

export default function SkillTag({ name, icon }: { name: string; icon?: string }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  // useTheme() already knows the real (possibly dark) theme on the client's very first render
  // (layout.tsx's inline script sets <html data-theme> before hydration), but the server has
  // no localStorage to read and always renders as if light. Branching the <img src> on theme
  // directly would mismatch server vs. client HTML the moment a dark-mode visitor hydrates.
  // Deferring the recolor to a post-mount effect keeps the first client render identical to
  // what the server sent (plain default-color icon), then swaps to the theme-matched color a
  // frame later — no mismatch, just a barely-visible recolor for monochrome icons only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const slug = icon ?? SKILL_ICON_SLUGS[normalizeSkillName(name)];
  const iconUrl = slug
    ? mounted && MONOCHROME_ICON_SLUGS.has(slug)
      ? `https://cdn.simpleicons.org/${slug}/${TEXT_COLOR_BY_THEME[theme]}`
      : `https://cdn.simpleicons.org/${slug}`
    : null;

  return (
    <span className="tag tag-skill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {iconUrl && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- small brand icon from an external CDN, not a page asset next/image should optimize
        <img
          src={iconUrl}
          width={13}
          height={13}
          alt=""
          style={{ display: "block" }}
          onError={() => setFailed(true)}
        />
      )}
      {name}
    </span>
  );
}
