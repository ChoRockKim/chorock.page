import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug, listProjectSlugs } from "@/lib/projects";
import { compileMarkdown } from "@/lib/markdown";
import SkillTag from "@/components/SkillTag";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(decodeURIComponent(slug));
  if (!project) return {};
  return {
    title: `${project.title} · chorock.page`,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(decodeURIComponent(slug));
  if (!project) notFound();

  const { content } = await compileMarkdown(project.overviewMd);

  return (
    <div className="proj-grid">
      <aside className="proj-sidebar">
        <Link
          href="/projects"
          className="btn btn-ghost"
          style={{ fontSize: 13, paddingLeft: 0, marginBottom: "var(--space-4)" }}
        >
          ← 프로젝트 목록
        </Link>

        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            fontWeight: 600,
            margin: "0 0 var(--space-2)",
          }}
        >
          Project
        </p>
        <h1 style={{ fontSize: 26, lineHeight: 1.3, margin: "0 0 var(--space-3)" }}>{project.title}</h1>
        <p style={{ fontSize: 13.5, opacity: 0.75, margin: "0 0 var(--space-4)" }}>{project.summary}</p>

        <div style={{ marginBottom: "var(--space-4)" }}>
          <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 3px" }}>
            작업 기간
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>{project.period}</p>
        </div>

        <div
          style={{
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--color-divider)",
            marginBottom: "var(--space-4)",
          }}
        >
          <h2 style={{ fontSize: 13, margin: "0 0 var(--space-3)" }}>프로젝트 정보</h2>
          <div style={{ marginBottom: "var(--space-3)" }}>
            <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 3px" }}>
              팀 구성
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>{project.team}</p>
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 3px" }}>
              담당 역할
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>{project.role}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                <rect x="64" y="64" width="128" height="128" rx="8" fill="currentColor" opacity="0.2" />
                <path d="M136 48h72v72" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M200 128v72a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h72" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M208 48 120 136" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
              </svg>
              데모 보기
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {project.playStoreUrl && (
            <a
              href={project.playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13 }}
            >
              Play Store
            </a>
          )}
          {project.appStoreUrl && (
            <a
              href={project.appStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13 }}
            >
              App Store
            </a>
          )}
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <ScrollReveal>
          {project.coverImage ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 10,
                marginBottom: "var(--space-6)",
                overflow: "hidden",
              }}
            >
              <Image
                src={project.coverImage}
                alt=""
                fill
                priority
                sizes="(min-width: 900px) 700px, 100vw"
                style={{
                  objectFit: project.coverImageFit,
                  background: project.coverImageFit === "contain" ? "var(--color-surface)" : undefined,
                }}
              />
            </div>
          ) : (
            <div className="img-placeholder" style={{ width: "100%", aspectRatio: "16/9", marginBottom: "var(--space-6)" }}>
              대표 이미지
            </div>
          )}
        </ScrollReveal>

        {project.stack.length > 0 && (
          <section style={{ marginBottom: "var(--space-6)" }}>
            <ScrollReveal>
              <h2 style={{ fontSize: 18, margin: "0 0 var(--space-4)" }}>사용 기술</h2>
            </ScrollReveal>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {project.stack.map((group, i) => (
                <ScrollReveal key={group.label} delay={i * 0.06}>
                  <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 var(--space-1)" }}>
                    {group.label}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {group.items.map((tech) => (
                      <SkillTag key={tech} name={tech} />
                    ))}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        <ScrollReveal>
          <section>
            <h2 style={{ fontSize: 18, margin: "0 0 var(--space-4)" }}>프로젝트 개요</h2>
            <div className="pd-body">{content}</div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
