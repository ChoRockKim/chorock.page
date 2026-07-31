"use client";

import { useEffect, useState } from "react";

/**
 * Reads the site's light/dark theme off <html data-theme>, which Header
 * sets directly (localStorage + attribute, no React context). A
 * MutationObserver lets components elsewhere on the page (e.g. giscus)
 * react to the toggle without prop-drilling through the tree.
 */
export function useTheme(): "light" | "dark" {
  // Lazy-initialized from the DOM (not hardcoded to "light") so the very first render already
  // has the right value — GiscusComments' embed effect reads this on mount to build the giscus
  // script's initial data-theme, and doesn't re-run once the widget exists. Starting at "light"
  // unconditionally meant a dark-mode page load always embedded giscus with the wrong theme
  // baked in, and the follow-up postMessage correction raced against (and usually lost to) the
  // giscus iframe not existing yet. Safe to read document directly in the initializer: nothing
  // in GiscusComments' JSX branches on theme (only imperative script/postMessage calls do), so
  // there's no server/client markup to mismatch — layout.tsx's THEME_INIT_SCRIPT already set
  // <html data-theme> before hydration runs, so this reads the correct value on the client's
  // first pass.
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
