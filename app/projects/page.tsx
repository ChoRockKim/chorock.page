import type { Metadata } from "next";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import { listProjects } from "@/lib/projects";
import ProjectCard from "@/components/ProjectCard";

// See app/posts/page.tsx for why every field the root layout sets has to be repeated here.
export const metadata: Metadata = {
  title: "프로젝트 · chorock.page",
  description: "만든 프로젝트 모음",
  alternates: { canonical: "/projects" },
  openGraph: {
    ...SITE_OG_BASE,
    type: "website",
    url: "/projects",
    title: "프로젝트 · chorock.page",
    description: "만든 프로젝트 모음",
    images: SITE_OG_IMAGE,
  },
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

      {/* .stagger-list's cardIn keyframe re-fires on every mount of this grid, which used to
          conflict with the View Transition morphing a card's cover image/title back into place
          when landing here via the "← 프로젝트 목록" back-link (app/projects/[slug]/page.tsx).
          That link is the ONLY way to reach /projects through next-view-transitions' Link —
          Header.tsx's nav and every other arrival path use a plain next/link, so stagger is
          always safe there. components/ProjectsBackLink.tsx suppresses cardIn specifically for
          that one navigation via a short-lived html.projects-nav-no-stagger class (globals.css),
          so it's safe to have this class present unconditionally here again. */}
      {projects.length === 0 ? (
        <p style={{ fontSize: 14, opacity: 0.65 }}>아직 등록된 프로젝트가 없습니다.</p>
      ) : (
        <div
          className="stagger-list"
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
