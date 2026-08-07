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
    role: "프론트엔드 유지보수 및 기능 개발",
    team: "포에이 팀",
    period: "2026.03 — 2026.06",
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

약 6개월 동안 앱의 유지/보수 및 기능개발을 맡았습니다.

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
    overviewMd: `Node.js Express로 만든 토이 블로그 사이트입니다. 글 작성/수정/삭제, 댓글 작성/수정/삭제, 쪽지 기능, 프로필 설정 기능을 구현했습니다. 현재 지속적으로 고도화 중입니다.

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

## Next.js로 재구축

이후 이 프로젝트를 Next.js(App Router) + MongoDB Atlas + Vercel 조합으로 다시 만들었습니다.
Express 서버를 직접 운영하던 방식에서 벗어나, 지금 이 사이트(chorock.page)가 그 결과물입니다.

- 기존 forum DB의 실제 게시글 데이터를 마이그레이션 — 옛 forum 문서의 \`_id\`를 \`legacyId\`로
  보존해두고, 이걸 upsert 키로 삼아 스크립트를 몇 번을 다시 돌려도 안전하게 만들었습니다.
  옛 \`/detail/:id\` 링크도 새 슬러그로 308 리다이렉트되게 남겨뒀습니다.
- 게시글 본문을 MDX가 아니라 remark→rehype 파이프라인으로 직접 렌더링하기로 결정했습니다.
  마이그레이션한 실제 글 중 하나가 본문에 \`{ error }\`처럼 중괄호가 들어간 문장을 포함하고
  있었는데, MDX 컴파일러가 이걸 JS 표현식으로 오인해 렌더링 시점에 에러를 던지는 걸 실제로
  겪은 뒤 내린 결정입니다.
- 글 목록의 태그 필터·페이지네이션을 서버 라운드트립 대신 클라이언트 처리로 바꿔서, 필터를
  클릭할 때마다 매번 새로 페이지를 요청하던 지연을 없앴습니다.
- 세션 기반 로그인/댓글 시스템 대신 giscus(GitHub Discussions)로 댓글을 교체하고, Vercel에
  배포해 서버를 직접 운영할 필요가 없어졌습니다.

## 스크린샷

![상세 페이지](/projects/node-blog/nodeblog-detail.webp)

![글쓰기](/projects/node-blog/nodeblog-write.webp)

![로그인](/projects/node-blog/desktop-login.webp)

`,
    demoUrl: "https://chorock.page",
    repoUrl: "https://github.com/ChoRockKim/chorock.page",
    playStoreUrl: null,
    appStoreUrl: null,
    publishedAt: "2026-02-01",
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
