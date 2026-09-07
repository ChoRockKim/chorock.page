"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 0(또는 직전 표시값)에서 target까지 숫자를 세어 올린다. 조회수·방문자 수가 fetch 응답이
 * 도착하는 순간 한 프레임에 툭 바뀌는 게 거슬린다는 피드백에서 나왔다 — 0을 먼저 보여주고
 * 도착하면 굴러 올라가게 한다.
 *
 * target이 null이면 아직 로딩 중이라는 뜻으로, 0을 돌려준다.
 */

// 등속은 기계적으로 보인다. 끝에서 감속해야 숫자가 "맞춰지는" 느낌이 난다.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 크기에 따라 시간을 조금 늘린다. 0→2를 700ms 동안 끄는 건 굼떠 보이고, 0→155를 200ms에
 * 끝내면 그냥 점프로 보인다. 자릿수로 가산하되 상한을 둔다.
 */
function durationFor(delta: number): number {
  if (delta <= 0) return 0;
  return Math.min(900, 300 + Math.log10(delta + 1) * 260);
}

function prefersReducedMotion(): boolean {
  // CSS가 아니라 JS 애니메이션이라 미디어 쿼리를 직접 물어야 한다(Header.tsx의 테마 전환과 같은 이유).
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useCountUp(target: number | null): number {
  const [display, setDisplay] = useState(0);
  // 애니메이션 시작점. state로 두면 프레임마다 갱신되며 자기 자신을 다시 트리거한다.
  const fromRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;

    const from = fromRef.current;
    if (from === target) return;

    const settle = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      fromRef.current = target;
      setDisplay(target);
    };

    const duration = durationFor(Math.abs(target - from));
    if (duration === 0 || prefersReducedMotion()) {
      settle();
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (target - from) * easeOut(t)));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        frameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(step);

    // **최종값에 도달하는 경로가 rAF 하나뿐이면 안 된다.** rAF는 배경 탭에서 멈추고, 부하가
    // 큰 환경에서는 아예 굶는다 — 이 저장소의 개발 머신 Chrome이 실제로 그렇다(조회수 60인
    // 글이 "조회 0"에 갇힌 채 400ms 동안 rAF가 한 번도 안 도는 것을 확인했다). 그러면 애니메이션이
    // 빠지는 게 아니라 **틀린 숫자가 남는다.** 그래서 시간이 지나면 값을 맞추는 안전장치를 둔다.
    // setTimeout도 배경 탭에서 억제되지만 최소 1초 간격으로는 실행되므로 언젠가 반드시 맞춰진다.
    const guard = setTimeout(settle, duration + 400);

    // 목록에서 페이지를 넘기면 카드가 실제로 언마운트된다.
    return () => {
      clearTimeout(guard);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [target]);

  return display;
}
