// Shared between app/about/page.tsx (full intro) and components/PostAuthorCard.tsx (compact
// byline on post detail pages) so there's a single place to edit — not "server-only" since
// both a Server Component (about/page.tsx) and another Server Component (PostAuthorCard) read
// it, and it holds no secrets, just display copy.
// TODO: 실제 정보로 교체하세요.
export const PROFILE = {
  handle: "초록",
  role: "Frontend & Mobile",
  heading: "개발 기록을 남기는\n초록입니다.",
  intro:
    "React, Next.js, React Native, 그리고 그 사이 인프라까지 — 만들면서 부딪힌 것들을 남깁니다. 만든 것보다 만들면서 배운 것을 더 오래 기억하려고 씁니다.",
  // Post detail's author card is much narrower than /about's hero, so it gets its own
  // one-line version instead of truncating `intro` at render time.
  shortIntro: "React, Next.js, React Native로 만들고 기록합니다.",
  avatar: "/profile/me.jpg",
};
