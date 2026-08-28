import { ImageResponse } from "next/og";
import { getProjectBySlugForOg } from "@/lib/projects";
import { loadOgFont } from "@/lib/ogFont";

export const alt = "프로젝트 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // See app/posts/[slug]/opengraph-image.tsx — must never throw, or a crawler falls back to
  // scraping some other image off the page instead of showing no preview at all.
  const project = await getProjectBySlugForOg(decodeURIComponent(slug)).catch(() => null);
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
            display: "flex",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#4caf50",
          }}
        >
          PROJECT
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
          {project?.title ?? "chorock.page"}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#201e1d", opacity: 0.55 }}>chorock.page</div>
      </div>
    ),
    { ...size, fonts: font ? [font] : undefined }
  );
}
