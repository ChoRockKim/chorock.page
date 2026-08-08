import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/posts";
import { loadOgFont } from "@/lib/ogFont";

export const alt = "게시글 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  const font = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f2f2",
          fontFamily: "Pretendard",
          padding: 80,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#4caf50",
            color: "#f3f2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          초
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 56,
            color: "#201e1d",
            lineHeight: 1.3,
            maxWidth: 980,
          }}
        >
          {post?.title ?? "chorock.page"}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#201e1d", opacity: 0.55 }}>chorock.page</div>
      </div>
    ),
    { ...size, fonts: [font] }
  );
}
