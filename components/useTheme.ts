"use client";

import { useEffect, useState } from "react";

/**
 * Reads the site's light/dark theme off <html data-theme>, which Header
 * sets directly (localStorage + attribute, no React context). A
 * MutationObserver lets components elsewhere on the page (e.g. giscus)
 * react to the toggle without prop-drilling through the tree.
 */
export function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
