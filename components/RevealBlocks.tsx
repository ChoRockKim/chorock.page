"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades in each top-level block of a compiled-markdown body independently, instead of revealing
 * the whole body as one unit the way `components/ScrollReveal.tsx` does.
 *
 * The project overview used to be a single `<ScrollReveal>`, and the reported symptom was
 * "on a long project you have to scroll way down before anything appears". The cause is
 * ScrollReveal's `threshold: 0.1`: `intersectionRatio` is intersectionArea/elementArea, so a
 * ratio threshold on a tall element means a fixed *fraction of the element* must be inside the
 * root before it fires. Measured on /projects/boo-game at a 872px viewport: body 5,139px tall,
 * root 785px after ScrollReveal's -10% bottom margin, so the ratio caps at 0.153 — it does
 * eventually cross 0.1, but only after ~514px (0.1 x 5,139) of the body has entered. Short
 * projects clear that in one screen, which is why this only ever reproduced on the long ones.
 *
 * Hence no `threshold` here: the default 0 fires as soon as a single pixel intersects, which is
 * height-independent and stays correct when one individual block — a long code block, a 16:9
 * image — is itself taller than the viewport.
 *
 * The hidden starting state comes from the server-rendered `.reveal-blocks` class in
 * globals.css, not from JS adding a class after mount: adding it later would paint the content
 * visible for a frame, then hide it, then fade it back in.
 */
export default function RevealBlocks({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );

    for (const child of Array.from(el.children)) io.observe(child);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="pd-body reveal-blocks">
      {children}
    </div>
  );
}
