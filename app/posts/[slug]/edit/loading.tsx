// /posts/[slug]/edit도 인증 게이트 뒤의 동적 라우트라 클릭에서 첫 페인트까지 눈에 띄는
// 공백이 있었다. loading.tsx가 없으면 그 사이 아무 반응이 없어 "눌린 건지 만 건지" 알 수 없다.
// app/posts/[slug]/loading.tsx와 같은 .skeleton 규약을 쓰되, 에디터 화면 구조에 맞췄다.
export default function EditPostLoading() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-2) var(--space-6)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div className="skeleton" style={{ width: 72, height: 30 }} />
        <div className="skeleton" style={{ width: 90, height: 30, marginLeft: "auto" }} />
        <div className="skeleton" style={{ width: 90, height: 30 }} />
      </div>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-6)" }}>
        <div className="skeleton" style={{ width: "60%", height: 38, marginBottom: "var(--space-4)" }} />
        <div className="skeleton" style={{ width: "100%", height: 18, marginBottom: "var(--space-2)" }} />
        <div className="skeleton" style={{ width: "40%", height: 18, marginBottom: "var(--space-6)" }} />
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <div className="skeleton" style={{ flex: 1, height: 420 }} />
          <div className="skeleton" style={{ flex: 1, height: 420 }} />
        </div>
      </div>
    </div>
  );
}
