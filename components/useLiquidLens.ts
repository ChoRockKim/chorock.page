"use client";

import { useEffect, useState } from "react";

/**
 * `backdrop-filter`에 물린 SVG 필터가 실제로 동작하는 브라우저인지 판별한다.
 *
 * 이 조합은 2026년 9월 현재 크로뮴 계열에서만 동작하고, 사파리·파이어폭스는 속성을 받아들이되
 * SVG 부분만 조용히 버린다 — 즉 `@supports`로는 구분되지 않는다. Houdini Paint API가 아직
 * 크로뮴 전용이라 이를 판별자로 쓴다.
 *
 * 서버 렌더 결과와 어긋나지 않도록 마운트 후에 켜진다(첫 렌더는 항상 false).
 */
export default function useLiquidLens() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof CSS !== "undefined" && CSS.supports("background", "paint(x)"));
  }, []);
  return supported;
}
