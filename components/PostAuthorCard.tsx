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
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
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
