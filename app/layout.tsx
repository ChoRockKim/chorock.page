import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QueryProvider from "@/components/QueryProvider";
import AuthSessionProvider from "@/components/AuthSessionProvider";

export const metadata: Metadata = {
  title: "chorock.page",
  description: "개발 기록을 남기는 블로그",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AuthSessionProvider>
          <QueryProvider>
            <Header />
            <div className="site-content">{children}</div>
            <Footer />
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
