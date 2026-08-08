/**
 * name -> Simple Icons (cdn.simpleicons.org) slug, for SkillTag's automatic icon lookup.
 * Add an entry here once and every SKILLS/CAREER tag list that uses that name (any casing/
 * spacing variant listed) picks up the icon automatically. Names not listed here just render
 * as a plain tag — that's expected, not a bug.
 */
export const SKILL_ICON_SLUGS: Record<string, string> = {
  react: "react",
  "react.js": "react",
  reactjs: "react",
  "react native": "react",
  "react-native": "react",
  "next.js": "nextdotjs",
  nextjs: "nextdotjs",
  typescript: "typescript",
  javascript: "javascript",
  "vue.js": "vuedotjs",
  vue: "vuedotjs",
  "node.js": "nodedotjs",
  nodejs: "nodedotjs",
  node: "nodedotjs",
  expo: "expo",
  flutter: "flutter",
  swift: "swift",
  kotlin: "kotlin",
  java: "openjdk",
  python: "python",
  php: "php",
  html: "html5",
  html5: "html5",
  css: "css",
  css3: "css",
  "tailwind css": "tailwindcss",
  tailwindcss: "tailwindcss",
  sass: "sass",
  graphql: "graphql",

  docker: "docker",
  kubernetes: "kubernetes",
  "github actions": "githubactions",
  githubactions: "githubactions",
  // No AWS entry on purpose — Simple Icons dropped every Amazon/AWS icon (amazonaws, aws,
  // amazon-web-services all 404, confirmed against their full icon dataset, likely a
  // trademark-enforcement removal). "AWS S3"/"AWS EC2" tags fall back to text-only, same as
  // any other unlisted name — don't re-add a slug here without checking it actually resolves.
  vercel: "vercel",
  netlify: "netlify",
  nginx: "nginx",
  linux: "linux",
  terraform: "terraform",
  jenkins: "jenkins",

  mongodb: "mongodb",
  postgresql: "postgresql",
  postgres: "postgresql",
  mysql: "mysql",
  sqlite: "sqlite",
  redis: "redis",
  firebase: "firebase",
  supabase: "supabase",
  "spring boot": "springboot",
  springboot: "springboot",
  fastapi: "fastapi",
  express: "express",

  git: "git",
  github: "github",
  gitlab: "gitlab",
  figma: "figma",
  jest: "jest",
  eslint: "eslint",
  webpack: "webpack",
  vite: "vite",
  notion: "notion",
  swagger: "swagger",
  bootstrap: "bootstrap",
  axios: "axios",
  "socket.io": "socketdotio",
  "react query": "reactquery",
  "tanstack query": "reactquery",
  "react-hook-form": "reacthookform",
  "react hook form": "reacthookform",
};

export function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Simple Icons slugs whose brand color is near-black by default (checked each icon's actual
 * hex against the simple-icons dataset: nextdotjs/notion/openjdk/vercel are literal #000000,
 * github/expo/express/socketdotio are close enough to read as black). SkillTag always renders
 * on .tag-outline, which has no background fill — just the page background showing through —
 * so these read fine in light mode but become nearly invisible against dark mode's near-black
 * background. SkillTag requests these with an explicit theme-matched color override instead of
 * their default brand color; every other slug keeps its real brand color unchanged, since it
 * already has enough contrast in both themes. Add a slug here if a newly-added skill's icon
 * turns out to have the same near-black-default problem.
 */
export const MONOCHROME_ICON_SLUGS = new Set([
  "nextdotjs",
  "notion",
  "openjdk",
  "vercel",
  "github",
  "expo",
  "express",
  "socketdotio",
]);
