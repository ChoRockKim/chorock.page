import FooterAuthLink from "@/components/FooterAuthLink";

export default function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        padding: "var(--space-6)",
        borderTop: "1px solid var(--color-divider)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ fontSize: 12, color: "var(--color-text)", opacity: 0.55 }}>
          © {new Date().getFullYear()} chorock.page
        </span>
        <FooterAuthLink />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <a
          href="https://github.com"
          style={{ color: "var(--color-text)", opacity: 0.6, display: "flex" }}
          aria-label="GitHub"
          title="GitHub"
        >
          <svg width="24" height="24" viewBox="0 0 256 256" fill="none">
            <path
              d="M128 24a104 104 0 0 0-33 202c5 1 7-2 7-5v-19c-29 6-35-13-35-13-5-12-11-15-11-15-9-6 1-6 1-6 10 1 15 10 15 10 9 15 24 11 30 8 1-7 4-11 6-14-23-3-47-12-47-52 0-11 4-21 10-28-1-3-4-13 1-27 0 0 9-3 28 10a99 99 0 0 1 52 0c19-13 28-10 28-10 5 14 2 24 1 27 6 7 10 17 10 28 0 40-24 49-48 51 4 4 7 10 7 21v31c0 3 2 6 7 5A104 104 0 0 0 128 24Z"
              fill="currentColor"
            />
          </svg>
        </a>
        <a
          href="https://linkedin.com"
          style={{ color: "var(--color-text)", opacity: 0.6, display: "flex" }}
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          <svg width="24" height="24" viewBox="0 0 256 256" fill="none">
            <rect x="28" y="28" width="200" height="200" rx="24" fill="currentColor" opacity="0.15" />
            <rect x="28" y="28" width="200" height="200" rx="24" stroke="currentColor" strokeWidth="14" />
            <circle cx="80" cy="84" r="14" fill="currentColor" />
            <path d="M80 116v76M80 116" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
            <path
              d="M124 192v-44c0-18 14-32 32-32s28 12 28 32v44"
              stroke="currentColor"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M124 116v76" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
          </svg>
        </a>
        <a
          href="https://instagram.com"
          style={{ color: "var(--color-text)", opacity: 0.6, display: "flex" }}
          aria-label="Instagram"
          title="Instagram"
        >
          <svg width="24" height="24" viewBox="0 0 256 256" fill="none">
            <rect x="28" y="28" width="200" height="200" rx="56" fill="currentColor" opacity="0.15" />
            <rect x="28" y="28" width="200" height="200" rx="56" stroke="currentColor" strokeWidth="14" />
            <circle cx="128" cy="128" r="48" stroke="currentColor" strokeWidth="16" />
            <circle cx="180" cy="76" r="10" fill="currentColor" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
