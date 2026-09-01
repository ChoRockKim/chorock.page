"use client";

import { useState } from "react";
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
  // signIn/signOut은 GitHub·서버 왕복 뒤에야 화면이 바뀌어서, 누른 직후 잠시 아무 반응이
  // 없어 보인다. 그 사이를 라벨과 disabled로 메운다.
  const [pending, setPending] = useState(false);
  if (status === "loading") return null;

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        setPending(true);
        // 성공하면 페이지가 이동하므로 pending을 되돌릴 필요가 없다. 실패해 그대로
        // 남는 경우에만 다시 누를 수 있게 풀어준다.
        void (session ? signOut() : signIn("github", { callbackUrl: "/about" })).catch(() =>
          setPending(false)
        );
      }}
      style={{
        font: "inherit",
        fontSize: 12,
        color: "var(--color-text)",
        opacity: 0.4,
        background: "none",
        border: "none",
        padding: 0,
        cursor: pending ? "progress" : "pointer",
        textDecoration: "underline",
      }}
    >
      {pending ? (session ? "로그아웃 중…" : "이동 중…") : session ? "로그아웃" : "로그인"}
    </button>
  );
}
