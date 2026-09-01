// Shared between app/about/page.tsx (full intro) and components/PostAuthorCard.tsx (compact
// byline on post detail pages) so there's a single place to edit — not "server-only" since
// both a Server Component (about/page.tsx) and another Server Component (PostAuthorCard) read
// it, and it holds no secrets, just display copy.
export const PROFILE = {
  handle: "초록",
  role: "Frontend & Mobile",
  // `\n` is rendered because about/page.tsx's h1 sets `whiteSpace: "pre-line"`.
  heading: "만들고 운영까지 하는\n초록입니다.",
  // Deliberately carries NO numbers or project names — those live in `highlights` below, so
  // the paragraph (identity + the verification habit) and the list (scannable facts with
  // figures) each say a thing once instead of saying the same thing twice back to back. The
  // last sentence intentionally rhymes with highlights[2]: the positioning line belongs in
  // both the prose layer and the scan layer.
  intro:
    "React Native로 앱을, Next.js로 웹을 만들고 직접 운영합니다. 만드는 동안보다 굴러가는 동안 배운 게 더 많았고, 그래서 고쳤다는 말보다 어떻게 확인했는지를 같이 적습니다.",
  /**
   * Three scannable lines under `intro`. A reader who skips the paragraph still reads these,
   * which is the point — the whole page is optimised for someone skimming for a few seconds.
   * `label — detail`; about/page.tsx splits on the em dash to bold the label half, so keep the
   * " — " separator (spaced em dash) intact in every entry.
   */
  // Every entry ends in a full predicate on purpose — a bare noun phrase in the middle of the
  // three broke the parallelism. "약 140명" matches /projects/hufs-clock's own wording, and the
  // duration is a start date rather than "N개월째" so the line can't silently go stale (same
  // rule as not hardcoding post counts).
  highlights: [
    "실서비스 운영 — 스토어에 출시된 ADHD 커뮤니티 앱 forA의 프론트엔드를 맡고 있습니다",
    "혼자 끝까지 — 약 140명이 쓰는 크롬 익스텐션을 2025년 11월부터 기획·개발·배포·유지보수까지 해왔습니다",
    "검증을 남깁니다 — 고쳤다는 말로 끝내지 않고 어떻게 확인했는지 글로 씁니다",
  ],
  /** Rendered only when non-empty — clear this one string when the job hunt ends and the line
   *  disappears from /about with no other edit. */
  lookingFor: "",
  // Post detail's author card is much narrower than /about's hero, so it gets its own
  // one-line version instead of truncating `intro` at render time. Also feeds /about's
  // metadata.description, its openGraph.description and the JSON-LD Person.description in
  // app/layout.tsx — four consumers, so keep it short.
  shortIntro: "앱과 웹을 만들고, 직접 운영하며 기록합니다.",
  avatar: "/profile/me.jpg",
};

/** Lives here rather than inline in app/about/page.tsx so the contact card, components/Footer.tsx
 *  and the JSON-LD `Person` in app/layout.tsx all read one value. The GitHub URL used to be
 *  written out in two of those three places. */
export const CONTACT = {
  github: "https://github.com/ChoRockKim",
  email: "daejincnc2@gmail.com",
};
