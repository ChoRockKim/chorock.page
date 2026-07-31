# Changelog

이 프로젝트의 주요 변경 사항을 버전(작업 단위) 별로 기록합니다. 형식은
[Keep a Changelog](https://keepachangelog.com/)를 참고합니다.

## [0.7.35] - 2026-08-01

### 이전 상태

"다크모드로 접속했을 시 giscus 댓글창이 다크모드 적용이 안 됨, 근데 라이트->다크로 바꾸면
똑같이 잘 바뀜"이라고 보고. 원인: `components/useTheme.ts`가 실제 테마와 무관하게
`useState<"light" | "dark">("light")`로 **무조건 라이트로 초기화**하고, 마운트 후
`useEffect`에서야 `<html data-theme>`를 읽어 진짜 값으로 고쳐주는 구조였음. 그런데
`GiscusComments.tsx`의 giscus 스크립트 삽입 이펙트는 `[configured]`에만 의존해서 **첫 렌더
시점의 (틀린) "light" 값을 그대로 캡처**해 스크립트를 생성해버리고, 뒤이어 진짜 값("dark")으로
바뀌었을 때 보내는 교정용 `postMessage`는 giscus iframe이 아직 만들어지기 전이라 씹혔음(누구도
안 듣고 있는 채널에 대고 메시지만 보낸 셈). 수동 토글이 잘 되던 건 그 시점엔 이미 iframe이
로드돼 있어서 postMessage가 정상 전달됐기 때문.

### Fixed

- `components/useTheme.ts`의 `useState` 초기값을 하드코딩된 `"light"` 대신, lazy
  initializer로 `<html data-theme>`를 즉시 읽어오도록 변경 — `app/layout.tsx`의
  `THEME_INIT_SCRIPT`가 하이드레이션 전에 이미 `data-theme`를 정확히 설정해두므로, 클라이언트
  첫 렌더부터 곧바로 올바른 값을 가짐. `GiscusComments`의 JSX는 `theme` 값에 따라 분기하는
  게 전혀 없고(스크립트/postMessage 같은 명령형 DOM 조작에만 씀) 서버는 애초에 이 값을 렌더링에
  안 쓰므로 하이드레이션 불일치 위험 없이 안전하게 적용 가능

### 검증

- `npx tsc --noEmit`, `npx eslint` 통과
- 브라우저에서 `localStorage.setItem("chorock-theme", "dark")`로 다크모드 저장 후 글 상세
  페이지를 **처음부터 새로** 로드 → giscus iframe의 실제 `src` 쿼리스트링 `theme` 파라미터가
  처음부터 `"dark"`인 것을 확인(수정 전이었다면 `"light"`로 박혀서 로드됐을 상황)

## [0.7.34] - 2026-08-01

### Added

- 코드 블록에 VSCode 스타일 rainbow bracket(중첩된 `()`/`[]`/`{}`를 깊이별로 다른 색으로
  표시) 적용 — `lib/markdown.ts`의 `rehypePrettyCode` 옵션에 `@shikijs/colorized-brackets`의
  `transformerColorizedBrackets()`를 `transformers`로 추가. 기존 `"github-dark"` 테마 그대로
  동작(이 트랜스포머가 모든 Shiki 내장 테마를 별도 설정 없이 지원). 이 패키지가 shiki 4.x를
  내부적으로 요구해서 `shiki`를 `^1`→`^4`로 올렸는데, `rehype-pretty-code@0.14.5`의 peer
  range(`^1 || ^2 || ^3 || ^4`)가 이미 4.x를 지원해서 다른 변경은 필요 없었음
- `.env.local.example`의 giscus 설정 안내를 auth 섹션 수준으로 보강 — 저장소 Public/Discussions
  활성화 전제조건, giscus.app에서 값 뽑는 순서, 댓글 전용 카테고리 만들기 권장 등 단계별로 정리

### 검증

- `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과
- 글쓰기 폼 실시간 미리보기(발행 없이 바로 확인 가능 — 실제 발행 글과 동일한
  `compileMarkdown()` 경로를 타므로)로 중첩 함수 호출/구조분해/배열 타입이 섞인 tsx 코드
  블록을 렌더링해, 중첩 깊이별로 브라켓 색이 실제로 다르게 나오는 것을 스크린샷으로 확인

## [0.7.33] - 2026-08-01

### 이전 상태

두 가지 버그 보고: ① "about 페이지에서 최근글 란이 db데이터랑 안 맞네?" ② "맥북모양 코드
블럭이 width가 고정되어있는 것 같음 — 모바일 화면에서 글 상세로 들어가도 데스크탑 UI가 유지되고,
글쓰기 페이지 마크다운 미리보기가 50% 넓이를 넘어서 침범함".

### Fixed

- **`/about`의 "최근 글"/"최근 프로젝트"가 DB와 안 맞던 문제**: `app/about/page.tsx`가
  `listAllPosts()`를 직접 호출하는데 이 페이지엔 `export const revalidate`가 전혀 없어서
  Next.js가 완전 정적 페이지로 취급 — **빌드 시점에 딱 한 번 렌더링되고 그 뒤로는 절대
  갱신되지 않고 있었음**(`/posts`, `/posts/[slug]`, `/projects/[slug]`는 이미 ISR인데 `/about`만
  빠져있었음). `export const revalidate = 300` 추가, `listAllPosts()` 대신 `/posts`와 캐시를
  공유하는 `getCachedPosts()`로 교체. `app/posts/write/actions.ts#revalidatePosts()`와
  `app/posts/[slug]/actions.ts#deletePost`에도 `revalidatePath("/about")` 추가해 발행/수정/삭제
  직후 5분 기다리지 않고 바로 반영되도록 함
- **코드 블록이 부모 컨테이너보다 넓어지는 문제(모바일 글 상세, 글쓰기 미리보기)**: 원인은
  `.code-block pre { overflow-x: auto }`가 코드 블록 *내부* 콘텐츠만 스크롤 처리할 뿐, 그리드
  아이템(`.pd-body`, 글쓰기 폼의 편집/미리보기 두 컬럼)들이 `min-width: auto`(그리드 아이템
  기본값)라서 코드 블록의 원래 콘텐츠 너비만큼 트랙 자체가 늘어나버리는 전형적인 CSS
  그리드/플렉스 함정이었음. `app/globals.css`의 `.pd-body`, `components/WritePostForm.tsx`의
  편집/미리보기 두 `<div>`에 `min-width: 0` 추가 — 이러면 그리드 트랙이 원래 폭대로 유지되고
  `.code-block pre`의 `overflow-x: auto`가 코드 블록 내부에서만 정상적으로 스크롤됨. 프로젝트
  상세 페이지(`app/projects/[slug]/page.tsx`)는 이미 `minWidth: 0`이 있어서 원래부터 문제
  없었음

### 검증

- `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과
- 프로덕션 빌드로 `/about` "최근 글"이 DB의 실제 최신 발행일 순서와 일치하는 것 확인
- 코드 블록에 일부러 긴 줄을 넣은 테스트 글로 확인: 글쓰기 폼에서 미리보기가 50% 폭을 넘지
  않는 것(`document.body.scrollWidth === clientWidth`), 390px 모바일 뷰포트에서 글 상세
  페이지 전체가 가로로 안 밀리고 코드 블록 내부에서만 스크롤되는 것 확인. 테스트 글은
  정리(삭제)함
- (참고) 검증 중 이번 세션 내내 테스트에 썼던 글 여러 개(`rendering-vs-commit`,
  `fiber-architecture` 등 `scripts/seed.ts`의 더미 시드 글들)가 DB에서 사라진 걸 발견함 — 이
  세션에서 실행한 정리 스크립트들은 전부 별도 슬러그를 지정해서 지운 거라 이것들과는 안
  겹침. 실제 배포 사이트를 사용자가 직접 만지면서 정리했을 가능성이 높아 보이나 확실친 않음,
  사용자에게 확인 필요

## [0.7.32] - 2026-08-01

### 이전 상태

0.7.31까지 마쳤는데도 사용자가 "클릭했는지 안 했는지 헷갈릴 정도로 느리다"고 재보고. 확인해보니
**`npm run dev`(개발 서버)로 테스트 중이었음** — 이게 결정적이었다. `next dev`는 설계상 Link
프리페치가 꺼져 있고, ISR/`generateStaticParams`로 만들어둔 정적 페이지도 dev 모드에서는 매
요청마다 처음부터 다시 렌더링한다(이번 세션 로그의 "Compiling /posts/[slug] ... Compiled in
1357ms" 같은 줄들이 그 증거) — 즉 0.7.29/0.7.31의 최적화는 실제로 유효하지만 dev 서버에서는
체감이 안 되는 게 정상. 실제 배포 사이트에서 테스트해보니 사용자가 직접 "빠릿빠릿하다"고 확인함.

다만 별개로 진짜 고칠 부분이 하나 있었음: 클릭 후 새 페이지가 뜨기 전까지 **화면에 아무 반응이
없어서** 로딩이 조금만 걸려도 클릭이 씹혔는지 헷갈리는 문제 — `app/posts/[slug]`,
`app/projects/[slug]` 어디에도 `loading.tsx`가 없었음.

### Fixed

- `app/posts/[slug]/loading.tsx`, `app/projects/[slug]/loading.tsx` 추가 — Next.js App Router가
  라우트 이동 즉시(데이터 준비 전) 자동으로 보여주는 스켈레톤. 각 상세 페이지의 실제 레이아웃
  (`.pd-grid`/`.proj-grid`)과 비슷한 회색 블록으로 구성해 레이아웃 시프트를 최소화
- `app/globals.css`에 재사용 가능한 `.skeleton` 클래스(펄스 애니메이션, `prefers-reduced-motion`
  대응) 추가

### 검증

- `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과 — 두 라우트 모두 정상 생성 확인
- 사용자가 실제 배포 사이트에서 직접 체감 속도 확인(빠름) — 이번 항목의 핵심 진단이 맞았음을
  확인
- dev 서버에서 새 라우트 첫 진입 시 스켈레톤이 있는 상태로 정상 렌더링되는 것 확인(구체적인
  타이밍 캡처는 브라우저 자동화 스크린샷 타이밍상 매번 재현되진 않았지만, Next.js의
  `loading.tsx` 파일 컨벤션은 별도 설정 없이 항상 적용되는 프레임워크 표준 동작)

## [0.7.31] - 2026-07-31

### 이전 상태

0.7.29의 서버사이드 지연 수정 이후에도 사용자가 여전히 느리다고 보고하며 `/projects`에 대한
실제 Lighthouse 리포트(Performance 69, LCP 3.8초)를 첨부. Explore 에이전트로 조사한 결과,
리포트가 `next dev`(개발 서버) 대상이라 "unused JS 635 KiB", "legacy JavaScript", "총 페이로드
3.7MB", "back/forward cache 차단 4건" 등은 dev 서버 특유의 노이즈(압축/트리셰이킹 미적용,
Fast Refresh용 WebSocket 연결)로 확인됨. 반면 아래 3가지는 dev/prod 무관하게 실제로 느린
원인으로 확정:
1. `components/ProjectCard.tsx`가 모든 카드 이미지(첫 번째 카드 포함)에 무조건
   `loading="lazy"`를 걸어놔서, 화면 첫 진입 시 곧바로 보이는 LCP 후보 이미지의 요청 자체가
   지연됨(Lighthouse의 "LCP request discovery").
2. 프로젝트 커버 이미지가 `next/image` 없이 순수 `<img>` — 이전 세션(0.7.x)에서 "arbitrary
   external URL이라 next/image 전환은 보류"라고 판단했었는데, 이번에 `scripts/seed-projects.ts`로
   직접 재확인해보니 실제로는 전부 로컬 `/public/projects/...` 경로였음(판단 착오였음을 확인).
3. `app/globals.css` 최상단의 `@import url("https://cdn.jsdelivr.net/.../pretendard.css")`가
   **모든 페이지**의 첫 렌더링을 막고 있었음("Render-blocking requests — 310ms").

### Fixed

- `components/ProjectCard.tsx`, `app/projects/[slug]/page.tsx`의 커버 이미지를 `next/image`로
  전환(로컬 자산이라 `next.config.ts` 수정 불필요) — 자동 포맷 협상, 반응형 `sizes`, 첫 번째
  카드/상세 페이지 대표 이미지는 `priority`로 즉시 로드, 나머지는 기본 lazy 유지
- `app/projects/page.tsx`가 목록의 첫 번째 프로젝트에만 `priority`를 넘기도록 수정
- `package.json`에 `sharp` 의존성 추가 — Vercel 아닌 환경에서 self-host할 경우 Next.js
  이미지 최적화가 이 패키지를 필요로 함(Vercel 배포 시엔 자체 최적화 인프라를 쓰므로 불필요,
  배포처 확정 시 재확인 필요)
