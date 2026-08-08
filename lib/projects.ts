import "server-only";
import { cache } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import { ProjectModel } from "@/models/Project";

export type ProjectSummary = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  coverImage: string | null;
  coverImageFit: "cover" | "contain";
  period: string;
};

export type ProjectStackGroup = {
  label: string;
  items: string[];
};

export type ProjectDetail = ProjectSummary & {
  role: string;
  team: string;
  stack: ProjectStackGroup[];
  demoUrl: string | null;
  repoUrl: string | null;
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  overviewMd: string;
};

type ProjectLean = {
  slug: string;
  title: string;
  summary: string;
  role: string;
  team: string;
  period: string;
  tags: string[];
  stack: ProjectStackGroup[];
  overviewMd: string;
  coverImage: string | null;
  coverImageFit: "cover" | "contain";
  demoUrl: string | null;
  repoUrl: string | null;
  playStoreUrl: string | null;
  appStoreUrl: string | null;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  await connectToDatabase();

  const docs = await ProjectModel.find(
    { status: "published" },
    { slug: 1, title: 1, summary: 1, tags: 1, coverImage: 1, coverImageFit: 1, period: 1 }
  )
    .sort({ publishedAt: -1 })
    .lean<
      Pick<ProjectLean, "slug" | "title" | "summary" | "tags" | "coverImage" | "coverImageFit" | "period">[]
    >();

  return docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    tags: doc.tags,
    coverImage: doc.coverImage,
    coverImageFit: doc.coverImageFit,
    period: doc.period,
  }));
}

async function fetchProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  await connectToDatabase();

  const doc = await ProjectModel.findOne({ slug, status: "published" }).lean<ProjectLean | null>();
  if (!doc) return null;

  return {
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    role: doc.role,
    team: doc.team,
    period: doc.period,
    tags: doc.tags,
    stack: doc.stack,
    coverImage: doc.coverImage,
    coverImageFit: doc.coverImageFit,
    demoUrl: doc.demoUrl,
    repoUrl: doc.repoUrl,
    playStoreUrl: doc.playStoreUrl,
    appStoreUrl: doc.appStoreUrl,
    overviewMd: doc.overviewMd,
  };
}

/**
 * Wrapped in React's cache() so generateMetadata() and the page body (both call this with the
 * same slug during the same request) share one Mongo round-trip instead of two.
 */
export const getProjectBySlug = cache(fetchProjectBySlug);

/**
 * Same query, not cache()-wrapped — see lib/posts.ts#getPostBySlugForOg for why: React's
 * cache() only works inside a React Server Component render, and calling the cache()-wrapped
 * version from app/projects/[slug]/opengraph-image.tsx 500'd in production.
 */
export const getProjectBySlugForOg = fetchProjectBySlug;

/** Published project slugs, for generateStaticParams — pre-renders every project at build time. */
export async function listProjectSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await ProjectModel.find({ status: "published" }, { slug: 1 }).lean<{ slug: string }[]>();
  return docs.map((d) => d.slug);
}
