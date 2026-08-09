import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QueryProvider from "@/components/QueryProvider";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import VisitTracker from "@/components/VisitTracker";
import ScrollToTopButton from "@/components/ScrollToTopButton";

const SITE_TITLE = "chorock.page";
const SITE_DESCRIPTION = "개발 기록을 남기는 블로그";

export const metadata: Metadata = {
  // Without this, relative OG image URLs (from opengraph-image.tsx files) resolve against
  // localhost in production instead of the real domain — a common Next.js metadata gotcha.
  metadataBase: new URL("https://chorock.page"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_TITLE,
    locale: "ko_KR",
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
        <ViewTransitions>
          <VisitTracker />
          <ScrollToTopButton />
          <AuthSessionProvider>
            <QueryProvider>
              <Header />
              <div className="site-content">{children}</div>
              <Footer />
            </QueryProvider>
          </AuthSessionProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
