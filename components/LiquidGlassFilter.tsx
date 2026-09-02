"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * 헤더 캡슐의 굴절 필터. 변위 맵을 캔버스에서 픽셀 단위로 생성한다.
 *
 * 처음에는 선형 그라디언트 한 장을 맵으로 썼는데, 그건 가로로 미는 것뿐이라 "휘어 보인다"
 * 이상으로는 가지 않았다. 실제 리퀴드 글래스는 **둥근 사각형의 부호 거리장(SDF)**으로
 * 가장자리까지의 거리를 구하고, 그 거리에 smoothstep을 먹여 안쪽으로 빨아들이는 형태다 —
 * 가운데는 변위 0, 테두리로 갈수록 급격히 휘어서 렌즈처럼 보인다.
 * (shuding/liquid-glass의 접근을 따랐다.)
 *
 * 브라우저 제약은 그대로다: `backdrop-filter`에 물린 SVG 필터는 크로뮴 계열에서만 동작하고
 * 사파리·파이어폭스는 조용히 무시한다. `Header.tsx`가 크로뮴을 확인했을 때만 마운트한다.
 */

/** 둥근 사각형까지의 부호 거리. 안쪽이면 음수, 바깥이면 양수. */
function roundedRectSDF(x: number, y: number, w: number, h: number, radius: number) {
  const qx = Math.abs(x) - w + radius;
  const qy = Math.abs(y) - h + radius;
  return (
    Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius
  );
}

/** Hermite 보간. 가장자리 부근에서만 부드럽게 변위가 살아나게 만든다. */
function smoothStep(a: number, b: number, t: number) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/**
 * 맵을 만들고 정규화 배율을 함께 돌려준다. 변위량을 최대값으로 나눠 0~1에 담고, 그 최대값을
 * `feDisplacementMap`의 scale로 되돌려주는 방식 — 그래야 채널 8비트 안에서 정밀도를 다 쓴다.
 */
function buildDisplacementMap(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const raw: number[] = [];
  let maxScale = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ix = x / w - 0.5;
      const iy = y / h - 0.5;
      const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
      const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
      const scaled = smoothStep(0, 1, displacement);
      const dx = (ix * scaled + 0.5) * w - x;
      const dy = (iy * scaled + 0.5) * h - y;
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      raw.push(dx, dy);
    }
  }
  maxScale *= 0.5;

  const image = ctx.createImageData(w, h);
  const data = image.data;
  for (let i = 0, j = 0; i < data.length; i += 4) {
    // R = 가로 변위, G = 세로 변위, 128이 "변위 없음"
    data[i] = (raw[j++] / maxScale + 0.5) * 255;
    data[i + 1] = (raw[j++] / maxScale + 0.5) * 255;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { href: canvas.toDataURL(), maxScale };
}

/**
 * 굴절 세기(px). 맵이 돌려주는 maxScale을 그대로 쓰면 이 캡슐(462×67)에서는 80px가 넘게
 * 나온다 — 원본 구현의 SDF 상수가 정사각형에 가까운 블롭(300×200) 기준이라 6.9:1로 납작한
 * 캡슐에서는 변위가 과하게 커진다. 맵은 방향과 상대 크기만 담고 있으므로, 실제 진폭은 여기서
 * 정한다. 맵의 maxScale을 그대로 썼을 때는 뒤 내용이 무지개 줄무늬로 찢어졌다.
 */
const LENS_STRENGTH = 12;

// 채널마다 배율을 조금씩 어긋내면 가장자리에서 색이 갈라진다(색수차). 간격이 넓으면
// 유리가 아니라 색수차 자체가 보이므로 ±6%로 좁게 잡는다.
const ABERRATION = [1.06, 1, 0.94];
const CHANNEL = [
  "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
];

export default function LiquidGlassFilter({
  id = "liquid-glass-lens",
  width,
  height,
}: {
  /** 필터 id. 캡슐과 모바일 메뉴는 크기가 달라 각자의 변위 맵이 필요하므로 따로 마운트한다. */
  id?: string;
  width: number;
  height: number;
}) {
  const [map, setMap] = useState<{ href: string; maxScale: number } | null>(null);

  useEffect(() => {
    if (width < 8 || height < 8) return;
    // 맵 생성은 O(w×h)라 크기가 바뀔 때만 돈다. 필터 자체는 매 프레임 GPU에서 처리된다.
    setMap(buildDisplacementMap(Math.round(width), Math.round(height)));
  }, [width, height]);

  if (!map) return null;

  return (
    <svg aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feImage
          href={map.href}
          result="map"
          preserveAspectRatio="none"
          x="0"
          y="0"
          width="100%"
          height="100%"
        />
        {ABERRATION.map((k, i) => (
          // 필터 프리미티브는 <filter>의 직계 자식이어야 한다. <g>로 묶으면 필터가 무효가 된다.
          <Fragment key={i}>
            <feColorMatrix in="SourceGraphic" type="matrix" values={CHANNEL[i]} result={`ch${i}`} />
            <feDisplacementMap
              in={`ch${i}`}
              in2="map"
              scale={LENS_STRENGTH * k}
              xChannelSelector="R"
              yChannelSelector="G"
              result={`disp${i}`}
            />
          </Fragment>
        ))}
        <feComposite
          in="disp0"
          in2="disp1"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="rg"
        />
        <feComposite in="rg" in2="disp2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </svg>
  );
}
