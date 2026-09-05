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
  // figures) each say a thing once instead of saying the same thing twice back to back.
  // **The verification habit lives here and only here.** `highlights` used to restate it in a
  // third entry, and sitting three lines apart it read as repetition rather than emphasis —
  // it was also the one entry with no concrete fact behind it, so it was dropped.
  intro:
    "React Native로 앱을, Next.js로 웹을 만들고 직접 운영합니다. 만드는 동안보다 굴러가는 동안 배운 게 더 많았고, 그래서 고쳤다는 말보다 어떻게 확인했는지를 같이 적습니다.",
  /**
   * Two scannable lines under `intro`. A reader who skips the paragraph still reads these,
   * which is the point — the whole page is optimised for someone skimming for a few seconds.
   * `label — detail`; about/page.tsx splits on the em dash and renders the label as a small
   * accent kicker on its own line above the detail, so keep the " — " separator (spaced em
   * dash) intact in every entry.
   *
   * Both labels are noun phrases, and both carry the fact rather than hiding it in the detail
   * half — the label is what a skimmer's eye compares first, so a vague one ("혼자 끝까지")
   * wasted the strongest position. Mixing grammatical shapes across entries (noun phrase /
   * adverbial / full sentence) is what made the old three-line version read as mush.
   *
   * The duration is a start date rather than "N개월째" so the line can't silently go stale
   * (same rule as not hardcoding post counts). The 140 figure matches /projects/hufs-clock.
   */
  highlights: [
    "실서비스 — 스토어에 출시된 ADHD 커뮤니티 앱 forA의 프론트엔드를 맡고 있습니다",
    "사용자 140명 — 크롬 익스텐션을 2025년 11월부터 혼자 기획·개발·배포·유지보수했습니다",
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
