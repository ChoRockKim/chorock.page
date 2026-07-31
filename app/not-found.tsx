import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없음 · chorock.page",
};

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "60vh",
        padding: "var(--space-6)",
        gap: "var(--space-3)",
      }}
    >
      <p style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--color-accent)", fontWeight: 600, margin: 0 }}>
        404
      </p>
      <h1 style={{ fontSize: 28, margin: 0 }}>페이지를 찾을 수 없습니다</h1>
      <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
        주소가 잘못되었거나 삭제된 페이지일 수 있어요.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: "var(--space-3)", textDecoration: "none" }}>
        홈으로 이동
      </Link>
    </div>
  );
}
