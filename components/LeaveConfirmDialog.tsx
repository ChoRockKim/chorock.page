"use client";

import { useEffect, useRef } from "react";

/**
 * 글 작성 화면 이탈 확인 모달.
 *
 * 네이티브 `window.confirm`을 대신한다 — confirm은 떠 있는 동안 메인 스레드를 통째로 막아
 * 페이지가 그리지도 반응하지도 못하고, 닫는 순간 그동안 밀려 있던 작업(작성 화면에서는
 * 디바운스된 미리보기 서버 액션과 Shiki 미리보기 재렌더가 가장 무겁다)이 한꺼번에 쏟아져
 * "잠깐 멈췄다 정상화되는" 증상으로 보였다. 이 모달은 비동기라 메인 스레드를 막지 않는다.
 *
 * `.dialog-backdrop`/`.dialog`/`backdropIn`/`modalPop` 규약은 `DraftsPopup`·헤더 검색과 동일.
 */
export default function LeaveConfirmDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // 안전한 쪽("계속 작성")에 포커스를 둔다 — 무심코 누른 Enter가 쓰던 글을 버리면 안 된다.
    stayRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onStay]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "18vh var(--space-4) var(--space-4)",
      }}
      onClick={onStay}
      role="presentation"
    >
      <div
        className="dialog elev-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-confirm-title"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p id="leave-confirm-title" className="dialog-title" style={{ fontSize: 18, margin: 0 }}>
          저장하지 않고 나갈까요?
        </p>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.75, lineHeight: 1.6 }}>
          작성 중인 내용이 아직 저장되지 않았습니다. 이 페이지를 벗어나면 마지막으로 저장한
          이후의 변경 사항이 사라집니다.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button ref={stayRef} type="button" className="btn btn-secondary" onClick={onStay}>
            계속 작성
          </button>
          <button type="button" className="btn btn-primary" onClick={onLeave}>
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
