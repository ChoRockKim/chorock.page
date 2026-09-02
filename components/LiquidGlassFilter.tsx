/**
 * 헤더 캡슐의 굴절(refraction)용 SVG 필터. 한 번만 마운트한다.
 *
 * 배경을 실제로 휘게 하려면 `backdrop-filter`에 SVG 필터를 물려야 하는데, 2026년 9월 현재
 * 이건 크로뮴 계열에서만 동작한다 — 사파리·파이어폭스는 속성을 받아들이되 SVG 부분만
 * 조용히 버린다. 아이러니하게도 레퍼런스인 아이폰(사파리)에서는 안 보인다는 뜻이다.
 * 그래서 이 필터는 `Header.tsx`가 크로뮴을 확인했을 때만 적용된다(자동 강등에 기대지 않는
 * 이유: 사파리에서 실제로 어떻게 강등되는지 이 환경에서 확인할 수 없어서, 확인 가능한
 * 쪽에서만 켜는 편이 안전하다).
 *
 * 변위 맵은 가로 방향만 쓴다(R 채널). 캡슐에서 눈에 띄는 건 둥근 양 끝의 렌즈 왜곡이고,
 * 세로 변위까지 넣으면 맵이 복잡해지는 데 비해 47px 높이에서는 거의 보이지 않는다.
 * 가장자리 12% 구간에서만 128(=변위 없음)에서 벗어나므로 가운데 텍스트 영역은 왜곡되지 않는다.
 */
const DISPLACEMENT_MAP =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' preserveAspectRatio='none'>` +
      `<defs><linearGradient id='r' x1='0' y1='0' x2='1' y2='0'>` +
      `<stop offset='0' stop-color='rgb(0,128,128)'/>` +
      `<stop offset='0.12' stop-color='rgb(128,128,128)'/>` +
      `<stop offset='0.88' stop-color='rgb(128,128,128)'/>` +
      `<stop offset='1' stop-color='rgb(255,128,128)'/>` +
      `</linearGradient></defs>` +
      `<rect width='100' height='100' fill='url(#r)'/></svg>`
  );

export default function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id="liquid-glass-lens" x="0" y="0" width="100%" height="100%">
        <feImage
          href={DISPLACEMENT_MAP}
          result="lensMap"
          preserveAspectRatio="none"
          x="0"
          y="0"
          width="100%"
          height="100%"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="lensMap"
          scale="16"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
