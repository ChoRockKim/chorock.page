import type { MetadataRoute } from "next";
import { listPostSlugs } from "@/lib/posts";
import { listProjectSlugs } from "@/lib/projects";
import { listSeriesWithCounts } from "@/lib/series";

const BASE_URL = "https://chorock.page";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postSlugs, projectSlugs, series] = await Promise.all([
    listPostSlugs(),
    listProjectSlugs(),
    listSeriesWithCounts(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = ["/", "/about", "/posts", "/projects", "/series"].map((path) => ({
    url: `${BASE_URL}${path}`,
  }));

  // Slugs can contain Korean (see CLAUDE.md's revalidatePath/generateStaticParams encoding
  // note) — sitemap URLs need the same encodeURIComponent treatment as everywhere else.
  const postRoutes: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${BASE_URL}/posts/${encodeURIComponent(slug)}`,
  }));
  const projectRoutes: MetadataRoute.Sitemap = projectSlugs.map((slug) => ({
    url: `${BASE_URL}/projects/${encodeURIComponent(slug)}`,
  }));
  const seriesRoutes: MetadataRoute.Sitemap = series.map((s) => ({
    url: `${BASE_URL}/series/${encodeURIComponent(s.slug)}`,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes, ...seriesRoutes];
}
