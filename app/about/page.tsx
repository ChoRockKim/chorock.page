import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCachedPosts } from "@/lib/posts";
import { listProjects } from "@/lib/projects";
import { PROFILE, CONTACT } from "@/lib/profile";
import { SITE_OG_BASE, SITE_OG_IMAGE } from "@/lib/siteMeta";
import PostCard from "@/components/PostCard";
import ProjectCard from "@/components/ProjectCard";
import SkillTag from "@/components/SkillTag";
import ScrollReveal from "@/components/ScrollReveal";
import VisitCounter from "@/components/VisitCounter";

// See app/posts/page.tsx for why every field the root layout sets has to be repeated here.
export const metadata: Metadata = {
  title: "소개 · chorock.page",
  description: PROFILE.shortIntro,
  alternates: { canonical: "/about" },
  openGraph: {
    ...SITE_OG_BASE,
    type: "profile",
    url: "/about",
    title: "소개 · chorock.page",
    description: PROFILE.shortIntro,
    images: SITE_OG_IMAGE,
  },
};

// Without this, this page has no dynamic data source (no cookies/searchParams), so Next.js
// treats it as fully static — rendered once at build time and never refreshed again. "최근
// 글"/"최근 프로젝트" would silently go stale forever after the first build/deploy (this is the
// bug reported: DB has newer posts, /about doesn't show them). Matches the revalidate period
// already used on /posts, /posts/[slug], /projects/[slug].
export const revalidate = 300;

// Grouped by how much the skill has actually been used, not by Frontend/Backend/DevOps. The
// old split put Docker and React at the same weight, which tells a reader nothing. `note` is
// what keeps each level from reading as a bare self-rating — it states the bar being claimed.
const SKILLS: { level: string; note?: string; items: string[] }[] = [
  {
    level: "주력",
    note: "실무와 개인 프로젝트에서 반복해서 씁니다",
    items: ["TypeScript", "JavaScript", "React", "Next.js", "React Native", "Expo"],
  },
  {
    level: "실무에서 사용",
    note: "실제 서비스에 붙여봤습니다",
    items: ["TanStack Query", "Tailwind CSS", "SCSS", "Node.js", "MongoDB"],
  },
  {
    level: "경험 있음",
    note: "필요할 때 찾아 쓰는 수준입니다",
    items: ["Supabase", "Docker", "GitHub Actions"],
  },
  { level: "도구", items: ["Git", "GitHub"] },
];

// location/logo는 선택 항목(logo가 없으면 회사명 첫 글자 placeholder가 렌더된다).
// 최신이 위로 오도록 기간 역순으로 유지할 것 — 페이지는 배열 순서를 그대로 렌더한다.
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
    period: "2026.03 — 현재",
    title: "프론트엔드 개발자",
    company: "포에이",
    logo: "/career/forA-logo.png",
    description:
      "ADHD 커뮤니티 앱 forA의 프론트엔드 개발·유지보수를 맡고 있습니다. 창업팀의 기획자·디자이너·백엔드 개발자와 한 팀으로 기능 기획부터 스토어 릴리즈까지 함께 만들어가고 있습니다.",
    tags: ["React Native", "Expo"],
  },
  {
    period: "2026.02 — 2027.02",
    title: "프론트엔드 운영진",
    company: "멋쟁이사자처럼 한국외대",
    logo: "/career/likelion-hufs.jpeg",
    description:
      "14기 프론트엔드 운영진으로 HTML·CSS·JavaScript·React 세션을 맡아 아기사자들의 학습과 프로젝트 개발을 돕고 있습니다. 애니멀리그 중앙해커톤에 팀으로 참가해 프론트엔드를 전담했고, 그 결과물이 Chrono-Derm입니다.",
    tags: ["React.js", "Javascript", "React Native"],
  },
];

// 이름·발급 기관·취득 연월만 공개한다 — 자격번호·유효기간·생년월일 같은 증서 속 정보는
// 공개 페이지에 싣지 않는다.
const CERTIFICATES: { name: string; issuer: string; date: string }[] = [
  { name: "SQLD (SQL 개발자)", issuer: "한국데이터산업진흥원", date: "2026.03" },
];

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

        {/* A real <ul> rather than styled divs — a screen reader should announce it as the
            list it is. Each entry is a two-line block: the label as a small accent kicker on
            its own line, the detail under it. The previous version put both halves on one line
            joined by an em dash, on top of a leading accent em dash — two dashes per entry, and
            once the detail wrapped (which it does at this width) the bolded label stopped
            lining up with anything, so the block read as ragged prose instead of a scan list.
            Giving the label its own line makes wrapping harmless. See PROFILE.highlights for
            why the " — " separator has to survive editing. */}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-4) 0 0",
            maxWidth: "54ch",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {PROFILE.highlights.map((line) => {
            const [label, ...rest] = line.split(" — ");
            return (
              <li key={line} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Same idiom as globals.css's .card-kicker and the project sidebar's field
                    labels, one step larger for the hero. Not that class itself — 10px is too
                    small here, and text-transform: uppercase does nothing for Hangul.
                    --color-accent-800, not --color-accent: measured against each theme's
                    --color-bg, plain accent is only 2.49:1 in light mode (#4caf50 on #f3f2f2),
                    well under the 4.5:1 that 11px text needs. accent-800 flips per theme
                    (#2e7d32 light / #a8dfae dark) and scores 4.59 / 11.41. This label is now
                    the thing a skimmer reads first, so it can't be the hardest thing to read. */}
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    color: "var(--color-accent-800)",
                  }}
                >
                  {label}
                </span>
                {rest.length > 0 && (
                  <span style={{ fontSize: 14.5, lineHeight: 1.6, opacity: 0.75 }}>
                    {rest.join(" — ")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {PROFILE.lookingFor && (
          <p
            style={{
              margin: "var(--space-4) 0 0",
              fontSize: 13.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid var(--color-accent)",
              background: "var(--color-accent-100)",
              color: "var(--color-accent-800)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--color-accent)",
                flexShrink: 0,
              }}
            />
            {PROFILE.lookingFor}
          </p>
        )}
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
            <ScrollReveal key={group.level} delay={i * 0.06}>
              <p
                style={{
                  fontSize: 12.5,
                  margin: "0 0 var(--space-1)",
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {/* No uppercase transform here, unlike the old Frontend/Backend labels — these
                    are Korean and text-transform does nothing to them but the letter-spacing
                    made them look spaced out for no reason. */}
                <span style={{ fontWeight: 600 }}>{group.level}</span>
                {group.note && (
                  <span className="text-muted" style={{ fontSize: 11.5 }}>{group.note}</span>
                )}
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

      <div style={{ marginBottom: "var(--space-8)" }}>
        <ScrollReveal>
          <h2 style={{ fontSize: 20, margin: "0 0 var(--space-4)" }}>자격증</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {CERTIFICATES.map((cert) => (
              <p
                key={cert.name}
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{cert.name}</span>
                <span className="text-muted" style={{ fontSize: 12.5 }}>
                  {cert.issuer} · {cert.date}
                </span>
              </p>
            ))}
          </div>
        </ScrollReveal>
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
            href={CONTACT.github}
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
            href={`mailto:${CONTACT.email}`}
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