- `app/globals.css`의 렌더링 차단 `@import` 제거, `app/layout.tsx`에 `media="print"` +
  로드 완료 시 `media="all"`로 전환하는 스크립트로 폰트 스타일시트를 비동기 로딩으로 전환.
  **처음엔 raw HTML `onload="..."` 속성(소문자, React의 `onLoad`가 아님)으로 시도했는데 React가
  SSR 시 이 속성을 조용히 제거해버려서(`curl`로 실제 응답 HTML을 떠서 확인) 전혀 동작하지
  않는 걸 뒤늦게 발견** — `<script>` 태그로 `link.addEventListener("load", ...)`를 직접 붙이는
  방식으로 교체해 해결

### 검증

- `npx tsc --noEmit`, `npx eslint`, `npm run build` 통과
- 프로덕션 빌드(`next start`)로 브라우저에서 확인: 첫 번째 프로젝트 카드 이미지가
  `loading="auto"`(우선 로드)로, 나머지는 `loading="lazy"`로 서빙되는 것을 `next/image`가
  생성한 `/_next/image?...` URL과 함께 확인
- 폰트 비동기 로딩 수정 후 `document.fonts`에 Pretendard 관련 `@font-face` 9개가 정상
  등록되고 `link.media`가 `"print"`→`"all"`로 실제 전환되는 것 확인(수정 전에는 계속
  `"print"`로 남아있어 폰트가 전혀 적용 안 되고 있었음)
- `contain`/`cover` 두 가지 `coverImageFit` 케이스(ForA, 외대종강시계) 모두 정상 렌더링,
  프로젝트 상세 페이지 우측 콘텐츠 스크롤 페이드인 정상 동작 확인

## [0.7.30] - 2026-07-31

### Added

- 존재하지 않는 URL 접속 시 뜨던 Next.js 기본 404 화면을 사이트 디자인에 맞춘
  `app/not-found.tsx`로 교체 — "404" 라벨, 안내 문구, 가운데 정렬된 "홈으로 이동"
  버튼(`/`로 이동, 곧바로 `/about`으로 리다이렉트됨). 헤더/푸터는 루트 레이아웃이 그대로
  감싸므로 다른 페이지들과 동일한 크롬을 유지함
- `app/projects/[slug]/page.tsx`의 우측 콘텐츠(대표 이미지, 사용 기술, 프로젝트 개요)를
  `components/ScrollReveal.tsx`(소개 페이지에서 쓰던 것과 동일한 컴포넌트)로 감싸 스크롤 시
  순서대로 페이드인되도록 함
- `components/ProjectCard.tsx`의 태그 목록을 최대 3개까지만 보여주고 나머지는 `+N` 형태의
  개수로 표시 — 태그가 많은 프로젝트 카드가 번잡해 보이는 문제 해결

## [0.7.29] - 2026-07-31

### 이전 상태

사용자가 "글 리스트에서 글 눌러서 상세 페이지 이동할 때랑, 프로젝트 리스트에서 플젝 눌러서
상세로 이동할 때, 반응 시간이 너무 오래걸리는데 원인 파악"이라고 요청. 두 개의 Explore
에이전트로 조사한 결과 원인은 셋:
1. `generateMetadata()`와 페이지 본문이 같은 slug로 각각 독립적으로 DB를 조회(요청당 2배).
2. `/posts/[slug]`가 소유자 전용 "수정"/"삭제" 버튼 노출을 위해 `auth()`를 호출하고 있어서
   `/posts`/`/projects`/`/about`/`/series`와 달리 캐싱(ISR) 없이 매번 새로 렌더링됨 — 가장
   큰 영향.
3. `getSeriesNav()`가 이미 가진 글을 slug로 또 조회(같은 문서를 세 번째로 조회하는 셈).

같은 대화에서 이어서 "모바일로 접속했을 때, 글 상세페이지는 모바일 레이아웃 적용안됨"과
"글의 코드 블록 배경이 어두운데, 내부 글자도 검은색이라서 읽을 수 없는 문제"도 함께 제기됨 —
브라우저로 재현해 원인 확정 후 같이 수정.

### Fixed

- `lib/posts.ts#getPostBySlug`, `lib/projects.ts#getProjectBySlug`를 React `cache()`로 감싸
  `generateMetadata()`/페이지 본문의 중복 DB 조회 제거.
- `lib/posts.ts#getSeriesNav`를 `(currentSlug, seriesId)`를 직접 받도록 시그니처 변경 —
  `getPostBySlug`가 이제 `seriesId`도 함께 반환하므로 같은 글을 slug로 재조회할 필요 없음.
- `app/posts/[slug]/page.tsx`에서 `auth()` 호출 제거, 소유자 전용 "수정"/"삭제" 버튼을
  `components/PostOwnerActions.tsx`(신규, client, `useSession()` 사용 —
  `FooterAuthLink`/`WritePostLink`와 동일 패턴)로 분리. `export const revalidate = 300` +
  `generateStaticParams()`(`lib/posts.ts#listPostSlugs()`) 추가해 `/posts`처럼 ISR로 전환.
- `app/projects/[slug]/page.tsx`도 동일하게 `export const revalidate = 300` +
  `generateStaticParams()`(`lib/projects.ts#listProjectSlugs()`) 추가 — 원래 소유자 전용 UI가
  없어 auth() 의존 자체가 없었으므로 더 간단하게 적용.
- `models/Post.ts`에 `{ status: 1, tags: 1, publishedAt: -1 }` 복합 인덱스 추가 —
  `getRelatedPosts()` 쿼리를 온전히 커버.
- `app/posts/write/actions.ts#revalidatePosts()`와 `app/posts/[slug]/actions.ts#deletePost`가
  이제 `/posts` 목록뿐 아니라 저장/삭제된 글 자신의 상세 경로도 `revalidatePath`로 무효화 —
  안 하면 글 상세가 ISR로 캐싱되기 시작한 이번 변경 때문에 발행/수정/삭제 직후에도 5분 창이
  지날 때까지 옛 내용을 보여주게 됨. **비ASCII(한글) slug는 `encodeURIComponent`로 인코딩해서
  넘겨야 함** — `revalidatePath`는 실제 요청 경로(퍼센트 인코딩된 형태)로 캐시 키를 잡는 반면
  `generateStaticParams`는 디코딩된 문자열을 그대로 받는다는 걸 실제로 재현해서 확인함(인코딩
  없이 넘기면 조용히 무효화가 안 되고, 다음 빌드 전까지 옛 내용이 계속 보임).
- `app/layout.tsx`에 `export const viewport`(`width: "device-width", initialScale: 1`) 추가 —
  이게 통째로 없어서 모바일 브라우저가 기본 가상 뷰포트(~980px)로 축소 렌더링하고 있었고,
  그 결과 `.pd-grid`의 `@media (max-width: 900px)` 같은 반응형 규칙이 실기기에서 전혀
  발동하지 않고 있었음(사이트 전체에 영향, 2단 그리드인 글 상세에서 가장 눈에 띔).
