import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/posts/write", "/posts/*/edit", "/api/*"],
    },
    sitemap: "https://chorock.page/sitemap.xml",
  };
}
