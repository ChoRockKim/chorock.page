import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default Server Action body limit (1MB) is too small for pasted screenshots — see
  // lib/uploadImage.ts / app/posts/write/actions.ts#uploadImage. Vercel's own serverless
  // function request body cap (~4.5MB) is the real outer limit regardless of this setting,
  // which is why the action itself also rejects files over 4MB before hitting that wall.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  // lib/ogFont.ts reads public/fonts/Pretendard-Bold.otf off disk at request time, but
  // `public/` is served as static assets and is NOT bundled into serverless functions — and a
  // runtime `readFile(path.join(process.cwd(), ...))` is invisible to Next's file tracer, so
  // nothing pulls the font in on its own. The root /opengraph-image never noticed: it has no
  // dynamic params, so it's pre-rendered at build time on a machine where public/ really does
  // exist. Every per-slug OG image runs in the Lambda instead and died there with
  // `ENOENT: /var/task/public/fonts/Pretendard-Bold.otf` — a 500 on the exact route
  // app/posts/[slug]/opengraph-image.tsx's own comment warns must never 500 (link scrapers
  // fall back to the page's first <img>, i.e. the author's face). Naming the file here is what
  // actually copies it into those two functions' bundles.
  outputFileTracingIncludes: {
    "/posts/[slug]/opengraph-image": ["./public/fonts/Pretendard-Bold.otf"],
    "/projects/[slug]/opengraph-image": ["./public/fonts/Pretendard-Bold.otf"],
  },
};

export default nextConfig;