- `app/globals.css`의 `.code-block pre`에 기본 텍스트 색(`#d4d4d8`) 추가 — 언어 태그 없는
  코드 펜스(예: ` ``` ` 뒤에 바로 텍스트)는 `rehype-pretty-code`가 토큰 하이라이팅을 아예
  적용하지 않아 `<pre><code>`에 색상 스타일이 전혀 없는 채로 렌더링되고, 라이트 모드의 어두운
  본문 텍스트색을 그대로 상속해 항상 어두운 코드 블록 배경 위에서 안 보이는 문제였음. 언어가
  지정된 블록은 토큰별 inline `style="color:..."`가 이 규칙보다 우선하므로 영향 없음(실제
  `rendering-vs-commit` 글의 tsx 블록으로 하이라이팅 정상 확인).

### 검증

- `npm run build` 통과, `/posts/[slug]`·`/projects/[slug]` 모두 `●`(SSG,
  `generateStaticParams` 사용)로 전환 확인. 한글 슬러그도 `.next/server/app/posts/*.html`에
  정상적으로 디코딩된 파일명으로 프리렌더된 것 확인.
- 브라우저에서 로그인 상태로 상세 페이지의 "수정"/"삭제" 버튼 정상 노출·동작, 시리즈
  이전글/다음글 내비게이션 정상 확인.
- 한글 슬러그 테스트 글로 발행→수정(2회)까지 진행하며 `curl`로 직접 확인 — 인코딩 수정 전에는
  수정해도 상세 페이지가 계속 옛 내용을 보여줬고, `encodeURIComponent` 추가 후에는 즉시
  반영됨. 테스트 글은 정리(삭제)함.
- 브라우저 창을 390px로 좁혀 글 상세가 실제로 1단 레이아웃(TOC 아코디언, 헤더 햄버거 메뉴)으로
  전환되는 것 확인.
- 라이트 모드에서 언어 미지정 코드 블록의 텍스트가 읽히는 것, 언어 지정 코드 블록(tsx)의
  하이라이팅이 그대로인 것 확인.

## [Unreleased] — 다음에 할 일

- Home 페이지 구현 (글 목록 0.4.0, 시리즈 0.6.0, 소개 0.7.0, 프로젝트 0.7.7, 인증 게이트
  0.7.20, 새 글 작성 0.7.22에서 완료됨)
- GitHub OAuth 로그인은 로컬 개발 환경에서 실제 발급받은 OAuth App으로 동작 확인 완료(0.7.21).
  프로덕션(Vercel) 배포 시에는 콜백 URL이 다른 별도 OAuth App을 새로 발급하고 그 값을 Vercel
  환경변수에 등록해야 함(CLAUDE.md의 auth 섹션 참고) — 아직 안 함
- 글 수정(`/posts/[slug]/edit`, 0.7.28)과 삭제(0.7.27)는 완료됨. 여러 초안을 목록으로
  보여주는 페이지는 아직 없음(초안은 `?slug=` URL을 기억해야만 이어쓰기 가능)
- 이미지 업로드는 `/posts/write`에서도 여전히 마크다운 이미지 URL을 수동으로 채워 넣는
  방식(S3 등 실제 업로드 미구현, 아래 항목 참고)
- `app/about/page.tsx`의 `CAREER`/`CONTACT_GITHUB_URL`/`SKILLS`는 실제 내용으로 교체 완료.
  `PROFILE`(헤딩/소개 문구)은 아직 placeholder — `// TODO` 주석 위치 참고
- `/posts`가 지금은 게시글 전체를 한 번에 클라이언트로 내려보내고 필터/페이지네이션을
  클라이언트에서 처리(0.5.0 참고) — 글이 수백 개 이상으로 늘어나면 다시 서버 페이지네이션
  검토 필요 (그때는 `lib/posts.ts`의 `listPosts`/`getAllTags`/`countPublishedPosts`를
  재사용하면 됨, 지금도 남겨뒀음)
- forum의 `comments`(실제 DB 저장 댓글) 데이터는 이번에 의도적으로 이전하지 않음 — giscus 구조상
  자동 이전 불가. 보존하고 싶다면 별도 정적 아카이브 페이지 방식으로 재검토 필요
- MongoDB Atlas Network Access 설정 확인 (Vercel에서 접속 가능해야 함, 사용자가 직접 진행 필요)
- giscus GitHub Discussions 연동 값 발급 및 `.env.local` 반영 (사용자가 직접 진행 필요)
- Vercel 프로젝트 생성 및 배포, 환경 변수 등록 (사용자가 직접 진행 필요)
- 테스트 하네스(Vitest 등) 도입 여부 결정 — 아직 테스트 스위트 없음
- `.claude/settings.json`에 추가한 PostToolUse(ESLint) hook은 세션 시작 시 `.claude/` 디렉터리가
  없어 아직 워처에 반영되지 않음 — `/hooks` 실행 또는 세션 재시작 후 적용 확인 필요
- 이미지 업로드 기능(WritePost) 구현 시 forum의 S3 자격증명(`S3_ACCESS_KEY`/`S3_ACCESS_SECRET_KEY`,
  버킷 `nodeblogforum0530`, 리전 `ap-southeast-2`)을 가져올지 새 버킷을 팔지 결정 필요
- migrate-from-forum이 만든 게시글의 `coverImage` 필드는 저장만 하고 목록/상세 어디에도 아직
  렌더링하지 않음

## [0.7.28] - 2026-07-31

### 이전 상태

사용자가 "글쓰기 버튼도 로그인해서 나인게 확인되었을 때만 뜨게 하고, 글 수정 기능도
추가하자"고 요청. `/posts`의 "새 글 작성" 버튼은 로그인 여부와 무관하게 항상 보였고(클릭하면
미들웨어가 로그인 페이지로 리다이렉트하긴 하지만, 소유자가 아닌 방문자에게도 버튼 자체는
노출됨), 글 상세의 "수정" 버튼은 존재하지 않는 `/posts/[slug]/edit`로 링크만 걸려 있어 404였음.

### Added

- `components/WritePostLink.tsx`(신규, client) — `useSession()`으로 로그인(소유자) 여부를
  확인해 로그인 상태에서만 "새 글 작성" 버튼을 렌더링. `app/posts/page.tsx`는 `export const
  revalidate = 300`로 ISR 유지 중이라 여기에 서버사이드 `auth()`를 직접 넣으면 쿠키를 읽어
  페이지 전체가 dynamic으로 강제 전환됨(`FooterAuthLink`를 client component로 뺐던 것과 동일한
  이유, 0.7.20 참고) — 그래서 `app/posts/page.tsx`의 고정 `<Link>`를 이 컴포넌트로 교체
- `app/posts/[slug]/edit/page.tsx`(신규) — `getPostForEditing(slug)`로 글을 찾고 없으면
  `notFound()`, 있으면 `<WritePostForm mode="edit" .../>` 렌더링. `/posts/write`와 완전히
  같은 폼을 재사용(마크다운 툴바, 실시간 미리보기, 태그/시리즈 자동완성 전부 그대로 적용됨)
- `components/WritePostForm.tsx`에 `mode: "write" | "edit"` prop 추가 — edit 모드는
  이미 발행된 글만 다루므로(초안은 공개 상세 페이지 자체가 없어 "수정" 버튼을 달 곳이 없고
  `/posts/write?slug=`로만 이어쓰기 가능) "임시 저장" 버튼을 아예 숨기고 "발행하기"를
  "저장"으로 라벨만 바꿔 기존 `publishPost` 액션을 그대로 재사용. `upsertPost()`가
  이미-발행된 글에 `publishPost`를 다시 호출해도 `publishedAt`을 건드리지 않고 필드만
  갱신하도록 되어 있어(0.7.22에서 만든 draft→published 전환 감지 로직) 별도 액션 없이 안전하게
  재사용 가능 — 반대로 "임시 저장"(`saveDraft`, status:"draft")을 이미 발행된 글에 썼다면
  의도치 않게 unpublish되므로 edit 모드에서 그 버튼 자체를 없앤 것이 핵심

### 검증

- `npx tsc --noEmit`, `npx eslint` 통과
- 브라우저에서 로그인 상태로 `/posts` 접속 시 "새 글 작성" 버튼이 나타나는 것 확인(세션 확인
  전 잠깐 안 보였다가 나타남 — `useSession()`이 마운트 후 `/api/auth/session`을 호출하는
  구조라 예상된 동작)
- 테스트 글을 발행 → 상세 페이지 "수정" 클릭 → `/posts/[slug]/edit`로 정상 이동, 기존
  제목/요약/본문이 폼에 그대로 채워지는 것, "임시 저장" 버튼이 없고 "저장" 버튼만 있는 것
  확인 → 본문을 고쳐서 "저장" → 같은 슬러그의 상세 페이지로 돌아가 수정 내용이 반영된 것,
  발행 상태가 유지된 것 확인. 테스트 글은 정리(삭제)함

## [0.7.27] - 2026-07-31

### 이전 상태

글 상세 페이지의 "삭제" 버튼은 로그인 시에만 보이는 자리표시자였고 클릭해도 아무 동작이
없었음(0.7.20 인증 게이트 도입 당시부터 남아있던 TODO).

### Added

- `app/posts/[slug]/actions.ts`(신규) — `deletePost(slug)` 서버 액션. `write/actions.ts`와
  같은 패턴으로 `auth()` 세션 확인(`requireOwner`) 후 `PostModel.deleteOne({ slug })`,
  삭제된 문서가 없으면 에러를 던짐. 성공 시 `revalidateTag("posts")` +
  `revalidatePath("/posts")`로 목록 캐시도 함께 무효화(0.7.26에서 발행/수정에 붙인 것과 동일한
  이유 — 안 하면 삭제된 글이 캐시 만료 전까지 목록에 계속 보임)
- `components/DeletePostButton.tsx`(신규, client) — `window.confirm()`으로 삭제 여부를 먼저
  확인한 뒤 `deletePost()` 호출, 성공하면 `/posts`로 이동, 실패하면 `window.alert()`로 에러
  메시지 표시
- `app/posts/[slug]/page.tsx`의 "삭제" 자리표시자 버튼을 `<DeletePostButton slug={post.slug} />`로 교체

### 검증

- `npx tsc --noEmit`, `npx eslint` 통과
- 브라우저에서 새 글을 발행해 상세 페이지에 "삭제" 버튼이 정상 렌더링되는 것까지 확인. 실제
  클릭(브라우저 네이티브 confirm 다이얼로그 발생)은 자동화 도구로 직접 트리거하지 않는 게
  안전 원칙이라 수행하지 않았고, 테스트 글은 DB에서 직접 정리함 — `deletePost` 자체는
  `write/actions.ts`의 기존 삭제-무관 로직(인증 확인, 캐시 무효화)과 동일한 패턴이라 별도
  리스크 없음

## [0.7.26] - 2026-07-30

### 이전 상태

사용자가 "새 글을 썼을 때 새로고침 되는 주기가 너무 긴가? db에 새 글을 올렸는데 계속
fetching이 안됨, 캐시타임이 어케 됨?"이라고 보고함. 원인: `lib/posts.ts#getCachedPosts`는
`unstable_cache(..., { revalidate: 300, tags: ["posts"] })`로 5분 시간 기반 캐시를 쓰고
있는데, `app/posts/write/actions.ts`의 `saveDraft`/`publishPost` 어디에도
`revalidateTag`/`revalidatePath` 호출이 없었음 — 즉 새 글을 발행해도 이 캐시를 무효화하는
코드가 애초에 존재하지 않았고, `/posts` 목록은 5분 시간창이 자연스럽게 지날 때까지 그대로
묵은 데이터를 서빙하고 있었음(0.5.0에서 캐싱을 도입할 때 on-demand invalidation을 같이
넣었어야 했는데 누락됨).

### Fixed

- `app/posts/write/actions.ts`에 `revalidatePosts()` 헬퍼 추가 — `upsertPost()`가 성공적으로
  글을 생성/수정한 직후 `revalidateTag("posts")`(`/api/posts`가 읽는 `getCachedPosts`의
  캐시 항목)와 `revalidatePath("/posts")`(`/posts` 페이지 자체의 ISR 캐시)를 함께 호출해
  발행/수정 즉시 목록에 반영되도록 함

### 검증

- 브라우저에서 새 글을 발행한 직후 `/posts`로 이동 → 새 글이 목록 최상단에 바로 나타나는 것
  확인(이전에는 캐시가 만료될 때까지 안 보였음). 테스트 글은 정리(삭제)함
- `npx tsc --noEmit`, `npx eslint app/posts/write/actions.ts` 통과

## [0.7.25] - 2026-07-30

### 이전 상태

사용자가 "글 작성이 제대로 안 되는 것 같은데 db에 post 요청 보내는거 맞음?"이라고 보고함.
서버 로그로 재현한 결과: 요청 자체는 정상적으로 DB까지 감(`POST /posts/write` 확인됨).
문제는 `Post` 스키마가 `summary`/`content`를 필수로 요구하는데(초안이라도 예외 없음),
제목만 입력하고 "임시 저장"을 누르면 Mongoose `ValidationError`가 발생하고, 이 에러를
`WritePostForm.tsx`의 `handleSaveDraft`/`handlePublish`가 `try { ... } finally { ... }`로만
감싸고 있어서(catch 없음) 완전히 삼켜짐 — 화면에는 상태 라벨("작성 중")이 그대로 남고
아무 피드백도 없어 "아무 반응이 없다"로만 보였음.

### Fixed

- `app/posts/write/actions.ts#upsertPost`에 제목/요약/본문 각각에 대한 사전 검증을 추가해
  Mongoose까지 가기 전에 "요약을 입력해주세요." 같은 명확한 한글 메시지로 실패하도록 함
- `components/WritePostForm.tsx`에 `saveError` 상태 추가, `handleSaveDraft`/`handlePublish`에
  `catch`를 붙여 실패 시 상단 sticky 바에 빨간 글씨로 에러 메시지를 표시(성공 시 자동으로 지워짐)

### 검증

- 브라우저에서 제목만 입력 후 "임시 저장" 클릭 → "요약을 입력해주세요." 표시 확인, 요약만
  채우고 다시 클릭 → "본문을 입력해주세요."로 갱신 확인, 본문까지 채우고 클릭 →
  `?slug=`로 URL이 바뀌며 정상 저장되는 것 확인. 테스트 글은 정리(삭제)함
- `npx tsc --noEmit` 통과

## [0.7.24] - 2026-07-30

### 이전 상태

0.7.23에서 태그 입력에 자동완성을 붙였는데, 시리즈는 여전히 `<select>`로 전체 시리즈
목록을 드롭다운으로만 골라야 했음(직접 타이핑 불가, 새 시리즈를 만들려면 이 폼 밖에서
별도로 만들어야 함).

### Added

- `components/WritePostForm.tsx`의 시리즈 선택을 태그와 같은 자동완성 입력으로 교체 — 포커스
  시 전체 시리즈 목록을(입력이 있으면 부분일치로 필터링) 최대 6개까지 보여주고 클릭하면 선택,
  기존 시리즈 제목과 정확히 일치하지 않는 텍스트를 입력하면 "새 시리즈로 생성됨" 힌트를 보여줌
- `app/posts/write/actions.ts`에 `resolveSeriesId()` 추가 — `SavePostInput`에 `seriesId`(선택된
  기존 시리즈)와 `newSeriesTitle`(일치하는 시리즈가 없을 때의 입력 텍스트) 두 필드를 받아,
  `newSeriesTitle`이 있으면 제목으로 먼저 조회해 있으면 재사용(같은 글을 여러 번 저장해도
  클라이언트가 들고 있는 오래된 `seriesOptions` 때문에 중복 생성되지 않도록) 없으면
  `uniqueSlug()`와 같은 패턴(`uniqueSeriesSlug()`)으로 슬러그 중복을 피해 새 `Series` 문서를
  생성

### 검증

- 브라우저에서 `/posts/write` 시리즈 입력창 포커스 시 기존 시리즈 목록이 뜨는 것, 클릭 시
  정상 선택되는 것 확인
- 존재하지 않는 임의의 시리즈 이름을 입력하면 "새 시리즈로 생성됨" 힌트가 뜨는 것을 확인하고
  실제로 임시 저장 → 새로고침 후 그 이름이 (이제는 힌트 없이) 정확히 일치하는 기존 시리즈로
  다시 채워지는 것을 확인해 DB에 `Series` 문서가 실제로 생성/연결되었음을 검증. 이후 테스트
  글/시리즈는 정리(삭제)함
- `npm run build` 통과

## [0.7.23] - 2026-07-30

### 이전 상태

태그를 별도 컬렉션으로 정규화(Post가 tagId 배열만 참조)하는 안을 사용자가 제안했으나,
논의 후 보류 — MongoDB에서 태그처럼 낮은 카디널리티의 데이터는 문서에 배열로 넣는 게 정석이고
(지금 구조), `getAllTags()` 집계로 이미 "현재 태그 목록"은 뽑히고 있어 정규화의 실익이
join/정합성 비용 대비 작다고 판단. 대신 사용자가 제안한 더 가벼운 대안 — 글쓰기 폼에서 기존
태그로 자동완성, 없는 태그는 입력만 하면 바로 새 태그로 추가 — 를 구현.

### Added

- `lib/posts.ts#listDistinctTags()` — 상태(초안/발행) 무관 전체 글의 distinct 태그 목록.
  기존 `getAllTags()`(발행글만 집계, 나중에 태그 브라우징 공개 페이지용으로 남겨둔 것)와는
  별개로 둠 — 글쓰기 폼은 초안에서만 쓴 태그도 자동완성에 나와야 하므로
- `app/posts/write/page.tsx`에서 `listDistinctTags()`를 가져와 `WritePostForm`에 `allTags`로 전달
- `components/WritePostForm.tsx`의 태그 입력에 자동완성 드롭다운 추가 — 입력한 글자를 포함하는
  기존 태그(이미 붙은 태그는 제외) 최대 6개를 보여주고 클릭하면 바로 추가. 목록에 없는 문자열을
  입력하고 Enter를 누르면 그대로 새 태그로 추가(태그가 문자열 배열이라 "생성"은 이미 되던
  동작 — 자동완성 UI만 새로 생김). 드롭다운 클릭이 input의 blur보다 먼저 처리되도록
  `onMouseDown`+`preventDefault`로 구현(클릭 시 드롭다운이 blur로 먼저 사라지는 경쟁 상태 방지)

### 검증

- 브라우저에서 `/posts/write`에 접속해 태그 입력창에 "Rea" 입력 → "React"/"React Native"
  드롭다운이 뜨고 클릭 시 정상 추가되는 것, 목록에 없는 임의 문자열을 입력 후 Enter 시
  새 태그로 바로 추가되는 것 확인
- `npm run build` 통과

## [0.7.22] - 2026-07-30

### 이전 상태

인증 계층이 갖춰졌으니 실제 "새 글 작성" 기능을 붙일 차례. 사용자가 Claude Design에
`WritePost.dc.html`로 초안을 잡아둬서 fetch해서 확인 후 구현.

### Added

- `lib/series.ts#listSeriesOptions()` — 발행글 수와 무관하게 전체 시리즈 목록(글쓰기 폼의
  시리즈 select용)
- `lib/posts.ts#getPostForEditing()` — `getPostBySlug`와 달리 status 필터 없이(초안 포함)
  slug로 글 조회, 초안 이어쓰기 전용
- `app/posts/write/actions.ts`(신규, Server Actions): `previewMarkdown`(실제
  `compileMarkdown`/`estimateReadTime`를 그대로 돌려서 JSX와 읽는 시간을 반환 — Server
  Action이 `CodeBlock` 같은 클라이언트 컴포넌트가 섞인 JSX를 그대로 반환할 수 있는 걸
  실제로 확인), `saveDraft`/`publishPost`(slug 있으면 upsert, 없으면
  `slugify(title)`+중복 시 자동 번호 접미사로 신규 생성)
- `components/WritePostForm.tsx`(신규, 클라이언트) — 제목/요약(디자인에 없던 걸 사용자
  선택으로 추가)/태그/시리즈/본문 마크다운 툴바(H1·굵게·기울임·취소선·인용구·목록·링크·
  이미지·코드)/실시간 미리보기(디바운스 400ms로 `previewMarkdown` 호출)/임시저장·발행 버튼.
  저장 성공 시 `history.replaceState`로 `?slug=`를 URL에 반영(뒤로가기 대응 아니라 새로고침
  시 이어쓰기 대응 — `PostsListClient`의 `syncUrl`과 같은 패턴), 발행 성공 시 실제
  `/posts/[slug]`로 이동
- `app/posts/write/page.tsx` 재작성 — `?slug=` 있으면 `getPostForEditing`으로 기존 초안을
  불러와 폼 초기값으로 채움
- `app/globals.css`에 `.wp-title`/`.wp-body`/`.wp-toolbar-btn`/`.wp-toolbar-divider` 추가

### 검증

- `npm run build` 통과
- 브라우저에서 실제로 글 작성 → 미리보기에 진짜 `CodeBlock`(복사 버튼 포함)/인용구/굵게/
  인라인 코드가 정확히 렌더링되는 것 확인 → "임시 저장" → URL이 `?slug=...`로 바뀌는 것,
  새로고침해도 제목/요약/태그/본문이 그대로 복원되는 것 확인 → "발행하기" → 실제
  `/posts/[slug]`로 이동하고 "수정"/"삭제" 버튼(로그인 상태라 보임)까지 정상 렌더링,
  `/posts` 목록에도 새 글이 나타나고 총 글 수·태그 필터가 갱신되는 것 확인
- 로그아웃 상태(쿠키 없는 curl 요청)로 `/posts/write` 접근 시 여전히 로그인 페이지로
  리다이렉트되는 것 확인(미들웨어 보호 회귀 없음)
- 테스트 중 실제 DB에 들어간 테스트 글은 정리 스크립트로 삭제

## [0.7.21] - 2026-07-30

### 이전 상태

실제 GitHub OAuth App으로 로그인 테스트 중, 로그인 성공 후 별도 지정한 목적지 없이 사이트
베이스 URL(`http://localhost:3000`)로만 리다이렉트되던 것을 사용자가 발견 — `/about`으로
가도록 요청.

### Added

- `components/FooterAuthLink.tsx`의 `signIn("github")` 호출에 `{ callbackUrl: "/about" }`
  추가. 미들웨어가 보호된 라우트(`/posts/write` 등)에서 로그인을 유도하는 경우의 콜백 URL은
  건드리지 않음 — 그쪽은 원래 요청했던 페이지로 돌아가는 게 맞아서, Footer의 일반 로그인
  버튼에만 국한해서 적용

### 부가: `.env.local.example`에 실제 비밀값이 채워져 있던 것을 발견/수정

- 사용자가 GitHub OAuth Client ID/Secret과 본인 GitHub 사용자명을 실수로 `.env.local`이 아니라
  `.env.local.example`(git에 커밋되는 템플릿 파일)에 채워 넣은 것을 발견. 이 저장소는 아직 git
  저장소로 초기화되지 않아(`git init` 전) 실제로 유출되진 않았지만, 방치했다면 이후 첫 커밋에
  그대로 올라갔을 것. 실제 값은 `.env.local`(`.gitignore`의 `.env*.local` 패턴에 걸려 안전)로
  옮기고, `.env.local.example`은 빈 템플릿으로 되돌림

## [0.7.20] - 2026-07-30

### 이전 상태

글 수정/삭제 기능을 추가하기 전, "나(소유자)인지" 확인하는 인증 계층이 먼저 필요해서 GitHub
OAuth 기반 로그인 게이트를 추천 후 구현. 다중 사용자 서비스가 아니라 소유자 한 명만 쓰는
개인 블로그라 일반적인 회원가입/권한 시스템 대신 "GitHub 계정이 나인지"만 확인하는 단순한
allowlist 방식 채택.

### Added

- `next-auth@beta`(Auth.js v5) 의존성 추가
- `auth.ts`(프로젝트 루트) — GitHub Provider, JWT 세션(DB 어댑터 없음), `signIn` 콜백에서
  `profile.login === AUTH_OWNER_GITHUB_LOGIN`만 허용(다른 GitHub 계정은 로그인 자체가 거부됨),
  `authorized` 콜백(`middleware.ts`가 참조)
- `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`(`/posts/write`, `/posts/:slug/edit`
  보호) 신규
- `app/posts/write/page.tsx`(신규 스텁) — 기존에 링크만 있고 404였던 자리, 로그인 확인 UI만
  구현(실제 글쓰기 폼은 다음 단계)
- `app/posts/[slug]/page.tsx`에 로그인 상태일 때만 보이는 "수정"/"삭제" 버튼 추가(자리표시자,
  아직 실제 동작 없음)
- `components/Footer.tsx`에 로그인/로그아웃 링크 추가 — 단, `components/FooterAuthLink.tsx`
  (클라이언트 컴포넌트, `next-auth/react`의 `useSession`)로 구현하고 `components/
  AuthSessionProvider.tsx`(`SessionProvider` 래퍼)를 `app/layout.tsx`에 추가
- `.env.local.example`에 `AUTH_SECRET`/`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`/
  `AUTH_OWNER_GITHUB_LOGIN` 설명 추가

### Fixed (개발 중 발견)

- 처음엔 `Footer`를 서버 컴포넌트로 만들어 `auth()`를 직접 호출했는데, `Footer`가 루트
  레이아웃(모든 페이지 공통)에 있어서 이게 **앱 전체를 dynamic 렌더링으로 되돌리는 회귀**를
  일으킴 — 빌드 로그에서 `/posts`/`/projects`/`/about`/`/series`가 전부 `○`(static)에서
  `ƒ`(dynamic)로 바뀐 걸 보고 발견. `Footer`는 다시 순수 서버 컴포넌트로 되돌리고,
  로그인/로그아웃 부분만 클라이언트 `useSession()`으로 분리해 해결(정적 페이지들 `○` 복구
  확인)
- Auth.js 공식 문서의 `npx auth secret` 명령을 실제로 실행해보니 이름이 같은 무관한 npm
  패키지로 연결되어 엉뚱한 `BETTER_AUTH_SECRET` 값을 출력하는 걸 확인 — `.env.local.example`
  안내를 `openssl rand -base64 33`으로 교체

### 검증

- `npm run build` 통과, `/posts`/`/projects`/`/about`/`/series`가 여전히 `○`(Static)로 남아있는
  것 확인(Footer 수정 후)
- 로그아웃 상태에서 `/posts/write` 직접 접근 시 `/api/auth/signin`으로 307 리다이렉트되는 것
  curl로 확인
- 브라우저에서 글 상세 페이지에 로그아웃 상태일 때 수정/삭제 버튼이 안 보이는 것, Footer
  "로그인" 클릭 시 `signIn("github")`이 실제로 올바른 `redirect_uri`/PKCE와 함께 GitHub
  OAuth 인증 페이지로 리다이렉트되는 것까지 확인(`client_id=undefined`로 GitHub이 404를
  띄운 건 아직 실제 GitHub OAuth App을 발급받지 않아서 — 사용자가 직접 진행할 단계)

## [0.7.19] - 2026-07-30

### 이전 상태

`/posts` 진입이 느리다는 사용자 문의로 원인 진단 — `app/posts/page.tsx`가 `searchParams`
(tag/page 쿼리)를 읽는 바람에 Next.js가 이 라우트를 강제로 dynamic SSR로 취급, 캐싱 없이
매 진입마다 `lib/posts.ts#listAllPosts()`가 MongoDB Atlas에 fresh 왕복 조회(CHANGELOG 0.5.0
당시 측정한 왕복 140~250ms)를 하고 있었음. 사용자가 `unstable_cache` 도입 + `searchParams`를
클라이언트로 이전 + (이 구조 변경이 가능케 하는) TanStack Query 사용을 요청.

### Added

- `@tanstack/react-query` 의존성 추가
- `lib/posts.ts`에 `getCachedPosts`(=`unstable_cache`로 감싼 `listAllPosts`, `revalidate:
  300`, `tags:["posts"]`) 추가 — 서버 prefetch와 API 라우트가 같은 캐시 엔트리를 공유
- `app/api/posts/route.ts`(신규) — `getCachedPosts()`를 반환하는 GET 핸들러, 클라이언트
  `useQuery`가 호출하는 대상
- `components/QueryProvider.tsx`(신규) — `QueryClientProvider` 래퍼, `app/layout.tsx`에
  마운트해 앱 전역에서 `useQuery` 사용 가능
- `app/posts/page.tsx`: `searchParams` 제거, `export const revalidate = 300`(ISR)로 전환,
  서버에서 `queryClient.prefetchQuery` + `dehydrate`/`HydrationBoundary`로 초기 데이터를
  하이드레이션(로딩 스피너 없이 첫 렌더에 데이터 표시)
- `components/PostsListClient.tsx`: `posts`/`initialTag`/`initialPage` props 제거, 대신
  `useQuery(["posts"], () => fetch("/api/posts")...)`로 직접 데이터 조회. 기존 URL 복원용
  mount effect(`window.location.search` 읽기)는 그대로 재사용 — 뒤로가기 상태 복원 로직
  안 건드림

### 검증

- `npm run build` 후 빌드 로그에서 `/posts`가 `ƒ`(dynamic)에서 `○`(Static) +
  `Revalidate: 5m`으로 바뀐 것 확인
- 브라우저에서 `/posts` 첫 진입 시 로딩 스피너 없이 즉시 목록 표시, 태그 필터 클릭 시
  URL(`?tag=React`)과 목록이 정상 갱신되는 것, 글 상세로 이동 후 뒤로가기 시 필터 상태가
  복원되는 것(CHANGELOG 0.5.3 회귀 케이스) 확인
- 네트워크 탭으로 첫 로드 시 `/api/posts` 요청이 TanStack Query의 기본 마운트 시
  재검증으로 한 번 나가는 것 확인(정상 동작 — `unstable_cache`가 이미 캐싱해뒀으므로
  이 요청도 Mongo까지 왕복하지 않고 빠르게 응답, 사용자에게는 로딩 상태 없이 보임)

## [0.7.18] - 2026-07-30

### 이전 상태

`/about` 페이지의 각 섹션이 스크롤 여부와 무관하게 항상 그 자리에 고정으로 나타났음. 사용자가
스크롤을 내리면서 각 섹션이 트랜지션으로 나타나는 효과를 요청.

### Added

- `components/ScrollReveal.tsx`(신규) — `IntersectionObserver`로 요소가 뷰포트에 처음
  들어올 때만 `is-visible` 클래스를 붙이는 재사용 가능한 클라이언트 컴포넌트(한 번 보이면
  observer를 끊어서 다시 스크롤을 올려도 사라지지 않음)
- `app/globals.css`에 `.scroll-reveal`(기본 `opacity:0; translateY(24px)`) /
  `.scroll-reveal.is-visible`(`opacity:1; translateY(0)`, `0.6s ease` 트랜지션) 추가,
  `prefers-reduced-motion: reduce`에서는 트랜지션 없이 바로 보이도록 처리
- `app/about/page.tsx`의 프로필/보유 기술/경력/최근 프로젝트/최근 글/연락처 6개 섹션을 모두
  `<section>`에서 `<ScrollReveal>`로 교체 — 각 섹션이 화면에 들어올 때 개별적으로 페이드인 +
  위로 슬라이드하며 나타남

### 검증

- 브라우저 JS로 각 섹션의 `is-visible` 클래스가 처음엔 뷰포트 안에 있는 것만 `true`이고,
  스크롤해서 새 섹션이 들어올 때마다 그 섹션만 `true`로 바뀌는 것 확인(경력 → 최근
  프로젝트/글 → 연락처 순으로 순차 확인)
- `npm run build` 통과

## [0.7.17] - 2026-07-30

### 이전 상태

모바일 폭에서 Header의 nav 링크(소개/글/시리즈/프로젝트)가 로고·검색·테마 버튼과 한 줄에
다 안 들어가 `flexWrap`으로 다음 줄로 줄바꿈되던 문제. 사용자와 상의 후 햄버거 토글 메뉴로
전환하기로 결정.

### Added

- `components/Header.tsx`에 `mobileMenuOpen` 상태와 햄버거/X 토글 버튼(검색·테마 버튼 옆)
  추가. 640px 이하에서는 기존 가로 nav(`.nav-desktop`)가 숨고 토글 버튼(`.nav-mobile-toggle`)만
  보이며, 클릭 시 헤더 바로 아래 드롭다운 패널(`.nav-mobile-panel`)에 4개 링크가 세로로
  나열됨
- 드롭다운은 링크 클릭 시, 경로가 실제로 바뀔 때(뒤로/앞으로가기 포함), ESC 키 입력 시 모두
  자동으로 닫힘(검색 모달의 기존 ESC 핸들러에 조건 추가하는 방식으로 구현)
- `app/globals.css`에 `.nav-desktop`/`.nav-mobile-toggle` 반응형 클래스(640px 브레이크포인트,
  기존 `.toc-desktop`/`.toc-mobile` 패턴과 동일한 방식)와 `navPanelIn` 페이드인 애니메이션 추가

### 검증

- 브라우저에서 390px 폭: 햄버거 버튼만 보이고 nav 링크는 숨김 → 클릭 시 드롭다운 열림 →
  링크 클릭 시 실제 페이지 이동 및 메뉴 자동 닫힘, ESC로도 닫힘 확인
- 1440px 폭: 기존처럼 nav 링크가 그대로 보이고 햄버거 버튼은 숨겨지는 것 확인
- `npm run build` 통과

## [0.7.16] - 2026-07-30

### 이전 상태

프로젝트 상세 페이지 스크린샷 섹션에서 세로 비율 이미지도 가로 이미지처럼 한 줄에 하나씩만
나와 스크롤이 길어짐. 사용자가 세로 비율 이미지는 한 줄에 2개씩 보여달라고 요청.

### Added

- `app/globals.css`의 `.pd-body`에 `:has(img + img)` 규칙 추가 — 마크다운에서 같은 줄(문단)에
  이미지 2개를 나란히 쓰면 그 문단만 `display:flex`로 2열 배치되고, 각 이미지는
  `max-width: calc(50% - gap/2)`로 제한됨. CSS만으로는 이미지의 실제 가로/세로 비율을 판별할
  수 없어서, "한 문단에 이미지 2개가 있으면 2열" 규칙으로 대신 처리 — 세로 이미지를 2열로
  보이게 하려면 마크다운 작성 시 그 두 줄을 붙여 쓰면 됨(빈 줄로 분리하면 원래처럼 한 줄에
  하나씩). 기존처럼 이미지 하나짜리 문단(가로 스크린샷 등)은 영향 없음
- `scripts/seed-projects.ts`의 `fora` 프로젝트 스크린샷(전부 세로 비율) 5장을
  2장·2장·1장으로 묶어서 2열로 보이게 마크다운 수정

### 검증

- `npm run seed:projects` 후 재빌드, `/projects/fora`에서 세로 이미지들이 2열로 나란히
  나오는 것, `/projects/node-blog`(가로 이미지, 단독 줄)는 기존처럼 한 줄에 하나씩 나오는
  것(영향 없음) 확인
- `npm run build` 통과

## [0.7.15] - 2026-07-30

### 이전 상태

외대종강시계 프로젝트의 미리보기 이미지(`coverImage`)가 서울 시내 배경 화면이었는데, 사용자가
실제 앱의 "캠퍼스 선택" 화면 스크린샷으로 교체를 요청. 기존 이미지는 스크린샷 섹션에서
빠지지 않도록 그대로 남겨두되 순서상 맨 앞에 오게 요청.

### Added

- 원본 JPG(1280x800, `hufs_clock/Hufs_Clock_Intro/Introduces/캠퍼스선택.jpg`)를 `cwebp`로
  변환해 `public/projects/hufs-clock/campus-select.webp`(16KB)로 추가
- `hufs-clock` 프로젝트의 `coverImage`를 이 새 이미지로 교체, 기존 `coverImage`였던
  `seoul-main.webp`는 `overviewMd` "## 스크린샷" 섹션 맨 앞에 이미지로 추가(제거하지 않고 순서만
  이동)

### 검증

- `npm run seed:projects` 실행 후 재빌드, 브라우저로 `/projects` 카드와 `/projects/hufs-clock`
  상세 페이지에서 새 썸네일과 스크린샷 순서 확인
- `npm run build` 통과

## [0.7.14] - 2026-07-30

### 이전 상태

`scripts/seed-projects.ts`의 "기술 블로그"(`node-blog`) 항목 본문 끝에 "해당 프로젝트는 현재
next.js 프로젝트로 마이그레이션 되었습니다"라는 한 줄짜리 메모만 있었음. 사용자가 이 부분을
Next.js 마이그레이션 내용까지 포함해 보완해달라고 요청.

### Added

- `node-blog` 프로젝트의 `overviewMd`에 "## Next.js로 재구축" 섹션 추가 — 이 next-blog
  프로젝트로 실제 진행한 마이그레이션 내용을 반영: forum 실제 게시글 데이터를 `legacyId` 기준
  upsert로 이전(재실행 안전)하고 옛 `/detail/:id` 링크는 308 리다이렉트로 유지, 마크다운
  렌더링을 MDX 대신 remark→rehype로 택한 이유(마이그레이션한 실제 글 본문의 `{ error }` 같은
  중괄호 문장이 MDX 컴파일러에서 JS 표현식으로 오인돼 런타임 에러가 났던 실제 경험), `/posts`
  필터·페이지네이션을 클라이언트 처리로 바꾼 성능 개선, giscus 댓글 전환과 Vercel 배포

### 검증

- `npm run seed:projects` 실행 후 재빌드, 브라우저로 `/projects/node-blog` 상세 페이지에서
  새 섹션과 인라인 코드 스타일(백틱)이 정상 렌더링되는 것 확인
- `npm run build` 통과

## [0.7.13] - 2026-07-30

### 이전 상태

사용자가 `/posts`·`/projects`처럼 글/프로젝트 수가 적어 콘텐츠가 한 화면(100vh)보다 짧은
페이지에서 footer가 화면 맨 아래가 아니라 콘텐츠 바로 아래로 붙어 올라와 보인다고 보고 —
"sticky footer" 레이아웃이 안 돼 있던 문제.

### Added

- `app/globals.css`의 `body`에 `min-height: 100vh; display: flex; flex-direction: column;`
  추가, `app/layout.tsx`에서 `{children}`을 `<div className="site-content">`로 감싸고
  `flex: 1 0 auto`를 부여 — 콘텐츠가 짧으면 `.site-content`가 늘어나 footer를 뷰포트
  맨 아래로 밀어내고, 콘텐츠가 길면 기존처럼 자연스럽게 스크롤됨

### Fixed

- 처음 구현 시 `html, body`에 실수로 `height: 100%`도 같이 넣었는데, 이게 `min-height:100vh`와
  충돌해 콘텐츠가 한 화면보다 길어지는 페이지(`/posts` 등)에서 flex 컨테이너가 뷰포트
  높이로 눌리는 바람에, 줄어들 수 있는 유일한 요소였던 `Header`의 스페이서 div(고정 헤더가
  차지하는 공간을 문서 흐름에 보정해주는 요소)가 0으로 찌그러지며 고정 헤더가 본문 상단을
  가려버리는 회귀가 발생. `height: 100%`를 제거하고 `min-height: 100vh`만 남겨 해결(min-height는
  최소값일 뿐이라 콘텐츠가 길어도 flex 컨테이너가 자연스럽게 늘어나 스페이서를 안 건드림)

### 검증

- `/posts`에서 브라우저 JS로 헤더 높이/스페이서 높이/본문 시작 위치가 모두 67px로 일치하는 것
  확인(겹침 없음), `/projects`(글 3개)에서 footer가 뷰포트 하단에 고정되는 것,
  `/projects/[slug]`(sticky 사이드바 있는 페이지)도 스크롤 시 정상 동작하는 것 확인
- `npm run build` 통과

## [0.7.12] - 2026-07-30

### 이전 상태

사용자가 `scripts/seed-projects.ts`의 `projects` 배열에서 "토이 쇼핑몰 웹"(`react-shopping-mall`)
객체를 지우고 `npm run seed:projects`를 실행했는데 사이트에서 사라지지 않는다고 보고. 원인은
스크립트가 배열에 있는 항목을 slug 기준 upsert만 할 뿐, 배열에서 뺐다고 DB 문서를 지우는 로직이
없었기 때문(지난 버전의 `DUMMY_SLUGS` 삭제도 그 4개 슬러그에만 한정된 일회성 정리였고, 이후에
추가된 슬러그에는 적용 안 됨).

### Fixed

- `scripts/seed-projects.ts`의 `main()`을 수정 — upsert 이후 `projects` 배열에 있는 slug
  목록을 뽑아 `ProjectModel.deleteMany({ slug: { $nin: currentSlugs } })`로 배열에 없는
  프로젝트를 자동 삭제하도록 변경. 이제 이 배열이 명실상부한 단일 source of truth — 배열에서
  객체를 지우고 `npm run seed:projects`만 실행하면 DB에서도 지워짐. 더 이상 필요 없어진
  일회성 `DUMMY_SLUGS` 상수/삭제 로직은 제거(같은 효과를 이제 일반화된 sync 로직이 대신함)

### 검증

- `npm run seed:projects` 실행 → "배열에 없는 프로젝트 1개 삭제" 로그로 `react-shopping-mall`
  삭제 확인, 재빌드 후 `/projects` 목록에 더 이상 안 나오는 것과 `/projects/react-shopping-mall`
  상세 페이지가 404 뜨는 것을 curl로 확인
- `npm run build` 통과

## [0.7.11] - 2026-07-30

### 이전 상태

사용자가 프로젝트 상세 페이지의 모바일 반응형이 깨져있다고 보고 — 사이드바(sticky)와 오른쪽
본문이 스크롤 시 겹쳐 보임. `.proj-grid`는 800px 이하에서 1열로 접히도록 이미 돼 있었지만,
`app/projects/[slug]/page.tsx`의 `<aside>`에 `position:"sticky"`가 인라인 style로 박혀있어서
미디어 쿼리 CSS로 덮어쓸 수 없었던 것이 원인 — 1열로 접힌 뒤에도 사이드바가 계속 sticky로
남아 스크롤되는 본문과 겹침.

### Fixed

- `<aside>`의 인라인 `position:"sticky"`를 `.proj-sidebar` CSS 클래스로 옮기고,
  `app/globals.css`의 800px 이하 미디어 쿼리에 `.proj-sidebar { position: static; top: auto; }`
  추가 — 이제 좁은 화면에서는 사이드바가 일반 문서 흐름으로 돌아가 겹침 없이 순서대로 쌓임,
  넓은 화면에서는 기존처럼 sticky 유지

### 검증

- 브라우저에서 390px 폭으로 스크롤해 겹침 없이 순서대로 렌더링되는 것 확인(`position: static`
  적용 확인), 1440px 폭에서는 `position: sticky` 그대로인 것도 확인
- `npm run build` 통과

## [0.7.10] - 2026-07-30

### 이전 상태

사용자가 프로젝트 상세 페이지에서 세로 비율(초상) 사진이 컨테이너 너비 100%에 맞춰 늘어나면서
지나치게 커 보인다고 보고. `.pd-body img`(글/프로젝트 상세 공용 마크다운 이미지 스타일,
`app/globals.css`)에 `max-height` 제약이 없어 세로로 긴 이미지일수록 `max-width:100%`만
적용되면서 그만큼 키가 커지는 구조였음(가로 스크린샷은 문제없었음 — 세로 이미지에서만 발생).

### Fixed

- `.pd-body img`에 `max-height: 640px`, `width: auto`, `margin: var(--space-4) auto` 추가 —
  가로형 이미지는 기존처럼 컨테이너 너비에 맞게, 세로형 이미지는 높이 640px로 제한되고 좌우
  가운데 정렬되도록 분기. 별도 컴포넌트 없이 순수 CSS로 해결(가로/세로 자동 판별에
  JS 불필요).

### 검증

- ForA 프로젝트의 세로 스크린샷 5장이 모두 640px 높이로 잘리고 가운데 정렬되는 것을 브라우저
  JS로 실측 확인, 기술 블로그 프로젝트의 가로 스크린샷은 기존과 동일하게 렌더링되는 것 확인
- `npm run build` 통과

## [0.7.9] - 2026-07-30

### 이전 상태

`/about`의 "보유 기술"과 `/projects`가 각각 placeholder 스킬 3개 카테고리, Claude Design
목데이터 프로젝트 4개로 채워져 있었음. 사용자가 이전에 만든 실제 포트폴리오
(`portfolio-website`, React+Vite)에 있는 진짜 기술스택/프로젝트 데이터를 이 프로젝트 형식에
맞춰 옮겨달라고 요청.

### Added

- `lib/skillIcons.ts`에 Spring Boot/Supabase/Notion/AWS S3·EC2/React Query·TanStack
  Query/React Hook Form/Swagger/Bootstrap/Socket.io/Axios/Express/FastAPI 아이콘 매핑 추가
  (simple-icons 존재를 확신할 수 없는 Zustand/Swiper.js/Formspree/Toast UI Editor는 매핑
  생략 — 깨진 아이콘보다 텍스트 폴백이 안전)
- `app/about/page.tsx`의 `SKILLS`를 포트폴리오의 실제 3개 카테고리(Frontend 9개/Backend
  4개/DevOps & Tools 7개)로 교체. 원본의 복합 라벨 "Git & Github"는 칩 하나당 기술 하나인
  우리 방식에 맞춰 "Git"/"GitHub" 두 칩으로 분리
- `models/Project.ts`에 `coverImageFit`("cover"/"contain", 기본 cover)과
  `playStoreUrl`/`appStoreUrl` 필드 추가(`lib/projects.ts`/`ProjectCard.tsx`/
  `app/projects/[slug]/page.tsx`도 함께 반영) — 원본 데이터의 ForA 프로젝트가
  `thumbnailFit:"contain"`과 플레이스토어·앱스토어 링크만 가지고 있어 기존 필드로는 표현 못
  하던 것을 지원
- `scripts/seed-projects.ts`를 목데이터 4개(미니 커머스 어드민 등) 삭제 + 실제 프로젝트
  5개(외대종강시계/ForA(포에이)/토이 블로그 앱/기술 블로그/토이 쇼핑몰 웹) upsert로 교체.
  각 프로젝트 이미지는 `public/projects/<slug>/`로 복사(웹 최적화된 webp 우선, 과도하게 큰
  ForA 배너 이미지 2장은 `cwebp`로 1.5MB/1.26MB → 각각 약 95KB로 리사이즈)
- ForA 프로젝트의 `period`는 원본의 "June 2026"(마지막 수정월)보다, 이미 About 페이지
  `CAREER`에 사용자가 확정해둔 "2026.03 — 2026.06"이 더 정확해 그 값을 재사용

### 검증

- `npm run build` 통과, `npm run seed:projects` 실행 후 재빌드(정적 프리렌더된 `/projects`
  갱신 필요 — 0.7.7 때와 동일한 이유)
- 브라우저로 `/projects` 5개 카드(썸네일·태그 아이콘), ForA 상세 페이지(Play
  Store/App Store 버튼, contain 썸네일, 스크린샷 마크다운 이미지), `/about`의 "보유 기술" 3개
  카테고리와 새 아이콘들을 라이트/다크 모드 둘 다 확인

## [0.7.8] - 2026-07-30

### 이전 상태

사용자가 프로젝트 상세 페이지의 "사용 기술" 칩태그가 이상하게 보인다고 보고(아이콘이 있는
칩만 세로로 훨씬 두꺼워 보임, `SkillTag` 컴포넌트가 맞게 쓰인 게 맞는지 문의).

### Fixed

- 원인: `app/projects/[slug]/page.tsx`에서 사이드바 옆 본문 컬럼 전체를
  `<div className="pd-body">`로 감쌌는데, `.pd-body img { margin: var(--space-4) 0; }`
  (글 상세 페이지의 마크다운 본문 이미지용 스타일, `app/globals.css`)이 그 안에 있는 모든
  `<img>`에 적용되면서 "사용 기술" 섹션의 `SkillTag` 아이콘(13x13)에도 위아래 20px 마진이
  붙어 칩 전체 높이가 25px → 61px로 부풀어 보였음(아이콘 자체 크기는 정상이었고, 오직
  마진만 컴포넌트 바깥에서 새어 들어온 것이었음 — 브라우저에서 마진값을 직접 측정해
  확인). `.pd-body`는 실제 마크다운 컴파일 결과(`{content}`)만 감싸도록 범위를 좁혀 해결
  (히어로 이미지·"사용 기술" 섹션은 더 이상 `.pd-body`의 영향을 받지 않음)

### 검증

- 브라우저에서 칩 6개 모두 25px로 균일한 것을 JS로 직접 측정해 확인, `npm run build` 통과
- 진단 중 발견: 세션 도중 반복한 `.next` 삭제로 사용자가 별도로 띄워둔 `npm run dev`
  서버(포트 3000)의 빌드 캐시가 깨져 있었음 — 재시작으로 복구

## [0.7.7] - 2026-07-30

### 이전 상태

Header 네비게이션과 About 페이지의 "최근 프로젝트" 섹션이 `/projects`를 가리키고 있었지만
실제 라우트가 없어 404였고, "최근 프로젝트"는 데이터 모델 없이 정적 placeholder 카드 2개로만
구현돼 있었음. Claude Design 프로젝트에서 `Projects.dc.html`/`ProjectCard.dc.html`/
`ProjectDetail.dc.html`을 가져와 이번에 실제로 구현.

### Added

- `models/Project.ts`(Post와 동일한 관례: slug/status/publishedAt) +
  `lib/projects.ts`(`listProjects`/`getProjectBySlug`, overview는 `lib/markdown.ts`의
  `compileMarkdown` 재사용 — 새 마크다운 파서 안 만듦)
- `components/ProjectCard.tsx`(썸네일 16:9 + `SkillTag`로 태그 렌더링, 없으면 이니셜 대신
  점선 테두리 placeholder 박스)
- `app/projects/page.tsx`(그리드 목록), `app/projects/[slug]/page.tsx`(260px sticky 사이드바
  + 본문, 데모/GitHub 버튼)
- `app/globals.css`에 `.proj-grid`(800px 이하에서 1열로 접힘), `.img-placeholder` 추가
- `scripts/seed-projects.ts`(`npm run seed:projects`) — Claude Design 목데이터 4개
  (미니 커머스 어드민/팟캐스트 클립 앱/배포 자동화 CLI/실시간 채팅 위젯)를 slug 기준
  **upsert**로 시드. 기존 `scripts/seed.ts`처럼 `deleteMany` 방식을 쓰면 forum에서 이미
  migrate된 실제 게시글까지 지워지므로, `migrate-from-forum.ts`와 같은 비파괴적 upsert
  패턴을 그대로 따름
- About 페이지의 "최근 프로젝트" placeholder(`PROJECTS_PREVIEW`)를 제거하고
  `listProjects()` 실제 데이터 2개 + `<ProjectCard>` + "전체 보기 →" 링크로 교체("최근 글"
  섹션과 동일한 패턴)

### Fixed

- 개발 중 발견: `ProjectDetail.dc.html`을 그대로 옮기면서 정적 "프로젝트 개요" 제목과
  `overviewMd` 첫 줄의 `## 프로젝트 개요`가 중복 렌더링됨 — Claude Design의 미니 마크다운
  파서는 `## `를 h3로 낮춰서 매핑해 눈에 덜 띄었지만, 표준 remark 파이프라인은 `##`를 그대로
  h2로 렌더해 같은 레벨의 제목이 겹쳐 보였음. `overviewMd`에서 중복되는 첫 heading 줄을 제거해
  해결

### 검증

- `npm run build` 통과, `npm run seed:projects` 실행 후 재빌드(정적 프리렌더된 `/projects`가
  시드 전 빈 상태로 굳어 있던 걸 발견 — 재빌드로 해결)
- 브라우저로 `/projects` 그리드, 상세 페이지(라이트/다크 모드, 700px 폭에서 사이드바 1열
  접힘), About의 "최근 프로젝트" 링크 확인

## [0.7.6] - 2026-07-30

### 이전 상태

`/about` 상단 프로필 배지가 "초록"의 첫 글자("초") placeholder 아바타였음. 사용자가 실제
프로필 사진을 전달함.

### Added

- 원본 이미지(590x787, Instagram 내보내기)를 400px로 리사이즈(`sips -Z 400`) 후
  `public/profile/me.jpg`(36KB)로 추가
- `PROFILE`에 `avatar?: string` 필드 추가, 있으면 32px 원형 배지를 `next/image`
  (`objectFit: cover`, `objectPosition: "top center"`)로, 없으면 기존처럼 이니셜
  placeholder를 렌더하도록 분기 — 경력 로고(0.7.4)와 동일한 조건부 패턴
  - 인물 세로 사진이라 `object-position: top`으로 얼굴이 있는 상단을 기준으로 크롭(하단
    손/음료 부분이 잘림)

### 검증

- `npm run build` 통과, 브라우저에서 원형 배지에 얼굴이 잘 보이는 것 확인

## [0.7.5] - 2026-07-30

### 이전 상태

`/about` "경력"의 "포에이" 항목이 회사명 첫 글자("포") placeholder 로고였음. 사용자가
`forA-logo.png`(12399x12399, 1.1MB 원본)를 전달함.

### Added

- 원본 이미지를 256x256로 리사이즈(`sips -Z 256`) 후 `public/career/forA-logo.png`로 추가
  (20KB) — 12399x12399 원본을 그대로 쓰면 페이지 로드에 불필요하게 무거움
- 포에이 `CAREER` 항목에 `logo: "/career/forA-logo.png"` 설정 (0.7.4에서 만든 `logo` 필드
  재사용, 코드 변경 없음)

### 검증

- 라이트/다크 모드 둘 다 로고가 정상 렌더링되는 것 확인
- `npm run build` 통과
- (진단) 첫 확인 시 로고가 안 보였던 원인은 코드 문제가 아니라 이전 `next start` 프로세스가
  포트 3000을 점유한 채 남아있어 새 빌드가 반영되지 않은 것 — 프로세스 종료 후 재확인하여 해결

## [0.7.4] - 2026-07-30

### 이전 상태

`/about` "경력"의 "멋쟁이사자처럼 한국외대" 항목이 회사명 첫 글자("멋") placeholder
로고였음. 사용자가 실제 로고 이미지를 전달함.

### Added

- `public/career/likelion-hufs.jpeg` 추가, `CAREER` 항목에 `logo?: string`(선택) 필드 추가
- 경력 로고 자리를 `job.logo`가 있으면 흰 배경 박스 안에 `next/image`(`objectFit: contain`)로
  실제 로고를, 없으면 기존처럼 회사명 첫 글자 placeholder를 렌더하도록 분기 — 로고가 정사각형이
  아니라(2400x1260, 와이드) 흰 배경에 여백을 두고 담기는 방식 채택, 다크모드에서도 로고
  가독성을 위해 배경은 항상 흰색 고정

### 검증

- 라이트/다크 모드 둘 다 로고가 깔끔하게 보이는 것 확인
- `npm run build` 통과

## [0.7.3] - 2026-07-29

### 이전 상태

사용자가 다크모드 토글 시 원형 리빌 애니메이션이 (버튼 위치가 아니라) 화면 중앙에서
퍼져나간다고 보고함.

### Investigated

- Chrome에서 직접 재현 시도 — `themeBtnRef.current?.getBoundingClientRect()`로 계산한
  좌표(`--theme-x`/`--theme-y`)가 실제 버튼 위치(예: 1392px, 33px)로 정확히 설정되고,
  애니메이션 지속시간을 15초로 늘려 시각적으로도 버튼 위치에서 정확히 퍼져나가는 것을
  두 차례(코드 수정 전/후) 직접 확인함 — 코드 자체의 로직 오류는 재현하지 못함
- 다만 자동화 클릭 좌표가 버튼을 살짝 벗어나면 `themeBtnRef.current`가 아니라 이벤트가
  아예 발생하지 않거나, ref가 어떤 이유로든(예: 최초 렌더 타이밍) null인 경우
  `window.innerWidth/2, window.innerHeight/2`(=화면 중앙)로 조용히 폴백하는 코드 경로가
  실제로 존재함을 확인 — 사용자 환경에서 이 폴백이 발동했을 가능성이 있음

### Fixed

- `components/Header.tsx#toggleTheme`이 버튼 ref의 `getBoundingClientRect()` 대신 **클릭
  이벤트 자체의 `clientX`/`clientY`**를 우선 사용하도록 변경 — ref가 어떤 이유로 null/stale이든
  실제 클릭 좌표를 직접 쓰므로 화면 중앙으로 조용히 폴백하는 경로 자체를 제거함. 키보드로
  버튼을 활성화한 경우(`clientX`/`clientY`가 0)엔 여전히 ref 기반 버튼 중심으로 폴백

### 검증

- 브라우저에서 라이트→다크, 다크→라이트 양방향 모두 버튼 위치에서 정확히 퍼져나가는 것
  재확인 (애니메이션 15초로 늘려 시각적으로 확인)
- `npm run build` 통과

## [0.7.2] - 2026-07-29

### 이전 상태

`/about`의 "보유 기술"/"경력" 태그 칩이 텍스트만 있고 아이콘이 없었음(디자인 원본은
Simple Icons CDN으로 아이콘을 붙여줬었는데 그동안 생략했었음). 사용자가 흔한 기술 이름은
미리 아이콘 매핑을 정리해두고, 태그 배열에 이름만 추가하면 자동으로 아이콘이 붙는 재사용
컴포넌트를 요청함.

### Added

- `lib/skillIcons.ts`: 기술 이름(소문자 정규화, 표기 변형 포함 — "React.js"/"reactjs" 등)
  → Simple Icons(`cdn.simpleicons.org`) 슬러그 매핑 40여 개(React/Next.js/TypeScript/
  React Native/Swift/Docker/GitHub Actions/AWS/MongoDB/Figma 등 프론트엔드·모바일·인프라·
  DB·툴 전반)
- `components/SkillTag.tsx`: `name`(+ 선택적 `icon` 오버라이드)을 받아 매핑에 아이콘이
  있으면 `<img>` + 이름을, 없으면 지금처럼 텍스트만 있는 `tag tag-outline` 칩을 렌더 —
  매핑에 없는 이름도 깨지지 않음
- `app/about/page.tsx`의 "보유 기술"(`SKILLS.items`)과 "경력"(`job.tags`) 두 군데 모두
  `<span className="tag tag-outline">`를 `<SkillTag>`로 교체 — 한 페이지 안에서 같은
  종류의 기술 태그인데 한쪽만 아이콘이 있으면 어색해서 같이 바꿈

### 검증

- 브라우저로 `/about`의 보유 기술/경력 태그 전부에 아이콘이 붙어 나오는 것 확인
  (React/Next.js/TypeScript/React Native/Swift/Docker/GitHub Actions/AWS/React.js/
  Javascript/Expo)
- `npm run build` 통과

## [0.7.1] - 2026-07-29

### 이전 상태

0.7.0 이후 사용자가 `CAREER`(실제 경력 2건: 멋쟁이사자처럼 한국외대, 포에이)와
`CONTACT_GITHUB_URL`을 직접 실제 내용으로 채워 넣음. 그 사이 Claude Design에서
`About.dc.html`의 "경력" 섹션 내부 구조가 바뀜 — 다시 fetch해서 확인.

### Changed

- "경력" 섹션을 새 디자인 구조로 교체: 기존엔 `기간 | 직함·회사 한 줄 + 설명 + 태그`였는데,
  이제 회사 로고 자리(52x52 둥근 사각형, 회사명 첫 글자 placeholder — `image-slot`은 디자인
  툴 전용이라 포팅 대상 아님) + `직함(h3)` / `회사명(p)` / `기간(p)` / `근무지(p, 선택)` /
  `설명(p, 선택)` / 태그 순서로 세로 배치
- `CAREER` 항목에 `location?: string`(선택) 추가 — 없으면 그 줄은 생략됨
- 디자인엔 경력별로 연관 프로젝트를 보여주는 카드(클릭 시 프로젝트 상세로 이동)도 있었는데,
  `/projects` 자체가 이 프로젝트에 없어 이번에도 구현하지 않음(기존 방침과 동일)

### 검증

- 브라우저로 `/about`의 "경력" 섹션이 새 레이아웃(로고+직함/회사/기간/설명/태그)으로
  보이는 것 확인
- `npm run build` 통과

## [0.7.0] - 2026-07-29

### 이전 상태

Header의 "소개" 링크가 `/about`으로 가지만 페이지가 없어 404였음. Claude Design의
`About.dc.html`을 확인 — 프로필/한줄소개, 보유기술, 경력, 최근 프로젝트, 최근 글, 연락처로
구성된 개인 소개 페이지였는데, 디자인 목업의 이름(김초록/김태헌)·경력·회사명은 디자인 툴이
채워둔 예시 데이터라 그대로 쓸 수 없었음.

### Added

- `app/about/page.tsx`: 히어로(이니셜 아바타+닉네임+역할+헤딩+인트로), 보유기술(카테고리별
  `tag-outline` 칩), 경력(타임라인), 최근 프로젝트(정적 카드 2개, 링크 없음), 최근 글(`lib/
  posts.ts#listAllPosts()`로 실제 최신 3개), 연락처(고정 진한 초록 박스, GitHub + `mailto:
  daejincnc2@gmail.com`) 섹션 순서로 구현
- 프로필/경력/기술/프로젝트 내용은 전부 placeholder로 구현 — 사용자가 "일단 플레이스홀더로
  구현하고 나중에 교체"를 선택함. 디자인의 구체적 가짜 회사명(그린랩스/스푼라디오 등)을 그대로
  베끼면 실제 이력처럼 오해될 수 있어, `[회사명을 입력하세요]`처럼 채워야 할 자리가 분명하게
  보이는 placeholder로 대체. 보유기술 카테고리만은 실제 게시글 태그(React/Next.js/TypeScript/
  React Native/Swift/인프라)에서 뽑아 완전한 허구는 아니게 채움
- 디자인의 IntersectionObserver 기반 섹션별 스크롤 리빌 애니메이션은 스킵 — 다른 페이지들처럼
  로딩 스켈레톤 없이 SSR로 완성된 상태를 바로 보여주는 것과 일관되게 페이지 전체
  `pageFadeIn`만 사용

### 검증

- 브라우저로 모든 섹션(히어로/기술/경력/프로젝트/최근 글/연락처) 렌더링 확인, "최근 글"에
  실제 최신 게시글 3개가 뜨는 것 확인
- `npm run build` 통과

## [0.6.0] - 2026-07-29

### 이전 상태

Header의 "시리즈" 링크가 `/series`로 가지만 페이지가 없어 404였음. `models/Series.ts`는
이미 있었고 seed 데이터에 시리즈 2개(각 2~3편)도 이미 들어있었지만, 시리즈 목록/상세를 보여줄
페이지 자체가 없었음.

### Added

- Claude Design의 `Series.dc.html`(리스트/상세를 `?id=` 유무로 한 파일에서 분기하는 구조)을
  확인 후, `/posts` + `/posts/[slug]`처럼 리스트/상세를 별도 라우트로 분리해서 구현
  (필터·페이지네이션이 없는 단순 목록이라 클라이언트 컴포넌트로 뺄 이유는 없음, 서버 컴포넌트로 충분)
- `lib/series.ts`(신규): `listSeriesWithCounts()`(발행 글 1편 이상인 시리즈만, published
  개수 집계), `getSeriesWithPosts(slug)`(시리즈 내 발행 글을 `publishedAt asc`로 정렬 +
  회차 번호/읽는시간 포함)
- `app/series/page.tsx`(목록), `app/series/[slug]/page.tsx`(상세, 원형 회차 배지 + 글 목록,
  없으면 `notFound()`)
- `app/globals.css`에 카드 컴포넌트 클래스(`.card`, `.card-kicker`, `.card-title`,
  `.card-body`) 추가 — 이전엔 목록/상세 페이지에 카드 UI가 없어서 트리밍했었음
- `components/SeriesNav.tsx`의 시리즈 제목을 `/series/[slug]`로 가는 링크로 변경 (원래
  디자인에도 링크였는데 그동안 목적지 페이지가 없어서 텍스트로만 두었던 부분)

### 검증

- `/series` 접속 → seed 시리즈 2개 카드 확인 → 클릭해 `/series/react-deep-dive`에서 3편이
  회차 순서(1/2/3)대로 나열되는 것 확인 → 글 클릭 시 `/posts/[slug]`로 이동 확인
- PostDetail의 시리즈 네비게이션 바 클릭 → 해당 `/series/[slug]`로 이동하는 것도 확인
- `npm run build` 통과

## [0.5.4] - 2026-07-29

### 이전 상태

게시글 상세 페이지(`app/posts/[slug]/page.tsx`) 상단 태그 칩이 그냥 `<span>`이라 클릭해도
아무 반응이 없었음.

### Added

- 태그 칩을 `/posts?tag=<태그>`로 가는 `<Link>`로 변경 — `/posts`는 0.4.0부터 이미 `?tag=`를
  초기 필터로 읽으므로(`app/posts/page.tsx`의 `initialPage`/`initialTag` → `PostsListClient`),
  새 기능 없이 기존 진입점에 연결만 하면 됐음

### 검증

- 브라우저에서 게시글의 "성능" 태그 클릭 → `/posts?tag=성능`으로 이동, 해당 태그 글만 필터된
  목록 확인
- `npm run build` 통과

## [0.5.3] - 2026-07-29

### 이전 상태

`/posts`의 태그/페이지 상태는 `PostsListClient`의 `useState`에만 있고 URL엔 전혀 반영되지
않았음(0.5.0). 그래서 2페이지(혹은 특정 태그)를 보다가 글을 클릭해 상세 페이지로 이동한 뒤
브라우저 "뒤로가기"를 누르면, `/posts`가 다시 마운트되며 state가 초기화되어 무조건 1페이지·
필터 없음으로 돌아가는 버그가 있었음.

### Fixed

- 서버 페이지네이션(`?page=`/`?tag=` + Server Component 재조회)으로 되돌리면 0.5.0에서 고친
  클릭 반응 속도 문제가 재발하므로, 대신 **Next.js 라우터를 거치지 않고 `window.history.
  replaceState`로 주소창만 직접 갱신** — 서버 재요청 없이 URL에 현재 태그/페이지를 기록
- 컴포넌트가 (다시) 마운트될 때 `useEffect`로 `window.location.search`를 읽어 state를
  복원하도록 추가 — 상세 페이지에서 뒤로가기로 돌아오면 브라우저가 정확히 그 시점의
  `?page=`/`?tag=`를 가진 히스토리 엔트리로 복귀하므로 올바르게 복원됨. 하이드레이션 불일치를
  피하려고 이 복원은 항상 `useEffect`(마운트 후, 클라이언트 전용) 안에서만 수행
- `replaceState`를 써서(=`pushState` 아님) 칩/페이지 클릭이 브라우저 히스토리를 쌓지 않게
  함 — 뒤로가기 한 번으로 바로 `/posts` 진입 전 페이지로 빠짐
- `app/posts/page.tsx`가 `?page=`도 파싱해 `initialPage`로 전달 — `initialTag`와 대칭,
  `/posts?page=3` 직접 진입도 지원

### 검증

- 프로덕션 빌드로 2페이지 이동 → 글 클릭 → 뒤로가기 → 2페이지 복원 확인
- `?tag=React` 필터 상태에서도 동일하게 확인
- 페이지/필터를 여러 번 바꿔도 뒤로가기 한 번으로 `/posts` 진입 이전 화면으로 바로 이동하는 것
  확인(히스토리 쌓임 없음)

## [0.5.2] - 2026-07-29

### 이전 상태

0.5.0에서 태그 목록을 `.sort(([a],[b]) => a.localeCompare(b))`로 정렬했는데, `/posts`
방문 시 하이드레이션 에러(Recoverable Error)가 발생 — 콘솔에 서버는 `app`을 렌더링했는데
클라이언트는 `모바일`을 렌더링했다는 diff가 찍힘.

### Fixed

- 원인: `localeCompare()`는 로케일에 따라 다르게 동작하는 비교이고, 한글/영문이 섞인 문자열의
  정렬 순서가 Node.js(SSR)의 ICU 구현과 브라우저(클라이언트)의 ICU 구현에서 다르게 나올 수
  있음 — 같은 태그 집합인데 순서만 달라져서 서버 렌더링 HTML과 클라이언트 첫 렌더링이 어긋남
- `components/PostsListClient.tsx`의 태그 정렬을 로케일 비의존적인 코드 유닛 비교
  (`a < b ? -1 : a > b ? 1 : 0`)로 교체 — 서버/클라이언트 어디서 실행하든 항상 같은 순서
- 부수 효과로 태그 칩 순서가 코드포인트 순(영문 먼저, 한글 나중)으로 바뀜 — 기능상 문제는
  아니지만 참고

### 교훈

SSR-되는 곳에서 배열을 정렬할 때 `localeCompare()`(또는 `Intl.Collator` 등 로케일 의존
API)는 피할 것 — 서버/클라이언트 환경이 다른 로케일 데이터를 쓰면 순서가 달라져 하이드레이션이
깨짐. 필요하면 `localeCompare(b, "ko")`처럼 로케일을 명시적으로 고정하거나, 이번처럼 그냥
코드 유닛 비교로 충분한 경우엔 그게 더 안전함.

### 검증

- 브라우저 콘솔에서 하이드레이션 에러 사라진 것 확인 (fresh navigation 기준)
- `npm run build` 통과

## [0.5.1] - 2026-07-29

### 이전 상태

0.5.0에서 필터 칩/페이지네이션을 클라이언트 컴포넌트로 새로 만들면서, 실제 `<button>` 요소에
디자인(`Posts.dc.html`)이 인라인으로 명시하던 `border-radius: 10px`와 `background`를
그대로 옮기지 않아 두 가지가 어긋나 있었음: (1) 칩이 디자인의 둥근 필(pill) 모양이 아니라
`.tag` 기본 각진 모서리로 보임, (2) 비활성 칩에서 `background`를 아예 지정하지 않아 브라우저
기본 버튼 배경이 다크모드에서 그대로 노출됨(디자인은 활성/비활성 모두 `background`를
`var(--color-accent-100)`/`none`으로 항상 인라인 명시).

### Fixed

- `components/PostsListClient.tsx`의 필터 칩 + 페이지네이션 버튼에 `border`/`background`를
  디자인과 동일하게 항상 인라인으로 명시(active: `var(--color-accent-100)` 배경 + border
  none, inactive: `none` 배경 + accent 테두리)
- `app/globals.css`에 `.chip-btn`(border-radius 10px + 클릭 시 `scale(0.9)`)과
  `.page-num-btn`(클릭 시 `scale(0.85)`) 추가 — 디자인의 `style-active="transform:scale(...)"`
  프레스 애니메이션 재현. 다시 Claude Design에서 `Posts.dc.html`을 재확인해 정확한 값을 반영함

### 검증

- 프로덕션 빌드 + 다크모드로 직접 스크린샷 비교, 칩 모양/배경색이 디자인 레퍼런스와 일치하는 것 확인

## [0.5.0] - 2026-07-29

### 이전 상태

`/posts`(0.4.0)는 태그 필터/페이지네이션을 `?tag=`/`?page=` 쿼리 파라미터 + 서버 컴포넌트로
구현해서 클릭할 때마다 MongoDB Atlas를 다시 조회했음. 사용자가 클릭 반응이 굼뜨다고 느낌.

### Fixed / Changed

- 실측: dev 서버에서 250~500ms, 프로덕션 빌드(`next build && next start`)에서도 140~250ms —
  절반은 dev 모드 오버헤드, 나머지는 클릭마다 Atlas 왕복 3~4번(countPublishedPosts +
  getAllTags + listPosts의 count/find)이 생기는 구조 자체 때문이었음
- `/posts`를 **클라이언트 사이드 필터링/페이지네이션**으로 되돌림 (Claude Design 원본
  `Posts.dc.html`과 동일한 방식) — 진입 시 게시글 전체를 한 번만 가져오고
  (`lib/posts.ts#listAllPosts`), 태그 칩/페이지 클릭은 `components/PostsListClient.tsx`의
  로컬 state로 처리해 서버 왕복 없이 즉시 반응. `?tag=`로 들어온 최초 진입 필터는 그대로 지원
  (그 이후 클릭은 URL을 바꾸지 않음, 디자인 원본과 동일)
- `lib/posts.ts#listPosts`(더 이상 `/posts`에선 안 쓰지만 남겨둠) 내부 `countDocuments`/
  `find`를 `Promise.all`로 병렬화 — 나중에 글이 많아져 서버 페이지네이션으로 되돌릴 때를 대비
- 태그 필터 칩 버튼의 인라인 스타일이 `border`/`background`를 항상 덮어써서, 비활성(outline)
  상태에서도 테두리가 안 보이던 버그를 만드는 중에 발견해 바로 수정 (활성일 때만 `border:
  "none"`으로 덮어쓰도록 조건부 처리)

**트레이드오프 기록**: 지금(18개 글)은 전체를 한 번에 내려받는 비용이 무시할 만해서 이 방식이
맞지만, 글이 수백 개 이상으로 늘어나면 첫 로드 페이로드가 부담될 수 있음 — 그때는
`listPosts`/`getAllTags`/`countPublishedPosts`(계속 남겨둠)로 서버 페이지네이션으로 되돌리기.

### 검증

- 브라우저 Network 탭으로 태그 칩 클릭 시 요청이 전혀 안 뜨는 것 확인 (프로덕션 빌드 기준)
- `?tag=Next.js`로 직접 진입 시 해당 태그로 필터된 상태로 시작하는 것 확인
- `npm run build` 통과

## [0.4.0] - 2026-07-29

### 이전 상태

PostDetail(`/posts/[slug]`)과 forum 데이터 마이그레이션(0.3.0)까지 끝났지만 글 목록을 볼 방법이
없어서, `/posts/[slug]` 안의 "목록으로" 링크나 Header의 "글" 메뉴가 전부 404로 이어지는 상태였음.

### Added

- `app/posts/page.tsx`: Claude Design의 `Posts.dc.html`을 기준으로 글 목록 페이지 구현.
  태그 필터 칩(전체 + 태그별 개수), 총 개수 표시, 페이지네이션(페이지당 5개), "새 글 작성" 버튼.
  디자인은 클라이언트 상태로 필터/페이지를 관리했지만, 여기선 `?tag=`/`?page=` 쿼리 파라미터 +
  서버 컴포넌트로 구현 — 북마크 가능하고 자바스크립트 없이도 동작함
- `lib/posts.ts`에 `countPublishedPosts`, `getAllTags`(태그별 집계), `listPosts`(태그 필터 +
  페이지네이션) 추가
- `app/globals.css`에 `.tag-outline`(비활성 칩/페이지 버튼), `.stagger-list`/`cardIn` 애니메이션
  복원 — 목록 페이지 전용으로 이전엔 트리밍했던 클래스

### 검증

- 브라우저에서 태그 필터 클릭(`React Native` 선택 시 1건으로 정확히 좁혀짐), 페이지 이동
  (`?page=2`로 다른 글이 보임) 확인
- `npm run build` 통과

## [0.3.0] - 2026-07-29

### 이전 상태

env 매핑(0.2.0)까지 끝내고 `MONGODB_URI`를 실제 Atlas 값으로 채운 상태. forum의 실제
게시글 데이터를 next-blog로 옮길 수 있는지, 어떻게 정합성을 맞출지가 남아있었음.

### Added

- forum의 실제 Mongoose(정확히는 raw MongoDB 드라이버) 스키마 조사: `post`/`category`/
  `comments`/`users`/`messages`/`conversations` 컬렉션 필드 구성 전수 확인
- `models/Post.ts`에 `legacyId`(sparse unique, 옛 forum `_id`)와 `coverImage` 필드 추가
- `lib/slug.ts`: 한글 제목을 로마자화하지 않고 그대로 slugify하는 유틸
- `scripts/migrate-from-forum.ts`: forum DB는 읽기 전용으로만 접속(다른 컬렉션은 아예
  읽지도 않음), next-blog DB엔 `legacyId` 기준 upsert로 저장 — 몇 번을 다시 실행해도
  안전(=`deleteMany` 없음), 이미 있는 글의 slug는 재계산하지 않고 유지
- `app/detail/[id]/route.ts`: 옛 `/detail/:id` 링크를 새 `/posts/:slug`로 308 리다이렉트
- 실제 forum 데이터 12건 마이그레이션 완료 (신규 12, 스킵 0, slug 충돌 0)

### Fixed

- **[중요] MDX 렌더링 파이프라인을 통째로 remark→rehype(plain Markdown)로 교체.**
  실제로 이전한 글 중 본문에 `{ error }`처럼 코드펜스 밖에서 중괄호를 텍스트로 쓴 글이 있었는데,
  `next-mdx-remote`의 `compileMDX`는 이걸 JS 표현식으로 해석해 `ReferenceError: error is not
  defined`로 렌더링이 500 에러남. DB에 저장된 임의의 마크다운(포럼 글, 사용자가 작성한 글)을
  렌더링하는 이 프로젝트의 용도엔 MDX(의도적으로 JSX를 심는 문서용)가 애초에 안 맞는 선택이었음
  — `lib/markdown.ts`를 `unified().use(remarkParse, remarkGfm, remarkRehype, rehypeSlug,
  rehypePrettyCode, rehypeReact)`로 재작성. 커스텀 컴포넌트 매핑(pre/img/blockquote)과
  코드 하이라이팅은 그대로 유지, `{}`/`<태그>`는 항상 리터럴 텍스트로 취급(forum의 markdown-it
  기본 동작과 동일). `next-mdx-remote` 의존성 제거, `rehype-react`/`remark-rehype` 추가
- Next.js 동적 라우트 `[slug]`의 `params.slug`가 자동으로 디코딩되지 않는다는 걸 실데이터로
  확인 — `getPostBySlug` 호출 전 `decodeURIComponent(slug)` 추가 (한글 slug라 이전엔
  더미 영문 slug로만 테스트해서 안 드러났던 버그)
- `/detail/[id]`의 redirect 대상 URL에 한글 slug를 그대로 넣으면 Node의 Location 헤더가
  ByteString이 아니라서 500(`Cannot convert argument to a ByteString`) — `encodeURIComponent`로 수정

### 검증

- 마이그레이션된 12건 + 기존 더미 시드 글 전부 `/posts/:slug` 200 확인 (한글 slug 포함)
- `/detail/<forum _id>` → `/posts/:slug` 308 리다이렉트 확인
- 문제였던 글(`3-reactjs-react-hook-form`)을 브라우저에서 직접 렌더링해 목차/코드블록/
  다크모드까지 정상 확인

## [0.2.0] - 2026-07-29

### 이전 상태

`.env.local`에 `MONGODB_URI`를 채우려는데, 기존 forum 프로젝트가 어떤 env 변수를 쓰는지
몰라서 무엇을 가져와야 할지 헷갈리는 상태.

### Added

- forum(`/Users/chorock/Desktop/coding/node 장인/forum`)의 env 변수 전수 조사: `.env` 키,
  코드 내 `process.env.` 사용처, Dockerfile, GitHub Actions secrets
- `.env.local.example` / `.env.local`에 `MONGODB_URI` 값을 forum의 `DB_PASSWORD`로 어떻게
  조립하는지 주석으로 명시. forum의 나머지 변수(`SESSION_SECRET`, `EMAIL_PASSWORD`, `PORT`,
  `S3_*`, `DOCKER_*`, `EC2_*`)는 next-blog에 대응 기능이 없어 가져올 필요 없다는 점도 명시
- `CLAUDE.md`에 forum 소스 경로 기록, 메모리에 forum 경로를 reference로 저장

### 결론

forum에서 실제로 필요한 값은 `DB_PASSWORD` 하나뿐 — next-blog는 완성된 연결 문자열
(`MONGODB_URI`) 하나를 그대로 받는 반면 forum은 코드에서 URI를 조립했던 것이 혼란의 원인.

## [0.1.0] - 2026-07-29

### 이전 상태

저장소가 완전히 비어 있었음. 기존 서비스는 Express(SSR) + MongoDB Atlas + Docker +
GitHub Actions + AWS EC2로 별도 운영 중이며, 이 프로젝트는 그 블로그를 Next.js +
MongoDB Atlas + Vercel로 옮기기 위한 새 저장소로 시작.

### Added

- Next.js 15(App Router) + TypeScript 프로젝트 스캐폴딩 (`package.json`, `tsconfig.json`,
  `next.config.ts`, ESLint flat config)
- Claude Design 프로젝트("개발 블로그 프로토타입")의 `PostDetail.dc.html` 디자인을 기준으로
  게시글 상세 페이지(`app/posts/[slug]/page.tsx`) 구현: 스크롤 진행바, 시리즈 이전/다음 글,
  태그/제목/공유 버튼, 목차(데스크톱 스크롤스파이 + 모바일 아코디언), Markdown 본문(코드블록
  구문강조+복사, 인용구, 이미지), 관련 글, giscus 댓글
- 공용 셸: `Header`(검색 Cmd+K 모달 + 다크모드 토글 + 스크롤 블러), `Footer`, `PostCard`
- 데이터 계층: `lib/mongodb.ts`(mongoose 커넥션 캐시), `lib/posts.ts`(DB 조회),
  `lib/markdown.ts`(MDX 컴파일 + 목차 추출 + 읽는시간 계산), `models/Post.ts`, `models/Series.ts`
  — 기존 Express 블로그 스키마에는 접근할 수 없어 새로 설계
- `app/globals.css`: Claude Design 시스템("Broadsheet") 토큰을 이식하되 실제 사이트에서
  쓰지 않는 CMYK 인쇄 분리 효과·Source Serif 처리는 제외
- `scripts/seed.ts`: 로컬/개발 확인용 샘플 시리즈 2개 + 게시글 6개 삽입 스크립트
- `CLAUDE.md`: 향후 Claude Code 세션을 위한 아키텍처/명령어 요약
- `.claude/settings.json`: 자주 쓰는 npm 명령 permissions 허용 목록, `.ts`/`.tsx` 저장 시
  ESLint 자동 실행 PostToolUse hook

### Fixed

- `<html>` 테마 속성(`data-theme`)을 하이드레이션 전 인라인 스크립트로 설정하면서 발생한
  React 하이드레이션 불일치 → `suppressHydrationWarning` 추가로 해결
- 다크모드 토글의 `document.startViewTransition`을 변수로 분리해 호출하면서 발생한
  "Illegal invocation" 런타임 에러 → `document` 객체에서 바로 메서드로 호출하도록 수정

### Verified

- `npm run build` 통과 (타입체크 + ESLint 포함)
- 로컬 임시 MongoDB 컨테이너로 시드 후 실제 브라우저에서 라이트/다크 모드, 목차 스크롤스파이,
  코드블록 하이라이팅, 헤더 검색 모달, 시리즈 네비게이션, 관련 글, 404 처리 확인
