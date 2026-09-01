"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [shared, setShared] = useState(false);
  const [failed, setFailed] = useState(false);

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet — not an error
      }
      return;
    }
    try {
      // navigator.clipboard가 없는 환경에서 옵셔널 체이닝만 쓰면 undefined가 반환되어
      // 실패가 성공처럼 지나간다. 명시적으로 실패로 만든다.
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 1800);
    }
  };

  return (
    <button
      onClick={onShare}
      style={{
        border: "1px solid var(--color-divider)",
        background: shared ? "var(--color-accent-100)" : "none",
        color: shared ? "var(--color-accent-700)" : "var(--color-text)",
        cursor: "pointer",
        font: "inherit",
        fontSize: 12.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: "var(--radius-md)",
        transition: "background .2s ease,color .2s ease",
      }}
    >
      {shared ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="none"
          style={{ animation: "copyPopIn .35s cubic-bezier(.34,1.56,.64,1)" }}
        >
          <path
            d="M224 64 96 192l-64-64"
            stroke="currentColor"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 256 256" fill="none">
          <circle cx="176" cy="60" r="28" fill="currentColor" opacity="0.2" />
          <circle cx="176" cy="60" r="28" stroke="currentColor" strokeWidth="16" />
          <circle cx="80" cy="128" r="28" fill="currentColor" opacity="0.2" />
          <circle cx="80" cy="128" r="28" stroke="currentColor" strokeWidth="16" />
          <circle cx="176" cy="196" r="28" fill="currentColor" opacity="0.2" />
          <circle cx="176" cy="196" r="28" stroke="currentColor" strokeWidth="16" />
          <path
            d="M104 114l48-40M104 142l48 40"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </svg>
      )}
      {failed ? "복사 실패" : shared ? "링크 복사됨" : "공유하기"}
    </button>
  );
}
