import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/ogFont";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same "이니셜 배지" idea as the about-page avatar fallback and career-logo fallback
// (accent-colored circle with the name's first character) — reused here since there's no
// dedicated logo asset yet.
export default async function Icon() {
  const font = await loadOgFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4caf50",
          color: "#f3f2f2",
          fontFamily: "Pretendard",
          fontSize: 20,
        }}
      >
        초
      </div>
    ),
    { ...size, fonts: [font] }
  );
}
