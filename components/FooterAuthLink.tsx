"use client";

import { useSession, signIn, signOut } from "next-auth/react";

/**
 * Client-side session check (not server-side auth()) deliberately — Footer is in the root
 * layout, so a server-side auth() call there would read cookies during render and force
 * every page in the app into dynamic rendering, undoing the /posts, /projects, /about, /series
 * static/ISR setup. useSession() fetches /api/auth/session after mount instead, keeping those
 * routes static.
 */
export default function FooterAuthLink() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;

  return (
    <button
      type="button"
      onClick={() => (session ? signOut() : signIn("github", { callbackUrl: "/about" }))}
      style={{
        font: "inherit",
        fontSize: 12,
        color: "var(--color-text)",
        opacity: 0.4,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      {session ? "로그아웃" : "로그인"}
    </button>
  );
}
