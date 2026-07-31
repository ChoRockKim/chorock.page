"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import DeletePostButton from "@/components/DeletePostButton";

/**
 * Client component so /posts/[slug] can be ISR (export const revalidate below) — a server-side
 * auth() call in the page itself would read cookies and force the whole route dynamic, the same
 * regression already hit with Footer's login link and worked around for /posts's "새 글 작성"
 * button (see components/FooterAuthLink.tsx / WritePostLink.tsx).
 */
export default function PostOwnerActions({ slug }: { slug: string }) {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <>
      <Link
        href={`/posts/${slug}/edit`}
        className="btn btn-secondary"
        style={{ fontSize: 13, textDecoration: "none" }}
      >
        수정
      </Link>
      <DeletePostButton slug={slug} />
    </>
  );
}
