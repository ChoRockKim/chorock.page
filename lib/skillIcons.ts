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
  // "SCSS"라는 이름으로 쓰고 있어 별칭이 필요하다. Simple Icons에는 scss 아이콘이 없고
  // sass 하나만 있으므로 같은 슬러그를 가리킨다 — 이게 없으면 SCSS 태그만 텍스트로 렌더된다.
  scss: "sass",
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

  // — 아래는 전수조사(70개)에서 아이콘이 안 붙던 이름들 —
  // Expo 생태계 패키지. 전부 Expo 아이콘으로 묶는다(개별 아이콘은 Simple Icons에 없다).
  "expo router": "expo",
  "expo securestore": "expo",
  "expo-audio": "expo",
  "expo-camera": "expo",
  "expo-image": "expo",
  "expo-notifications": "expo",
  "jest-expo": "jest", // Jest 프리셋이라 Jest 쪽이 맞다
  // React Native 계열 라이브러리. react-native 전용 아이콘은 없어서 React를 쓴다.
  "react native svg": "react",
  "react-native-svg": "react",
  "react native skia": "react",
  "react native testing library": "testinglibrary",
  "mongodb atlas": "mongodb",
  mongoose: "mongoose",
  "github oauth": "github",
  "vercel workflow": "vercel",
  "swiper.js": "swiper",
  swiper: "swiper",
  formspree: "formspree",
  // remark와 rehype는 같은 unified 계열인데 rehype 아이콘은 없다(404). 한 태그에 둘 다 적혀
  // 있기도 해서 remark 아이콘 하나로 받는다.
  "remark / rehype": "remark",
  remark: "remark",
  rehype: "remark",
  // 아이콘이 아예 없어 텍스트로 남는 이름들(전부 직접 404 확인, 추측 아님):
  // AWS EC2·AWS S3(amazon 계열 전멸), OpenAI·ChatGPT, Zustand, Auth.js, Shiki, giscus,
  // Reanimated, matter-js, AsyncStorage, Toast UI Editor, ML Kit.
  // 없는 슬러그를 넣으면 <img>가 404를 받고 onError로 사라질 뿐이라 이득이 없다.
};

/**
 * 이 맵은 정확히 일치하는 이름만 찾는다. 그런데 실제 데이터에는 같은 브랜드가 "React 19",
 * "Expo (SDK 56)", "React Native 0.86", "Supabase (Postgres·Storage)"처럼 부연이 붙은 채로
 * 들어 있어서 전부 아이콘 없이 렌더됐다(전수조사에서 70개 중 41개가 미매칭). 별칭을 하나씩
 * 더 넣는 대신 반복되는 두 패턴 — **끝에 붙는 괄호 부연**과 **끝에 붙는 버전 표기** — 을 여기서
 * 떼어낸다. 새 프로젝트를 추가하며 "React 20"이라고 써도 자동으로 잡힌다.
 */
export function normalizeSkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+(sdk\s+)?v?\d+(\.\d+)*$/, "")
    .trim();
}

/**
 * 다크모드에서 원래 브랜드색으로는 읽히지 않는 슬러그. SkillTag는 `.tag-skill`(채움이 거의
 * 없어 페이지 배경이 그대로 비친다) 위에 그려지므로, 어두운 아이콘은 다크 배경에 묻힌다.
 *
 * 기준은 "거의 검정"이라는 눈대중이 아니라 **다크 배경(--color-bg = #1b1a1d) 대비 3:1 미만**
 * 이다. 실제로 각 아이콘의 브랜드 hex를 Simple Icons에서 받아 계산해 뽑았다:
 *   remark #000000 1.13 · openjdk/nextdotjs/notion/vercel/github/expo/express/socketdotio
 *   (전부 #000000 계열) · sqlite #003B57 1.45 · mongoose #880000 1.81 · css #663399 2.06 ·
 *   eslint #4B32C3 2.10 · flutter #02569B 2.32 · axios #5A29E4 2.37 · jest #C21325 2.82
 * 새 스킬을 추가했는데 아이콘이 잘 안 보이면 같은 방법으로 대비를 재보고 여기에 넣는다.
 *
 * **재색칠은 다크모드에서만 한다.** 예전에는 테마와 무관하게 --color-text로 덮었는데, 그러면
 * axios·flutter처럼 라이트에서는 멀쩡한 색까지 검게 바뀌어 브랜드색을 이유 없이 잃는다.
 */
export const DARK_RECOLOR_ICON_SLUGS = new Set([
  "nextdotjs",
  "notion",
  "openjdk",
  "vercel",
  "github",
  "expo",
  "express",
  "socketdotio",
  "remark",
  "mongoose",
  "sqlite",
  "css",
  "eslint",
  "flutter",
  "axios",
  "jest",
]);
