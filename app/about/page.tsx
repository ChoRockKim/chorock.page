import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCachedPosts } from "@/lib/posts";
import { listProjects } from "@/lib/projects";
import { PROFILE } from "@/lib/profile";
import PostCard from "@/components/PostCard";
import ProjectCard from "@/components/ProjectCard";
import SkillTag from "@/components/SkillTag";
import ScrollReveal from "@/components/ScrollReveal";
import VisitCounter from "@/components/VisitCounter";

// See app/posts/page.tsx for why openGraph needs its own explicit title/description/images.
export const metadata: Metadata = {
  title: "소개 · chorock.page",
  openGraph: { title: "소개 · chorock.page", description: PROFILE.shortIntro, images: ["/opengraph-image"] },
};

// Without this, this page has no dynamic data source (no cookies/searchParams), so Next.js
// treats it as fully static — rendered once at build time and never refreshed again. "최근
// 글"/"최근 프로젝트" would silently go stale forever after the first build/deploy (this is the
// bug reported: DB has newer posts, /about doesn't show them). Matches the revalidate period
// already used on /posts, /posts/[slug], /projects/[slug].
export const revalidate = 300;

const SKILLS: { category: string; items: string[] }[] = [
  {
    category: "Frontend",
    items: [
      "Javascript",
      "TypeScript",
      "React",
      "Next.js",
      "React Native",
      "Tailwind CSS",
      "SCSS",
      "TanStack Query",
    ],
  },
  { category: "Backend", items: ["Node.js", "Supabase", "MongoDB"] },
  {
    category: "DevOps & Tools",
    items: [
      "Git",
      "GitHub",
      "Docker",
      "GitHub Actions",
    ],
  },
];

// TODO: 실제 경력으로 교체하세요. location/logo는 선택 항목(logo 없으면 회사명 첫 글자 placeholder).
const CAREER: {
  period: string;
  title: string;
  company: string;
  location?: string;
  logo?: string;
  description: string;
  tags: string[];
}[] = [
  {
    period: "2026.02 — 2027.02",
    title: "프론트엔드 운영진",
    company: "멋쟁이사자처럼 한국외대",
    logo: "/career/likelion-hufs.jpeg",
    description: "HTML, CSS, JS, REACT 교육 및 프로젝트 개발",
    tags: ["React.js", "Javascript"],
  },
  {
    period: "2026.03 — 2026.06",
    title: "프론트엔드 개발자",
    company: "포에이",
    logo: "/career/forA-logo.png",
    description: "forA 어플리케이션 개발 및 유지보수",
    tags: ["React Native", "Expo"],
  },
];

const CONTACT_GITHUB_URL = "https://github.com/ChoRockKim";
const CONTACT_EMAIL = "daejincnc2@gmail.com";

