import Link from "next/link";
import Image from "next/image";
import { PROFILE } from "@/lib/profile";

/** Compact author byline between a post's body and its comments — clicking the photo or name
 * goes to /about. Shares PROFILE with app/about/page.tsx (lib/profile.ts) so editing one place
 * updates both. */
export default function PostAuthorCard() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4) 0",
        borderTop: "1px solid var(--color-divider)",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <Link
        href="/about"
        style={{ flex: "none", width: 56, height: 56, borderRadius: "50%", overflow: "hidden", display: "flex" }}
      >
        <Image
          src={PROFILE.avatar}
          alt={PROFILE.handle}
          width={56}
          height={56}
          // This card lives inside <article className="pd-body"> (app/posts/[slug]/page.tsx),
          // and globals.css's `.pd-body img { margin: var(--space-4) auto; ... }` — meant for
          // images inside the post's markdown body — matches ANY descendant img, including this
          // one. Without an explicit margin/max-height override here, that rule's 20px top
          // margin shoved the photo down inside its circular mask, cropping the actual portrait
          // into a lopsided blob instead of a centered circle. object-fit/border-radius are
          // repeated here too since inline styles beat the class, but margin/maxHeight need
          // to be explicit since `.pd-body img` sets them and this component doesn't otherwise
          // touch them.
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            borderRadius: "50%",
            margin: 0,
            maxHeight: "none",
          }}
        />
      </Link>
      <div style={{ minWidth: 0 }}>
        <Link
          href="/about"
          style={{ fontSize: 15, fontWeight: 600, color: "inherit", textDecoration: "none" }}
        >
          {PROFILE.handle}
        </Link>
        <p style={{ fontSize: 13, opacity: 0.7, margin: "2px 0 0", lineHeight: 1.5 }}>{PROFILE.shortIntro}</p>
      </div>
    </div>
  );
}
