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
};

export default nextConfig;