export default async function AboutPage() {
  const recentPosts = (await getCachedPosts()).slice(0, 3);
  const recentProjects = (await listProjects()).slice(0, 2);

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "var(--space-6)",
        animation: "pageFadeIn .5s ease both",
      }}
    >
      <ScrollReveal
        style={{
          paddingBottom: "var(--space-6)",
          borderBottom: "1px solid var(--color-divider)",
          marginBottom: "var(--space-8)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-3)",
          }}
        >
          {PROFILE.avatar ? (
            <span
              style={{
                flex: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <Image
                src={PROFILE.avatar}
                alt={PROFILE.handle}
                width={32}
                height={32}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                }}
              />
            </span>
          ) : (
            <span
              style={{
                flex: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--color-accent-100)",
                color: "var(--color-accent-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {PROFILE.handle.slice(0, 1)}
            </span>
          )}
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>
            {PROFILE.handle}
          </span>
          <span style={{ fontSize: 12.5, opacity: 0.55 }}>
            · {PROFILE.role}
          </span>
          <span style={{ marginLeft: "auto" }}>
            <VisitCounter />
          </span>
        </div>
        <h1
          style={{
            fontSize: 32,
            margin: "0 0 var(--space-2)",
            maxWidth: "28ch",
            whiteSpace: "pre-line",
          }}
        >
          {PROFILE.heading}
        </h1>
        <p style={{ fontSize: 15, opacity: 0.75, maxWidth: "54ch", margin: 0 }}>
          {PROFILE.intro}
        </p>
      </ScrollReveal>

      <div style={{ marginBottom: "var(--space-8)" }}>
        <ScrollReveal>
          <h2 style={{ fontSize: 20, margin: "0 0 var(--space-4)" }}>
            보유 기술
          </h2>
        </ScrollReveal>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {SKILLS.map((group, i) => (
            <ScrollReveal key={group.category} delay={i * 0.06}>
              <p
                className="text-muted"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--space-1)",
                }}
              >
                {group.category}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                }}
              >
                {group.items.map((item) => (
                  <SkillTag key={item} name={item} />
                ))}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-8)" }}>
        <ScrollReveal>
          <h2 style={{ fontSize: 20, margin: "0 0 var(--space-4)" }}>경력</h2>
        </ScrollReveal>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {CAREER.map((job, i) => (
            <ScrollReveal
              key={i}
              delay={i * 0.06}
              style={{
                display: "flex",
                gap: "var(--space-4)",
                padding: "var(--space-4) 0",
                borderBottom:
                  i < CAREER.length - 1
                    ? "1px solid var(--color-divider)"
                    : undefined,
              }}
            >
              {job.logo ? (
                <span
                  style={{
                    flex: "none",
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: "#fff",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src={job.logo}
                    alt={`${job.company} 로고`}
                    width={52}
                    height={52}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </span>
              ) : (
                <span
                  style={{
                    flex: "none",
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: "var(--color-accent-100)",
                    color: "var(--color-accent-700)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 18,
                  }}
                >
                  {job.company.slice(0, 1)}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, margin: "0 0 3px" }}>{job.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 2px" }}>
                  {job.company}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    opacity: 0.55,
                    margin: job.location ? "0 0 1px" : "0",
                  }}
                >
                  {job.period}
                </p>
                {job.location && (
                  <p style={{ fontSize: 12, opacity: 0.55, margin: 0 }}>
                    {job.location}
                  </p>
                )}
                {job.description && (
                  <p
                    style={{
                      fontSize: 13,
                      opacity: 0.75,
                      margin: "var(--space-2) 0 var(--space-3)",
                      maxWidth: "56ch",
                    }}
                  >
                    {job.description}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {job.tags.map((tag) => (
                    <SkillTag key={tag} name={tag} />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <ScrollReveal>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>최근 프로젝트</h2>
              <Link
                href="/projects"
                className="btn btn-ghost"
                style={{
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollReveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {recentProjects.map((project, i) => (
              <ScrollReveal key={project.slug} delay={i * 0.06}>
                <ProjectCard project={project} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      )}

      {recentPosts.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <ScrollReveal>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>최근 글</h2>
              <Link
                href="/posts"
                className="btn btn-ghost"
                style={{
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollReveal>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentPosts.map((post, i) => (
              <ScrollReveal key={post.id} delay={i * 0.06}>
                <PostCard post={post} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      )}

      <ScrollReveal
        style={{
          background: "#0f2e14",
          borderRadius: 10,
          padding: "var(--space-6)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            margin: "0 0 var(--space-3)",
            color: "#E8F5E9",
          }}
        >
          문의 &amp; 연락처
        </h2>
        <p
          style={{
            fontSize: 13.5,
            margin: "0 0 var(--space-4)",
            color: "#E8F5E9",
            opacity: 0.85,
          }}
        >
          협업이나 문의는 이메일이나 GitHub로 편하게 연락해주세요.
        </p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
        >
          <a
            target="_blank"
            href={CONTACT_GITHUB_URL}
            className="btn"
            style={{
              background: "#E8F5E9",
              color: "#1B5E20",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="btn"
            style={{
              border: "1px solid #E8F5E9",
              color: "#E8F5E9",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
              <rect
                x="32"
                y="56"
                width="192"
                height="144"
                rx="12"
                fill="currentColor"
                opacity="0.2"
              />
              <rect
                x="32"
                y="56"
                width="192"
                height="144"
                rx="12"
                stroke="currentColor"
                strokeWidth="16"
              />
              <path
                d="M40 68l88 72 88-72"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            이메일
          </a>
        </div>
      </ScrollReveal>
    </main>
  );
}
