import type { Metadata } from "next";
import { listProjects } from "@/lib/projects";
import ProjectCard from "@/components/ProjectCard";

export const metadata: Metadata = {
  title: "프로젝트 · chorock.page",
};

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
      <h1 style={{ fontSize: 30, margin: "0 0 var(--space-2)" }}>프로젝트</h1>
      <p style={{ fontSize: 14, opacity: 0.65, margin: "0 0 var(--space-6)" }}>
        만들어보고 운영해본 사이드 프로젝트 모음입니다.
      </p>

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
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
