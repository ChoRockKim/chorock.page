"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

/**
 * Replaces MDX's <pre> (rehype-pretty-code wraps it in <figure
 * data-rehype-pretty-code-figure>, already syntax-highlighted server-side).
 * The copy button reads textContent off the rendered <pre> via a ref
 * rather than needing the raw source threaded through as a prop.
 */
export default function CodeBlock(props: ComponentPropsWithoutRef<"pre">) {
  const { children, ...rest } = props;
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    setLang(preRef.current?.dataset.language ?? null);
  }, []);

  const onCopy = async () => {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied/unavailable — silently ignore, no feedback to show
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="code-block-dots">
            <span className="code-block-dot" style={{ background: "#ff5f57" }} />
            <span className="code-block-dot" style={{ background: "#ffbd2e" }} />
            <span className="code-block-dot" style={{ background: "#28c840" }} />
          </div>
          {lang && <span className="code-block-lang">{lang}</span>}
        </div>
        <button
          className={`code-block-copy${copied ? " copied" : ""}`}
          onClick={onCopy}
          aria-label="코드 복사"
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 256 256"
              fill="none"
              style={{ animation: "copyPopIn .35s cubic-bezier(.34,1.56,.64,1)" }}
            >
              <path
                d="M224 64 96 192l-64-64"
                stroke="currentColor"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 256 256" fill="none">
              <rect x="88" y="88" width="128" height="128" rx="12" stroke="currentColor" strokeWidth="16" />
              <path
                d="M168 88V56a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v104a8 8 0 0 0 8 8h32"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </button>
      </div>
      <pre ref={preRef} {...rest}>
        {children}
      </pre>
    </div>
  );
}
