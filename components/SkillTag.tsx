"use client";

import { useEffect, useState } from "react";
import { DARK_RECOLOR_ICON_SLUGS, normalizeSkillName, SKILL_ICON_SLUGS } from "@/lib/skillIcons";
import { useTheme } from "@/components/useTheme";

// 다크 테마의 --color-text(globals.css)와 같은 값. DARK_RECOLOR_ICON_SLUGS의 아이콘만 이 색으로
// 덮어 다크 배경에 묻히지 않게 한다. 라이트에서는 아무것도 덮지 않고 브랜드색 그대로 둔다.
const DARK_TEXT_COLOR = "eeecec";

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
    ? mounted && theme === "dark" && DARK_RECOLOR_ICON_SLUGS.has(slug)
      ? `https://cdn.simpleicons.org/${slug}/${DARK_TEXT_COLOR}`
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
