import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/ogFont";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners and adds its own mask, so this stays a flat filled square (no
// transparency, no manual border-radius) — same content as app/icon.tsx, just bigger.
export default async function AppleIcon() {
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
          fontSize: 96,
        }}
      >
        초
      </div>
    ),
    { ...size, fonts: [font] }
  );
}
