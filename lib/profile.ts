// Shared between app/about/page.tsx (full intro) and components/PostAuthorCard.tsx (compact
// byline on post detail pages) so there's a single place to edit — not "server-only" since
// both a Server Component (about/page.tsx) and another Server Component (PostAuthorCard) read
// it, and it holds no secrets, just display copy.
export const PROFILE = {
  handle: "초록",
  role: "Frontend & Mobile",
  // `\n` is rendered because about/page.tsx's h1 sets `whiteSpace: "pre-line"`.
  heading: "만들고 운영까지 하는\n초록입니다.",
  intro:
    "React Native로 앱을, Next.js로 웹을 만들고 직접 운영합니다. 스토어에 올라간 앱, 학생들이 매일 쓰는 크롬 익스텐션, 그리고 이 블로그까지 — 만드는 동안보다 굴러가는 동안 배운 게 더 많았습니다. 그래서 고쳤다는 말보다 어떻게 확인했는지를 같이 적습니다.",
  // Post detail's author card is much narrower than /about's hero, so it gets its own
  // one-line version instead of truncating `intro` at render time.
  shortIntro: "앱과 웹을 만들고, 직접 운영하며 기록합니다.",
  avatar: "/profile/me.jpg",
};
