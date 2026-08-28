import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { ProjectModel } from "../models/Project";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const projects = [
  {
    slug: "hufs-clock",
    title: "외대종강시계",
    summary:
      "약 140명의 학우들이 사용하는 한국외국어대학교 학생용 크롬 익스텐션 서비스",
    role: "기획·프론트엔드·백엔드(FastAPI)",
    team: "1인 개발",
    period: "Feb 2026",
    tags: [
      "React.js",
      "FastAPI",
      "React Query",
      "Zustand",
      "Vercel",
      "Vite",
      "SCSS",
      "Formspree",
      "Axios",
      "Swiper.js",
    ],
    stack: [
      {
        label: "기술 스택",
        items: [
          "React.js",
          "FastAPI",
          "React Query",
          "Zustand",
          "Vercel",
          "Vite",
          "SCSS",
          "Formspree",
          "Axios",
          "Swiper.js",
        ],
      },
    ],
    coverImage: "/projects/hufs-clock/campus-select.webp",
    coverImageFit: "cover",
    overviewMd: `'외대종강시계'는 약 140명의 학우들이 사용하는 크롬익스텐션 서비스입니다. 한국외국어대학교 학생들을 위해 개발된 웹 애플리케이션으로, 학기 종강까지 남은 시간을 실시간으로 시각화하여 보여줍니다. 단순한 디데이 기능을 넘어, 학사 일정 확인 및 캠퍼스 날씨 정보를 통합적으로 제공하여 학생들의 학기 말 동기 부여와 편의를 돕기 위해 기획되었습니다.

## 주요 기능

- 파이썬의 FastAPI를 통해 데이터를 처리
- Swiper.js를 활용한 웹앱 스타일 UI 구현
- Zustand & Chrome Storage를 연동한 실시간 상태 관리
- React Query를 통한 데이터 캐싱 및 로딩 최적화
- 기상청 단기예보 API를 활용한 날씨 위젯

## 스크린샷

![메인 화면](/projects/hufs-clock/seoul-main.webp)

![야간 모드](/projects/hufs-clock/seoul-night.webp)

![위젯 화면](/projects/hufs-clock/widget.webp)

![타임라인](/projects/hufs-clock/timeLine.webp)`,
    demoUrl: "https://hufsclock2026.vercel.app/",
    repoUrl: "https://github.com/ChoRockKim/HUFS_Clock_REACT_CHROME_EXTENSION",
    playStoreUrl: null,
    appStoreUrl: null,
    publishedAt: "2026-03-01",
  },
  {
    slug: "fora",
    title: "ForA(포에이)",
    summary: "국내 최초 ADHD 커뮤니티 앱, 앱스토어·구글 플레이스토어 서비스 중",
    role: "프론트엔드 개발 및 유지보수 (인수인계)",
    team: "포에이 창업팀 (기획·디자인·백엔드·프론트엔드)",
    period: "2026.01 — 현재",
    tags: ["React Native", "Expo", "Tanstack Query", "React-Hook-Form"],
    stack: [
      {
        label: "기술 스택",
        items: ["React Native", "Expo", "Tanstack Query", "React-Hook-Form"],
      },
    ],
    coverImage: "/projects/fora/forA-thumbnail.webp",
    coverImageFit: "contain",
    overviewMd: `국내 최초의 ADHD 커뮤니티 앱입니다. Expo(React Native) 한 코드베이스로 iOS·Android를 함께 빌드하며, 앱스토어와 구글 플레이스토어에서 서비스 중입니다. 전임 개발자가 초기 구축을 마쳐둔 코드베이스를 2026년 4월에 인수인계받아, 이후 프론트엔드 개발과 유지보수를 맡고 있습니다.

## 맡은 일

- 창업팀의 기획자·디자이너·백엔드 개발자와 한 팀으로 일합니다. 서버 API는 백엔드가, 화면 설계는 디자이너가 맡고, 저는 앱 구현과 스토어 릴리즈를 담당합니다.
- 합류 후 첫 3개월은 코드가 아니라 제품 파악에 썼습니다. 도메인 리서치와 기획 참여로 이 앱이 무엇을 해결하려는 물건인지부터 익힌 뒤, 4월에 저장소를 넘겨받아 개발에 들어갔습니다.
- 인수인계 이후 제가 붙인 주력 영역은 건강 매거진 전반과 소셜 로그인입니다. 비밀번호 찾기, 어드민 전용 사용자 조회도 맡았습니다.
- 남이 만든 코드베이스를 이어받은 만큼, 파악한 내용을 도메인별 문서로 남기면서 작업했습니다. 문서가 없는 상태로 넘겨받았을 때 무엇이 힘든지 겪었기 때문입니다.

## 주요 기능

- 건강 매거진 — 전문가 기사 작성·수정·삭제, 댓글과 대댓글, 좋아요·조회수, 인기순·급상승 카테고리 탐색
- 소셜 로그인 — 네이버·애플 로그인 클라이언트 연동. 애플은 서드파티 로그인이 하나라도 있으면 App Store 심사에서 필수라 함께 붙였습니다.
- 마크다운 기사 렌더링 — 이미지는 본문에서 떼어내 전체화면 뷰어로 열고, 링크는 외부 브라우저로 넘깁니다.
- 비밀번호 찾기, 어드민 전용 사용자 조회

## 설계 판단

### 매거진 마크다운 렌더러 교체

특정 줄의 글자가 잘려 보이는 버그가 있었습니다. 전임자가 쓰던 마크다운 라이브러리에서 나는 문제였습니다.

그 라이브러리를 계속 우회하며 쓸지, 다른 것으로 갈아탈지 저울질했습니다. 확인해보니 해당 라이브러리는 유지보수가 곧 끊길 예정이었습니다. 지금 버그를 우회해도 다음 Expo SDK 업그레이드에서 또 막힐 게 뻔했습니다.

호환성이 좋은 라이브러리로 마이그레이션했습니다. 눈앞의 버그만 고치는 것보다 비용이 컸지만, 유지보수가 끊길 의존성을 앱의 핵심 화면에 남겨두지 않는 편이 낫다고 판단했습니다.

### 작업 로그와 규칙을 문서로 고정

커밋 메시지에는 무엇을 바꿨는지만 남습니다. 왜 그 방향을 골랐는지, 논의했지만 이번에 하지 않은 게 무엇인지, 되돌릴 때 무엇을 조심해야 하는지는 작업이 끝나면 사라집니다. 문서 없는 코드베이스를 넘겨받아 고생한 직후라 이 손실이 특히 크게 느껴졌습니다.

작업 단위마다 로그를 남기기로 하고, 규칙을 정할 때마다 대안을 함께 적었습니다. 로그 위치는 매 세션 자동으로 읽히는 규칙 폴더가 아니라 일반 문서 폴더로 정했습니다. 로그가 쌓이면 컨텍스트를 계속 잡아먹기 때문입니다.

인덱스 파일은 일부러 만들지 않았습니다. 파일명을 날짜로 시작하게 해 목록이 저절로 시간순으로 정렬되게 했고, 인덱스는 갱신을 한 번만 빼먹어도 거짓말이 되기 때문입니다. 같은 이유로 템플릿 원본도 한 곳에만 뒀습니다. 과거에 두 문서가 서로 반대되는 지침을 담고 있던 전례가 있었습니다.

## 문제 해결

### 애플 재로그인 때 이름·이메일이 null로 오던 문제

로그인은 되는데 이름과 이메일이 비어서 왔습니다. 연동 코드를 의심하기 딱 좋은 증상이었습니다.

실기기로 1회차와 2회차 로그인을 나눠서 확인했습니다. 1회차에는 두 값이 정상적으로 왔고, 2회차부터는 둘 다 null이었습니다. 사용자 식별자는 두 번 다 동일하게 왔습니다. 즉 코드 문제가 아니라 애플이 개인정보를 최초 1회만 내려주는 정책이었습니다.

문서로만 알던 전제를 실측으로 확정한 셈입니다. 이 사실이 서버 설계로 이어졌습니다 — 서버가 첫 응답을 저장하지 못하면 재로그인으로는 복구할 방법이 없으므로, 최초 응답 저장을 필수 조건으로 못 박았습니다.

재테스트하려면 iOS 설정에서 앱 연결을 해제해야 한다는 것도 함께 문서에 남겼습니다. 이걸 모르면 멀쩡한 코드를 계속 고치게 되기 때문입니다.

### 소셜 로그인 제공자가 카카오에서 네이버로 바뀐 것

백엔드에 넘기기 직전이던 카카오 연동 문서가 클라이언트 요청으로 무용지물이 될 상황이었습니다.

먼저 실제로 버릴 게 얼마나 되는지부터 확인했습니다. 앱 코드는 아직 착수 전이었고, 의존성 목록과 소스 어디에도 카카오 흔적이 없다는 것을 직접 확인했습니다. 버릴 구현은 없었습니다.

문서 쪽은 전환 비용이 예상보다 작았습니다. 식별자를 제공자와 분리해 다룬 것, 소셜 토큰과 자체 토큰을 분리한 것, 신규 회원에게 401을 쓰지 않기로 한 것, 2단계 가입 구조 — 이 판단들이 제공자와 무관하게 그대로 유효했기 때문입니다. 실제로 다시 쓴 것은 검증 단계 한 절과 필드 매핑 표뿐이었습니다.

그래서 카카오 문서를 지우지 않고 legacy로 남겼습니다. 제공자와 무관한 설계 판단의 근거가 그 문서에만 있었기 때문입니다. 네이버 문서에는 결론만 옮겼습니다. 이어서 네이버 공식 문서를 직접 확인해, 추측으로 적어둔 두 군데를 찾아 정정했습니다.

## 성과와 한계

- 앱 전체 누적 지표는 다운로드 1,450건, 가입 회원 1,000명 이상입니다. 전임자가 만든 시기까지 포함한 수치입니다.
- 인수인계 이후 매거진 기능을 확장하고 소셜 로그인을 붙여 스토어 릴리즈까지 이어가고 있습니다.
- 소셜 로그인은 아직 진행 중입니다. 네이버·애플 모두 클라이언트 연동까지 마쳤고 서버 연동과 사전 검수가 남아 있습니다.
- 테스트 코드가 없습니다. 작업 규칙 문서에 검증 기준은 세워뒀지만 자동화된 테스트는 아직 없어서, 회귀 확인이 실기기 수동 검증에 의존합니다.

## 스크린샷

![배너](/projects/fora/forA-banner.webp) ![배너2](/projects/fora/forA-banner2.webp)

![화면1](/projects/fora/forA1.webp) ![화면2](/projects/fora/forA2.webp)

![화면3](/projects/fora/forA3.webp)
`,
    demoUrl: null,
    repoUrl: null,
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.fora.appfora&hl=ko",
    appStoreUrl:
      "https://apps.apple.com/kr/app/fora-adhd-%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0-%EC%95%BD%EC%A0%95%EB%B3%B4-%EB%A7%A4%EA%B1%B0%EC%A7%84/id6736352280",
    publishedAt: "2026-06-30",
  },
  {
    slug: "node-blog",
    title: "기술 블로그",
    summary:
      "Node.js Express로 만든 토이 블로그 사이트 (chorock.page 이전 버전)",
    role: "기획·프론트엔드·백엔드·인프라",
    team: "1인 개발",
    period: "Mar 2026",
    tags: [
      "MongoDB Atlas",
      "Node.js",
      "Express",
      "Docker",
      "GitHub Actions",
      "AWS EC2",
      "Socket.io",
      "AWS S3",
      "Toast Ui Editor",
    ],
    stack: [
      {
        label: "기술 스택",
        items: [
          "MongoDB Atlas",
          "Node.js",
          "Express",
          "Docker",
          "GitHub Actions",
          "AWS EC2",
          "Socket.io",
          "AWS S3",
          "Toast Ui Editor",
        ],
      },
    ],
    coverImage: "/projects/node-blog/nodeblog-main.webp",
    coverImageFit: "cover",
    overviewMd: `Node.js Express로 만든 토이 블로그 사이트입니다. 글 작성/수정/삭제, 댓글 작성/수정/삭제, 쪽지 기능, 프로필 설정 기능을 구현했습니다. 이후 이 블로그를 Next.js로 다시 만들었고, 그 결과물이 [chorock.page](/projects/chorock-page)입니다.

## 주요 기능

- 세션 방식을 통해 로그인 기능 구현, 관리자 기능 존재
- 회원가입 및 로그인 시 유효성 검사
- MongoDB skip, limit 으로 페이지네이션 구현
- nodemailer 로 사용자 이메일 인증 방식 구현
- multer + S3 통해 이미지 업로드 구현, 프로필 사진 구현
- Search Index로 조회 성능 향상
- 글 리스트 조회 성능 향상을 위해 비정규화 (글 정보 DB에 유저 이름, id 등 추가)
- 웹소켓 Socket.io 로 채팅기능 구현
- Docker + Github Actions로 CI/CD 파이프라인 구성

## 스크린샷

![상세 페이지](/projects/node-blog/nodeblog-detail.webp)

![글쓰기](/projects/node-blog/nodeblog-write.webp)

![로그인](/projects/node-blog/desktop-login.webp)

`,
    demoUrl: null,
    repoUrl: "https://github.com/ChoRockKim/Node-blog",
    playStoreUrl: null,
    appStoreUrl: null,
    publishedAt: "2026-02-01",
  },
  {
    slug: "chorock-page",
    title: "chorock.page",
    summary:
      "직접 운영하던 Express 블로그를 Next.js App Router로 다시 만든 개인 블로그 (지금 이 사이트)",
    role: "기획·프론트엔드·백엔드·배포",
    team: "1인 개발",
    period: "2026.07 — 현재",
    tags: ["Next.js", "React", "TypeScript", "MongoDB Atlas", "Mongoose", "Vercel", "Auth.js"],
    stack: [
      {
        label: "프론트엔드",
        items: ["Next.js (App Router)", "React 19", "TypeScript", "TanStack Query"],
      },
      {
        label: "백엔드·데이터",
        items: ["MongoDB Atlas", "Mongoose", "Auth.js (GitHub OAuth)", "AWS S3"],
      },
      {
        label: "콘텐츠·배포",
        items: ["remark / rehype", "Shiki", "Vercel", "giscus"],
      },
    ],
    coverImage: null,
    coverImageFit: "cover",
    overviewMd: `Express(SSR) + MongoDB + Docker + EC2로 직접 운영하던 개인 블로그를 Next.js App Router + MongoDB Atlas + Vercel 조합으로 다시 만든 프로젝트입니다. 지금 보고 계신 이 사이트이고, 글 19편과 시리즈 4개를 운영하고 있습니다. 옛 블로그의 게시글을 실제로 이관해서, 예전 링크가 죽지 않은 채로 갈아탔습니다.

## 맡은 일

- 기획, 프론트엔드, 백엔드(데이터 모델·API), 배포까지 1인 개발.
- 디자인 시스템도 직접 수립했습니다. 여러 예시 자료를 참고해 Claude Design에서 "Broadsheet"라는 시스템을 만들고, 색·타이포그래피·간격 스케일 중 이 사이트가 실제로 쓰는 범위만 골라 CSS 커스텀 프로퍼티로 옮겼습니다. Tailwind나 CSS-in-JS는 쓰지 않았습니다.
- 그 디자인 시스템을 AI 에이전트에 따로 학습시켰습니다. 새 화면을 붙일 때도 색·타이포그래피·간격이 처음 정한 규칙에서 벗어나지 않게 하려는 것이었고, 덕분에 화면이 늘어나도 톤이 흔들리지 않았습니다.
- AI 에이전트를 적극적으로 썼지만, 산출물을 그대로 믿지 않는 것을 규칙으로 삼았습니다. 변경마다 "이전 상태 → 무엇을 바꿨나 → 어떻게 확인했나"를 기록으로 남기고, 배포 후에는 프로덕션을 직접 확인해 검증했습니다. 아래 문제 해결 두 건 모두 이 습관에서 나왔습니다.

## 주요 기능

- 글·시리즈·프로젝트 3종 콘텐츠와 마크다운 렌더링 — 코드 하이라이팅, 목차 스크롤스파이, 읽는 시간 추정
- GitHub 계정으로 소유자만 통과시키는 인증 뒤에 붙인 글쓰기·수정 에디터. 이미지를 붙여넣으면 자동으로 업로드되고, 미리보기는 실제 발행에 쓰는 렌더 파이프라인을 그대로 호출해 결과가 어긋나지 않습니다.
- 옛 블로그 게시글 이관 — 옛 문서의 식별자를 보존해 upsert 키로 삼아 스크립트를 몇 번 다시 돌려도 안전하고, 옛 주소로 들어와도 새 주소로 넘어갑니다.
- 글마다 제목이 박힌 공유 미리보기 이미지를 요청 시 생성
- giscus 댓글, 헤더 검색(Cmd+K), 다크 모드

## 설계 판단

### 목록 필터링을 서버 왕복에서 클라이언트 처리로

태그를 누를 때마다 DB를 다시 왕복하고 있었습니다. 프로덕션 빌드에서도 클릭 한 번에 140~250ms가 걸렸고, 개발 환경에서는 더 느렸습니다.

서버 페이지네이션을 유지하며 쿼리를 최적화할지, 목록 전체를 한 번만 받아 로컬에서 거를지 저울질했습니다. 글이 수십 편 규모라 전부 받아도 부담이 없다고 판단해 후자를 골랐습니다.

클릭 반응이 즉시로 바뀌었습니다. 대신 글이 크게 늘면 되돌려야 하는 선택이라, 서버 페이지네이션 함수를 지우지 않고 남겨뒀습니다.

### 인증 확인을 클라이언트로 내려 정적 렌더링을 지킴

로그인 링크를 화면 하단 공통 영역에서 서버 측으로 판별했더니, 그 영역이 모든 페이지에 들어가는 탓에 쿠키를 읽는 순간 사이트 전체가 매 요청 렌더링으로 넘어갔습니다. 빌드 출력의 라우트 표시가 정적에서 동적으로 바뀐 것을 보고 알아챘습니다.

인증 표시가 필요한 자리만 클라이언트 컴포넌트로 떼어내 세션을 조회하도록 바꿨습니다. 목록·소개·프로젝트 페이지의 정적 렌더링을 되찾았습니다.

보안이 아니라 표시 용도의 분기라 클라이언트로 내려도 안전합니다. 실제 접근 차단은 미들웨어가 맡습니다.

## 문제 해결

### 공유 미리보기에 글 제목 대신 내 프로필 사진이 뜨던 문제

메신저에 링크를 공유하면 미리보기가 엉뚱하게 나왔습니다. 캐시 문제로 짐작하기 쉬운 증상이었습니다.

프로덕션 주소를 직접 호출해보니 미리보기 이미지 주소가 500을 반환하고 있었습니다. 스크래퍼가 실패한 이미지 대신 페이지의 첫 번째 이미지, 즉 작성자 프로필 사진을 가져간 것이었습니다. 런타임 로그에서 폰트 파일을 찾지 못한다는 오류를 확인했고, 원인은 이미지 생성에 쓰는 한글 폰트를 실행 시점에 디스크에서 읽는데 그 폴더가 서버리스 함수 번들에 포함되지 않는다는 것이었습니다.

빌드 도구가 이 읽기를 추적하지 못해 경고조차 없었습니다. 게다가 사이트 공용 이미지 하나는 빌드 시점에 미리 만들어져 정상이었던 탓에, 문제가 더 가려져 있었습니다.

번들에 폰트를 명시적으로 포함시켜 해결했습니다. 더해서 폰트를 못 찾더라도 500 대신 글자 없이라도 응답하도록 바꿔, 같은 실패가 재발해도 프로필 사진이 새지 않게 했습니다. 배포 후 실제 이미지를 내려받아 한글 제목이 들어간 것까지 확인했습니다.

### 상세 페이지 진입이 느리던 문제

원인이 하나가 아니었습니다. 셋을 분리해 각각 처리한 뒤에야 체감이 달라졌습니다.

첫째, 페이지가 매 방문마다 DB를 조회하고 마크다운을 다시 컴파일하고 있었습니다. 미리 생성해두고 주기적으로 갱신하는 방식으로 바꿨습니다.

둘째, 메타데이터 생성과 페이지 본문이 같은 글을 각각 조회해 한 번의 요청에 중복 쿼리가 나가고 있었습니다. 요청 단위 캐시로 묶었습니다.

셋째, 소유자 전용 버튼을 그리려고 부른 인증 조회가 이 페이지를 매 요청 렌더링으로 묶어두고 있었습니다. 위 설계 판단과 같은 방식으로 떼어냈습니다.

## 성과와 한계

- 공유 미리보기가 2주 넘게 전부 깨져 있던 것을 운영 로그에서 발견해 고쳤고, 배포 후 실제 정상 응답을 확인했습니다.
- 변경 76건을 "이전 상태 → 변경 → 검증" 형식으로 기록해두고 있어, 몇 달 전 판단의 이유를 지금도 되짚을 수 있습니다.
- 검색은 제목·요약·태그 정규식 매칭이라 본문은 걸리지 않습니다. 글이 늘면 전문 검색 인덱스로 옮겨야 합니다.
- 테스트 스위트가 없습니다. 지금은 빌드(타입 체크·린트 포함)가 유일한 정합성 게이트입니다.
`,
    demoUrl: "https://chorock.page",
    repoUrl: "https://github.com/ChoRockKim/chorock.page",
    playStoreUrl: null,
    appStoreUrl: null,
    publishedAt: "2026-07-30",
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI가 설정되어 있지 않습니다. .env.local을 확인하세요.",
    );
  }

  await mongoose.connect(uri);
  console.log("MongoDB Atlas에 연결되었습니다.");

  for (const p of projects) {
    await ProjectModel.updateOne(
      { slug: p.slug },
      {
        $set: {
          title: p.title,
          summary: p.summary,
          role: p.role,
          team: p.team,
          period: p.period,
          tags: p.tags,
          stack: p.stack,
          overviewMd: p.overviewMd,
          coverImage: p.coverImage,
          coverImageFit: p.coverImageFit,
          demoUrl: p.demoUrl,
          repoUrl: p.repoUrl,
          playStoreUrl: p.playStoreUrl,
          appStoreUrl: p.appStoreUrl,
          publishedAt: new Date(p.publishedAt),
          status: "published",
        },
      },
      { upsert: true },
    );
  }

  console.log(`${projects.length}개 프로젝트 upsert 완료.`);

  // 이 배열이 프로젝트 목록의 유일한 source of truth — 배열에서 뺀 프로젝트는 DB에서도 삭제.
  const currentSlugs = projects.map((p) => p.slug);
  const { deletedCount } = await ProjectModel.deleteMany({
    slug: { $nin: currentSlugs },
  });
  console.log(`배열에 없는 프로젝트 ${deletedCount}개 삭제.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
