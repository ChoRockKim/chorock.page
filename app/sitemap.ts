import type { MetadataRoute } from "next";
import { listPostSitemapEntries } from "@/lib/posts";
import { listProjectSitemapEntries } from "@/lib/projects";
import { listSeriesSitemapEntries } from "@/lib/series";

const BASE_URL = "https://chorock.page";

/**
 * **Without this the sitemap is generated once at build time and never again.** A metadata
 * route with no `revalidate` is fully static, so publishing a post did nothing to it — the
 * live sitemap sat 35 hours old and was missing the three newest posts, while /api/posts
 * (getCachedPosts, tag-invalidated on publish) already had them at 31. Google does not
 * participate in IndexNow (lib/indexnow.ts), so this file's `lastmod` IS its discovery path
 * — a post that never enters it is only found if Google happens to re-crawl a list page.
 * 300s matches every other route's window; app/api/revalidate-posts also busts it on publish
 * so a new post shows up immediately rather than up to five minutes later.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects, series] = await Promise.all([
    listPostSitemapEntries(),
    listProjectSitemapEntries(),
    listSeriesSitemapEntries(),
  ]);

  // The newest thing on the site — used as `lastModified` for the list pages, whose content is
  // exactly "the newest posts".
  const newestPost = posts.reduce<Date | undefined>(
    (max, p) => (!max || p.lastModified > max ? p.lastModified : max),
    undefined
  );

  // `/` is deliberately NOT listed: it's a permanent redirect to /about (app/page.tsx), and
  // submitting a redirecting URL is what Search Console reports as "Page with redirect".
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/about`, lastModified: newestPost, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/posts`, lastModified: newestPost, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/projects`, lastModified: newestPost, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/series`, lastModified: newestPost, changeFrequency: "weekly", priority: 0.8 },
  ];

  // Slugs can contain Korean (see CLAUDE.md's revalidatePath/generateStaticParams encoding
  // note) — sitemap URLs need the same encodeURIComponent treatment as everywhere else.
  const postRoutes: MetadataRoute.Sitemap = posts.map(({ slug, lastModified }) => ({
    url: `${BASE_URL}/posts/${encodeURIComponent(slug)}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.9,
  }));
  const projectRoutes: MetadataRoute.Sitemap = projects.map(({ slug, lastModified }) => ({
    url: `${BASE_URL}/projects/${encodeURIComponent(slug)}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const seriesRoutes: MetadataRoute.Sitemap = series.map(({ slug, lastModified }) => ({
    url: `${BASE_URL}/series/${encodeURIComponent(slug)}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes, ...seriesRoutes];
}
