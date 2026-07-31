// Same rationale as app/posts/[slug]/loading.tsx — shown immediately on navigation, before
// the destination project's data is ready.
export default function ProjectDetailLoading() {
  return (
    <div className="proj-grid">
      <aside className="proj-sidebar">
        <div className="skeleton" style={{ width: 90, height: 20, marginBottom: "var(--space-4)" }} />
        <div className="skeleton" style={{ width: 60, height: 12, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "80%", height: 26, marginBottom: "var(--space-3)" }} />
        <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: "var(--space-1)" }} />
        <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: "var(--space-4)" }} />
        <div className="skeleton" style={{ width: "100%", height: 36 }} />
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className="skeleton" style={{ width: "100%", aspectRatio: "16/9", marginBottom: "var(--space-6)" }} />
        <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "70%", height: 16 }} />
      </div>
    </div>
  );
}
