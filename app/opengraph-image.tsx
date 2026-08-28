import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/ogFont";

export const alt = "chorock.page — 개발 기록을 남기는 블로그";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fallback for every route that doesn't define its own opengraph-image.tsx (/, /about,
// /posts, /projects, /series, /posts/write, ...) — Next walks up the route tree to the
// nearest one, so this alone covers the whole site except the per-slug pages below.
export default async function Image() {
  const font = await loadOgFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f2f2",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "#4caf50",
            color: "#f3f2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 88,
            marginBottom: 40,
          }}
        >
          초
        </div>
        <div style={{ display: "flex", fontSize: 64, color: "#201e1d" }}>초록</div>
        <div style={{ display: "flex", fontSize: 28, color: "#201e1d", opacity: 0.6, marginTop: 16 }}>
          개발 기록을 남기는 블로그
        </div>
      </div>
    ),
    { ...size, fonts: font ? [font] : undefined }
  );
}
