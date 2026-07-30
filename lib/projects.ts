import "server-only";
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

export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
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
