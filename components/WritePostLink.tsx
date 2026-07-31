"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * Client component so /posts can stay ISR (export const revalidate = 300) — a server-side
 * auth() call here would read cookies and force the whole page dynamic, the same regression
 * hit with Footer's login link (see CLAUDE.md's auth section / CHANGELOG). useSession() fetches
 * /api/auth/session after mount instead, so it can't affect this page's rendering mode.
 */
export default function WritePostLink() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <Link href="/posts/write" className="btn btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>
      새 글 작성
    </Link>
  );
}
