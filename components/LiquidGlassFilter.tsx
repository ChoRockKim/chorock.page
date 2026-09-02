/**
 * 헤더 캡슐의 굴절 + 색수차 필터. 한 번만 마운트한다.
 *
 * 배경을 실제로 휘게 하려면 `backdrop-filter`에 SVG 필터를 물려야 하는데, 2026년 9월 현재
 * 크로뮴 계열에서만 동작한다 — 사파리·파이어폭스는 속성을 받되 SVG 부분만 조용히 버린다.
 * 그래서 `Header.tsx`가 크로뮴을 확인했을 때만 적용된다.
 *
 * 구조(ruri.design/glass의 필터를 뜯어 확인한 구성):
 *   1. 변위 맵을 feImage로 읽고
 *   2. R/G/B를 feColorMatrix로 각각 분리한 뒤
 *   3. **채널마다 조금씩 다른 scale로** feDisplacementMap을 걸고
 *   4. feComposite(arithmetic, k2=k3=1)로 다시 더한다.
 * 채널별로 휘는 정도가 다르니 가장자리에 색이 갈라져 보인다 — 이게 색수차(chromatic
 * aberration)이고, 단색 굴절과 "진짜 유리" 사이의 차이를 만드는 부분이다.
 *
 * `primitiveUnits="objectBoundingBox"`가 중요하다. scale이 요소 크기의 비율로 해석되므로
 * 캡슐 폭이 애니메이션으로 변해도 굴절 세기가 함께 비례한다 — 고정 픽셀이면 폭이 바뀔 때마다
 * 맵을 다시 만들어야 한다(그게 이 기법의 알려진 비용이다).
 */

/** 가로 변위만 쓴다. 캡슐은 높이 67px로 납작해서 세로 굴절은 거의 보이지 않는 반면
 *  맵은 두 배로 복잡해진다. B 채널에 가로 변위를 담고 R은 128(=변위 없음)로 고정한다. */
const DISPLACEMENT_MAP =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' preserveAspectRatio='none'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'>` +
      `<stop offset='0' stop-color='rgb(128,128,0)'/>` +
      `<stop offset='0.16' stop-color='rgb(128,128,128)'/>` +
      `<stop offset='0.84' stop-color='rgb(128,128,128)'/>` +
      `<stop offset='1' stop-color='rgb(128,128,255)'/>` +
      `</linearGradient></defs>` +
      `<rect width='100' height='100' fill='url(#g)'/></svg>`
  );

// 가운데 값이 굴절 세기, 좌우 차이가 색수차 폭. 참조 구현의 0.42/0.40/0.38과 같은 형태다.
const SCALE = { r: 0.085, g: 0.06, b: 0.035 };

const CHANNEL = {
  // 알파(넷째 행)는 살려야 합성 후 배경이 뚫리지 않는다.
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
};

export default function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id="liquid-glass-lens" primitiveUnits="objectBoundingBox">
        <feImage
          href={DISPLACEMENT_MAP}
          result="map"
          preserveAspectRatio="none"
          x="0"
          y="0"
          width="1"
          height="1"
        />

        <feColorMatrix in="SourceGraphic" type="matrix" values={CHANNEL.r} result="ch_r" />
        <feDisplacementMap
          in="ch_r"
          in2="map"
          scale={SCALE.r}
          xChannelSelector="B"
          yChannelSelector="R"
          result="disp_r"
        />

        <feColorMatrix in="SourceGraphic" type="matrix" values={CHANNEL.g} result="ch_g" />
        <feDisplacementMap
          in="ch_g"
          in2="map"
          scale={SCALE.g}
          xChannelSelector="B"
          yChannelSelector="R"
          result="disp_g"
        />

        <feColorMatrix in="SourceGraphic" type="matrix" values={CHANNEL.b} result="ch_b" />
        <feDisplacementMap
          in="ch_b"
          in2="map"
          scale={SCALE.b}
          xChannelSelector="B"
          yChannelSelector="R"
          result="disp_b"
        />

        <feComposite
          in="disp_r"
          in2="disp_g"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="rg"
        />
        <feComposite in="rg" in2="disp_b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </svg>
  );
}
