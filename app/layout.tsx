import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ViewTransitions } from "next-view-transitions";
import "react-photo-view/dist/react-photo-view.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QueryProvider from "@/components/QueryProvider";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import VisitTracker from "@/components/VisitTracker";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import PhotoViewProvider from "@/components/PhotoViewProvider";
import JsonLd from "@/components/JsonLd";
import { PROFILE, CONTACT } from "@/lib/profile";
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL, SITE_OG_BASE, PERSON_ID } from "@/lib/siteMeta";

export const metadata: Metadata = {
  // Without this, relative OG image URLs (from opengraph-image.tsx files) resolve against
  // localhost in production instead of the real domain — a common Next.js metadata gotcha.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // No `alternates.canonical` / `openGraph.url` here on purpose: metadata is inherited
  // per top-level key, so a root-level canonical of "/" would be silently claimed by every
  // child route that doesn't override it — worse than having none. Each indexable route sets
  // its own (see lib/siteMeta.ts#canonicalPath).
  openGraph: {
    ...SITE_OG_BASE,
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    // twitter.title/description fall back to the openGraph fields above when a route sets
    // its own openGraph but not its own twitter — so only `card` needs to live here.
    card: "summary_large_image",
  },
  verification: {
    google: "B5tyxUOq9dIjYVK8Sr33euBMxjZ1sPJ-j30BPRob-nw",
    // 네이버 서치어드바이저 소유 확인 — Next metadata에 naver 전용 키는 없어서 `other`로 넣는다.
    other: { "naver-site-verification": "5f1be0089864ecb5a2b788d04e917186b6fcb583" },
  },
};

// Without this, mobile browsers render at a ~980px virtual viewport and zoom out — every
// @media (max-width: ...) rule in globals.css (nav hamburger, .pd-grid collapsing to one
// column, etc.) never actually fires on a real phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before hydration so the saved theme applies before first paint —
// otherwise Header's useEffect would flash the default light theme first.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("chorock-theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

const PRETENDARD_CSS_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css";

// React strips a raw lowercase `onload="..."` HTML attribute during SSR (confirmed — it never
// makes it into the rendered output, silently, so the classic media="print"+onload swap trick
// doesn't work in JSX). This script does the same swap via a real event listener instead — runs
// as soon as it's parsed, right after the <link> above it, so it catches the load event even if
// the stylesheet is still in flight.
const PRETENDARD_ASYNC_LOAD_SCRIPT = `
(function () {
  var link = document.getElementById("pretendard-css");
  if (!link) return;
  function activate() { link.media = "all"; }
  if (link.sheet) activate();
  else link.addEventListener("load", activate);
})();
`;

/**
 * Site-wide structured data, emitted on every page. Declared as a @graph so the Person node
 * exists exactly once under a stable @id (lib/siteMeta.ts#PERSON_ID) that post detail pages
 * can point `author`/`publisher` at by reference instead of re-inlining the whole object.
 */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      publisher: { "@id": PERSON_ID },
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: PROFILE.handle,
      url: `${SITE_URL}/about`,
      image: `${SITE_URL}${PROFILE.avatar}`,
      description: PROFILE.shortIntro,
      jobTitle: PROFILE.role,
      // The node used to stop at jobTitle. These four are the standard fields a search engine
      // reads when someone looks the person up by name, and every value here is already
      // published on /about — this only makes it machine-readable.
      email: `mailto:${CONTACT.email}`,
      sameAs: [CONTACT.github],
      knowsAbout: ["React Native", "React", "Next.js", "TypeScript"],
      worksFor: { "@type": "Organization", name: "포에이" },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* media="print" keeps this from blocking first paint (see globals.css's note on why
            it's not a plain CSS @import) — the script right after swaps it to "all" once loaded. */}
        <link id="pretendard-css" rel="stylesheet" href={PRETENDARD_CSS_URL} media="print" />
        <script dangerouslySetInnerHTML={{ __html: PRETENDARD_ASYNC_LOAD_SCRIPT }} />
        <noscript>
          <link rel="stylesheet" href={PRETENDARD_CSS_URL} />
        </noscript>
      </head>
      <body>
        <JsonLd data={SITE_JSON_LD} />
        <ViewTransitions>
          <PhotoViewProvider>
            <VisitTracker />
            <ScrollToTopButton />
            <AuthSessionProvider>
              <QueryProvider>
                <Header />
                <div className="site-content">{children}</div>
                <Footer />
              </QueryProvider>
            </AuthSessionProvider>
          </PhotoViewProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
