// Next.js shows this immediately on navigation to /posts/[slug] (client-side Link click or
// direct load), before the destination page's data is ready — without it there's zero visual
// feedback between clicking a post and the new page appearing, which is what made navigation
// feel like it wasn't responding at all (see CHANGELOG for this entry).
export default function PostDetailLoading() {
  return (
    <div className="pd-grid">
      <article className="pd-body">
        <div className="skeleton" style={{ width: 90, height: 20, marginBottom: "var(--space-4)" }} />
        <div className="skeleton" style={{ width: 120, height: 24, borderRadius: 999, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "70%", height: 34, marginBottom: "var(--space-6)" }} />
        <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "85%", height: 16, marginBottom: "var(--space-6)" }} />
        <div className="skeleton" style={{ width: "100%", height: 200 }} />
      </article>
      <div />
    </div>
  );
}
