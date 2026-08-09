// Same rationale as app/posts/[slug]/loading.tsx / app/projects/[slug]/loading.tsx — shown
// immediately on navigation, before the destination series' data is ready.
export default function SeriesDetailLoading() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-6)" }}>
      <div className="skeleton" style={{ width: 90, height: 20, marginBottom: "var(--space-4)" }} />
      <div className="skeleton" style={{ width: "50%", height: 32, marginBottom: "var(--space-2)" }} />
      <div className="skeleton" style={{ width: "80%", height: 16, marginBottom: "var(--space-6)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) 0",
              borderBottom: "1px solid var(--color-divider)",
            }}
          >
            <div className="skeleton" style={{ flex: "none", width: 34, height: 34, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "35%", height: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
