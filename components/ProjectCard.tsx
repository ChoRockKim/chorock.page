import Link from "next/link";
import SkillTag from "@/components/SkillTag";
import type { ProjectSummary } from "@/lib/projects";

export default function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ overflow: "hidden", borderRadius: 8 }}>
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, not a page asset next/image should optimize
          <img
            src={project.coverImage}
            alt=""
            loading="lazy"
            style={{
              width: "100%",
              aspectRatio: "16/9",
              display: "block",
              objectFit: project.coverImageFit,
              background: project.coverImageFit === "contain" ? "var(--color-surface)" : undefined,
            }}
          />
        ) : (
          <div
            className="img-placeholder"
            style={{ width: "100%", aspectRatio: "16/9" }}
          >
            대표 이미지
          </div>
        )}
      </div>
      <h3 style={{ fontSize: 17, margin: 0, color: "var(--color-text)" }}>{project.title}</h3>
      <p style={{ fontSize: 13, margin: 0, opacity: 0.72, lineHeight: 1.5 }}>{project.summary}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        {project.tags.map((tag) => (
          <SkillTag key={tag} name={tag} />
        ))}
      </div>
    </Link>
  );
}
