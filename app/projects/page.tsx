import type { Metadata } from "next";
import { listProjects } from "@/lib/projects";
import ProjectCard from "@/components/ProjectCard";

// See app/posts/page.tsx for why openGraph needs its own explicit title/description/images.
export const metadata: Metadata = {
  title: "프로젝트 · chorock.page",
  openGraph: { title: "프로젝트 · chorock.page", description: "만든 프로젝트 모음", images: ["/opengraph-image"] },
};

export default async function ProjectsPage() {
  const projects = await listProjects();

  // No pageFadeIn here (unlike most other top-level pages) — this page and /projects/[slug]
  // both navigate via next-view-transitions' Link now, whose own page-level cross-fade was
  // stacking with pageFadeIn's opacity animation on every mount, which is what was actually
  // causing the reported flicker in both directions.
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-6)" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 var(--space-2)" }}>프로젝트</h1>
      <p style={{ fontSize: 14, opacity: 0.65, margin: "0 0 var(--space-6)" }}>
        만들어보고 운영해본 사이드 프로젝트 모음입니다.
      </p>

      {/* No .stagger-list here (unlike components/PostsListClient.tsx, which still uses it
          fine — it doesn't participate in View Transitions) — its cardIn keyframe re-fires
          opacity:0->1 on every mount of this grid, including landing back here via the
          next-view-transitions Link from a project detail page, which fights the transition
          morphing a card's cover image/title back into place. Same root cause as the
          pageFadeIn removal above, just on the list side instead of the detail side. */}
      {projects.length === 0 ? (
        <p style={{ fontSize: 14, opacity: 0.65 }}>아직 등록된 프로젝트가 없습니다.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {projects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} priority={index === 0} />
          ))}
        </div>
      )}
    </main>
  );
}
