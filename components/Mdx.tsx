"use client";

import type { ComponentPropsWithoutRef } from "react";
import { PhotoView } from "react-photo-view";

// Wrapped in PhotoView (react-photo-view — pinch-zoom + pull-down-to-close, Naver Blog-style)
// so clicking any image embedded in post/project markdown body content opens a full-screen
// viewer. PhotoProvider is mounted once in app/layout.tsx; this only needs to be a client
// component (like components/CodeBlock.tsx, mapped the same way via lib/markdown.ts's
// rehypeReact `components` option) because PhotoView itself needs interactivity/context.
export function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  const { alt, src, ...rest } = props;
  const resolvedAlt = alt ?? "";

  if (typeof src !== "string" || !src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img loading="lazy" {...rest} alt={resolvedAlt} />;
  }

  return (
    <PhotoView src={src}>
      {/* post images come from arbitrary author-supplied URLs, not a fixed set of remote
          hosts to allowlist for next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" {...rest} src={src} alt={resolvedAlt} style={{ cursor: "zoom-in" }} />
    </PhotoView>
  );
}

export function MDXBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return <blockquote {...props} />;
}
