"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/useTheme";

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "General";
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

export default function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const configured = Boolean(REPO && REPO_ID && CATEGORY_ID);

  useEffect(() => {
    const container = containerRef.current;
    if (!configured || !container) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", REPO!);
    script.setAttribute("data-repo-id", REPO_ID!);
    script.setAttribute("data-category", CATEGORY);
    script.setAttribute("data-category-id", CATEGORY_ID!);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", theme);
    script.setAttribute("data-lang", "ko");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
    // giscus config attrs (repo/category) never change at runtime — re-embedding
    // only depends on the container existing, theme sync happens below instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  useEffect(() => {
    const frame = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
  }, [theme]);

  if (!configured) {
    return (
      <p style={{ fontSize: 12, opacity: 0.5, margin: "var(--space-3) 0 0" }}>
        giscus가 아직 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_GISCUS_* 값을 채워주세요 (giscus.app 참고).
      </p>
    );
  }

  return (
    <>
      <div ref={containerRef} />
      <p style={{ fontSize: 11, opacity: 0.4, margin: "var(--space-3) 0 0" }}>
        giscus로 동작하며 GitHub Discussions에 저장됩니다.
      </p>
    </>
  );
}
