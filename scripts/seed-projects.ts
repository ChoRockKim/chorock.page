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
    role: "프론트엔드 개발 및 유지보수",
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
    overviewMd: `포에이는 국내 최초의 ADHD 커뮤니티 앱으로, 현재 앱스토어 및 구글 플레이스토어에서 서비스 중입니다.

- 주요 기능: 커뮤니티, 매거진, 약 정보 및 리뷰 서비스
- 성과: 다운로드 수 1,450건 / 가입 회원 1,000+명 돌파

2026년 1월부터 창업팀의 기획자·디자이너·백엔드 개발자와 한 팀으로 앱의 유지·보수와 기능 개발을 맡고 있습니다.

## 주요 기능

- 게시글/매거진 UI 안정화, 로딩·오류 처리 개선, 키보드/레이아웃 이슈 해결을 주도
- 매거진 카테고리, 인기순·급상승 탐색, 작성 오류 처리, 댓글/좋아요/알림, 작성·수정·삭제 기능을 확장해 콘텐츠 서비스를 고도화
- EAS 기반 배포 문서와 운영 가이드를 정리해 릴리즈 프로세스와 유지보수 체계를 체계화

## 스크린샷

![배너](/projects/fora/forA-banner.webp) ![배너2](/projects/fora/forA-banner2.webp)

![화면1](/projects/fora/forA1.webp) ![화면2](/projects/fora/forA2.webp)

![화면3](/projects/fora/forA3.webp)`,
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
- 디자인은 직접 만들지 않았습니다. Claude Design의 "Broadsheet" 디자인 시스템을 가져와 이 사이트가 실제로 쓰는 범위만 추려 옮겼고, 데모용 요소는 의도적으로 제외했습니다.
- AI 에이전트를 적극적으로 썼지만, 산출물을 그대로 믿지 않는 것을 규칙으로 삼았습니다. 변경마다 "이전 상태 → 무엇을 바꿨나 → 어떻게 확인했나"를 기록으로 남기고, 배포 후에는 프로덕션을 직접 확인해 검증했습니다. 아래 문제 해결 두 건 모두 이 습관에서 나왔습니다.

## 주요 기능

- 글·시리즈·프로젝트 3종 콘텐츠와 마크다운 렌더링 — 코드 하이라이팅, 목차 스크롤스파이, 읽는 시간 추정
- GitHub 계정으로 소유자만 통과시키는 인증 뒤에 붙인 글쓰기·수정 에디터. 이미지를 붙여넣으면 자동으로 업로드되고, 미리보기는 실제 발행에 쓰는 렌더 파이프라인을 그대로 호출해 결과가 어긋나지 않습니다.
- 옛 블로그 게시글 이관 — 옛 문서의 식별자를 보존해 upsert 키로 삼아 스크립트를 몇 번 다시 돌려도 안전하고, 옛 주소로 들어와도 새 주소로 넘어갑니다.
- 글마다 제목이 박힌 공유 미리보기 이미지를 요청 시 생성
- giscus 댓글, 헤더 검색(Cmd+K), 다크 모드

## 설계 판단

**목록 필터링을 서버 왕복에서 클라이언트 처리로.** 태그를 누를 때마다 DB를 다시 왕복해 프로덕션 빌드에서도 140~250ms가 걸렸습니다. 서버 페이지네이션을 유지할지, 목록 전체를 한 번만 받아 로컬에서 거를지 저울질했고, 글이 수십 편 규모라 후자를 골랐습니다. 클릭 반응이 즉시로 바뀌었고, 대신 글이 크게 늘면 되돌려야 하므로 서버 페이지네이션 함수를 지우지 않고 남겨뒀습니다.

**인증 확인을 클라이언트로 내려 정적 렌더링을 지킴.** 로그인 링크를 화면 하단 공통 영역에서 서버 측으로 판별했더니, 그 영역이 모든 페이지에 들어가는 탓에 쿠키를 읽는 순간 사이트 전체가 매 요청 렌더링으로 넘어갔습니다. 빌드 출력의 라우트 표시가 정적에서 동적으로 바뀐 것을 보고 알아챘습니다. 인증 표시가 필요한 자리만 클라이언트 컴포넌트로 떼어내 세션을 조회하도록 바꿔 목록·소개·프로젝트 페이지의 정적 렌더링을 되찾았습니다. 보안이 아니라 표시 용도의 분기라 클라이언트로 내려도 안전하고, 실제 접근 차단은 미들웨어가 맡습니다.

## 문제 해결

**공유 미리보기에 글 제목 대신 내 프로필 사진이 뜨던 문제.** 메신저에 링크를 공유하면 미리보기가 엉뚱하게 나왔습니다. 캐시 문제로 짐작하기 쉬웠지만, 프로덕션 주소를 직접 호출해보니 미리보기 이미지 주소가 500을 반환하고 있었습니다 — 스크래퍼가 실패한 이미지 대신 페이지의 첫 번째 이미지, 즉 작성자 프로필 사진을 가져간 것이었습니다. 런타임 로그에서 폰트 파일을 찾지 못한다는 오류를 확인했고, 원인은 이미지 생성에 쓰는 한글 폰트를 실행 시점에 디스크에서 읽는데 그 폴더가 서버리스 함수 번들에 포함되지 않는다는 것이었습니다. 빌드 도구가 이 읽기를 추적하지 못해 경고조차 없었고, 사이트 공용 이미지 하나는 빌드 시점에 미리 만들어져 정상이었던 탓에 문제가 가려져 있었습니다. 번들에 폰트를 명시적으로 포함시켜 해결했고, 폰트를 못 찾더라도 500 대신 글자 없이라도 응답하도록 바꿔 같은 실패가 재발해도 프로필 사진이 새지 않게 했습니다. 배포 후 실제 이미지를 내려받아 한글 제목이 들어간 것까지 확인했습니다.

**상세 페이지 진입이 느리던 문제.** 원인이 하나가 아니었습니다. 첫째, 페이지가 매 방문마다 DB를 조회하고 마크다운을 다시 컴파일하고 있어 미리 생성해두고 주기적으로 갱신하는 방식으로 바꿨습니다. 둘째, 메타데이터 생성과 페이지 본문이 같은 글을 각각 조회해 한 번의 요청에 중복 쿼리가 나가던 것을 요청 단위 캐시로 묶었습니다. 셋째, 소유자 전용 버튼을 그리려고 부른 인증 조회가 이 페이지를 매 요청 렌더링으로 묶어두고 있어 위 설계 판단과 같은 방식으로 떼어냈습니다. 셋을 분리해 각각 처리한 뒤에야 체감이 달라졌습니다.

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
