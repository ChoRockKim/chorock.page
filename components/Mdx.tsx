import type { ComponentPropsWithoutRef } from "react";

export function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  // post images come from arbitrary author-supplied URLs, not a fixed set of remote hosts to allowlist for next/image
  // eslint-disable-next-line @next/next/no-img-element
  return <img loading="lazy" {...props} alt={props.alt ?? ""} />;
}

export function MDXBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return <blockquote {...props} />;
}
