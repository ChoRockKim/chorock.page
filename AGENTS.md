# AGENTS.md

이 저장소의 코딩 가이드는 **[CLAUDE.md](./CLAUDE.md)** 한 곳에만 있습니다.
Codex를 포함해 이 저장소에서 작업하는 모든 에이전트는 그 파일을 읽고 따르세요.

이 파일이 가이드 본문을 복사해두지 않는 이유: 예전에는 CLAUDE.md 전문(747줄)을
그대로 복사해두었는데, 아키텍처 노트가 계속 늘어나는 문서라 두 벌을 손으로
동기화해야 했고 실제로 어긋났습니다(복사 과정에서 "Claude"를 일괄 치환하는 바람에
"Codex Design system", "Codex.ai/code" 같은 원문에 없는 표현이 남아 있었음).
가이드를 고칠 일이 생기면 CLAUDE.md만 고치면 됩니다.

## 요약 (자세한 내용은 CLAUDE.md)

- Next.js 15 + React 19 + MongoDB Atlas(Mongoose), Vercel 배포. Tailwind·MDX 안 씀.
- 테스트 스위트가 없습니다. `npm run build`가 유일한 정합성 게이트입니다
  (Next가 빌드 중 타입 체크와 ESLint를 함께 돌리므로 빌드가 통과하면 둘 다 통과).
- 데이터 접근은 전부 `lib/`의 `"server-only"` 모듈에서만 합니다. 컴포넌트에서 직접
  모델을 쿼리하지 마세요.
- Server Action에서 사용자에게 보여줄 메시지는 `throw`가 아니라 `return { error }`로
  돌려줘야 합니다. Next가 던져진 에러를 전부 일반 문구로 마스킹합니다.
