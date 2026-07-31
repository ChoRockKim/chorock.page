import Link from "next/link";
import Image from "next/image";
import SkillTag from "@/components/SkillTag";
import type { ProjectSummary } from "@/lib/projects";

export default function ProjectCard({
  project,
  priority = false,
}: {
  project: ProjectSummary;
  // Only the first (above-the-fold) card should skip lazy-loading — it's the page's actual
  // LCP element, and next/image defaults every other <Image> to lazy automatically.
  priority?: boolean;
}) {
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
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, aspectRatio: "16/9" }}>
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 768px) 33vw, 100vw"
            style={{
              objectFit: project.coverImageFit,
              background: project.coverImageFit === "contain" ? "var(--color-surface)" : undefined,
            }}
          />
        ) : (
          <div
            className="img-placeholder"
            style={{ width: "100%", height: "100%" }}
          >
            대표 이미지
          </div>
        )}
      </div>
      <h3 style={{ fontSize: 17, margin: 0, color: "var(--color-text)" }}>{project.title}</h3>
      <p style={{ fontSize: 13, margin: 0, opacity: 0.72, lineHeight: 1.5 }}>{project.summary}</p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 }}>
        {project.tags.slice(0, 3).map((tag) => (
          <SkillTag key={tag} name={tag} />
        ))}
        {project.tags.length > 3 && (
          <span className="text-muted" style={{ fontSize: 12 }}>
            +{project.tags.length - 3}
          </span>
        )}
      </div>
    </Link>
  );
}
