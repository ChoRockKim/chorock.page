import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { PostModel } from "../models/Post";
import { SeriesModel } from "../models/Series";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const reactCode = `\`\`\`tsx
function ProductList({ items }: { items: Item[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.price - b.price),
    [items]
  );

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
\`\`\``;

const nextjsCode = `\`\`\`tsx
// app/posts/[slug]/page.tsx
export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <PostBody content={post.content} />
    </article>
  );
}
\`\`\``;

const posts = [
  {
    slug: "rendering-vs-commit",
    title: "렌더링과 커밋, 무엇이 다른가",
    summary:
      "React가 화면을 그리기까지 거치는 두 단계를 나눠서 보면 리렌더링 문제의 절반은 저절로 풀린다.",
    tags: ["React", "성능"],
    series: "react-deep-dive",
    publishedAt: "2026-07-02",
    content: `## 문제 상황

렌더링과 커밋을 다루면서 처음 마주친 건 생각보다 단순한 코드가 예상과 다르게 동작한다는 점이었다. state를 바꿨는데 화면이 즉시 갱신되지 않거나, 반대로 아무것도 안 바꿨는데 자식 컴포넌트가 다시 그려지는 경우가 그렇다.

## 왜 이렇게 동작할까

React는 "렌더링"과 "커밋"을 분리해서 처리한다. 렌더링 단계에서는 컴포넌트 함수를 호출해 새 트리를 계산만 하고, 실제 DOM에 반영하는 건 커밋 단계에서 한 번에 처리한다.

> 재렌더링 자체는 잘못이 아니다. 필요 없는 재렌더링이 문제다.

![렌더링과 커밋 단계 다이어그램](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800)

## 적용해보기

실제로 정렬 로직을 렌더링마다 새로 계산하던 코드를 \`useMemo\`로 감싸 봤다.

${reactCode}

이렇게 바꾸고 나니 렌더링 사이 사이의 불필요한 계산이 눈에 띄게 줄었다.

## 정리

결국 핵심은 React가 언제 다시 계산하고 언제 실제로 반영하는지 원리를 먼저 이해하고 최소한으로 손대는 것이었다. 다음 글에서 Fiber 아키텍처를 더 자세히 다뤄본다.`,
  },
  {
    slug: "fiber-architecture",
    title: "Fiber 아키텍처 이해하기",
    summary: "React 16부터 바뀐 내부 트리 구조, Fiber가 실제로 무엇을 가능하게 했는지 정리했다.",
    tags: ["React", "성능"],
    series: "react-deep-dive",
    publishedAt: "2026-07-09",
    content: `## 문제 상황

큰 리스트를 렌더링할 때 스크롤이 버벅이는 문제를 조사하다가 Fiber라는 단어를 계속 마주쳤다.

## 왜 이렇게 동작할까

Fiber는 재귀 대신 링크드 리스트 형태로 작업 단위를 쪼개, 브라우저에 제어권을 양보하며 렌더링을 이어갈 수 있게 해준다.

> 작업을 중단했다가 이어갈 수 있다는 것 자체가 Concurrent 기능의 기반이다.

## 적용해보기

우선순위가 낮은 렌더링을 \`useTransition\`으로 감싸는 실험을 해봤다.

## 정리

Fiber 자체를 직접 다룰 일은 거의 없지만, 왜 Concurrent 기능이 가능한지 이해하면 언제 그 기능을 써야 하는지도 명확해진다.`,
  },
  {
    slug: "usememo-usecallback",
    title: "useMemo와 useCallback 제대로 쓰기",
    summary: "아무데나 넣는다고 빨라지지 않는다. 언제 넣어야 실제로 이득인지 기준을 세워봤다.",
    tags: ["React", "성능", "TypeScript"],
    series: "react-deep-dive",
    publishedAt: "2026-07-14",
    content: `## 문제 상황

모든 함수와 값을 \`useMemo\`/\`useCallback\`으로 감싸는 코드를 리뷰하다가, 오히려 코드가 읽기 어려워지고 성능에도 큰 차이가 없다는 걸 발견했다.

## 왜 이렇게 동작할까

메모이제이션 자체에도 비용이 있다. 참조 비교와 캐시 관리 비용이 실제 재계산 비용보다 클 때는 오히려 손해다.

## 적용해보기

무거운 연산이거나, 참조 동일성이 자식의 \`memo\` 여부에 실제로 영향을 줄 때만 적용하도록 기준을 세웠다.

## 정리

"느려서 문제가 됐을 때" 프로파일링을 먼저 하고, 그 다음에 메모이제이션을 고려하는 순서가 맞다.`,
  },
  {
    slug: "app-router-checklist",
    title: "App Router로 넘어가기 전 체크리스트",
    summary:
      "Pages Router에서 App Router로 옮기기 전에 확인해야 할 것들을 실제 마이그레이션 경험으로 정리했다.",
    tags: ["Next.js", "TypeScript"],
    series: "nextjs-migration",
    publishedAt: "2026-06-18",
    content: `## 문제 상황

Express + SSR로 직접 만든 블로그를 Next.js로 옮기기로 하면서, Pages Router와 App Router 중 무엇으로 시작할지부터 결정해야 했다.

## 왜 이렇게 동작할까

App Router는 기본적으로 서버 컴포넌트다. 데이터 페칭이 컴포넌트 트리 안으로 들어오면서 \`getServerSideProps\` 같은 별도 함수가 필요 없어졌다.

${nextjsCode}

## 적용해보기

라우트 하나씩 옮기면서, 클라이언트 인터랙션이 필요한 부분만 \`"use client"\`로 명시적으로 분리했다.

## 정리

한 번에 전체를 옮기려 하지 않고 라우트 단위로 점진적으로 이전한 게 리스크를 줄이는 데 가장 컸다.`,
  },
  {
    slug: "server-client-boundary",
    title: "서버 컴포넌트와 클라이언트 컴포넌트 경계 설계",
    summary: "어디까지 서버에서 그리고 어디부터 클라이언트로 넘길지, 우리 팀이 세운 기준.",
    tags: ["Next.js", "React"],
    series: "nextjs-migration",
    publishedAt: "2026-06-25",
    content: `## 문제 상황

거의 모든 컴포넌트 상단에 \`"use client"\`를 붙이고 나서야, 이게 사실상 예전 SPA와 다를 게 없다는 걸 깨달았다.

## 왜 이렇게 동작할까

인터랙션(이벤트 핸들러, useState, 브라우저 API)이 필요한 leaf 컴포넌트만 클라이언트여야 번들 크기와 하이드레이션 비용이 줄어든다.

## 적용해보기

목차 스크롤 스파이, 공유 버튼, 댓글 위젯처럼 실제로 상태나 브라우저 API가 필요한 곳만 클라이언트 컴포넌트로 분리했다.

## 정리

"이 컴포넌트가 인터랙티브한가?"를 기준으로 경계를 그으면 자연스럽게 서버 컴포넌트가 기본값이 된다.`,
  },
  {
    slug: "react-native-cross-platform",
    title: "React Native로 크로스플랫폼 앱 만들며 배운 것들",
    summary: "웹과 앱에서 로직을 공유하려다 마주친 플랫폼 차이와 타협점들.",
    tags: ["React Native", "모바일"],
    series: null,
    publishedAt: "2026-07-20",
    content: `## 문제 상황

웹에서 쓰던 훅을 그대로 React Native에 가져다 썼다가, 키보드가 열릴 때 레이아웃이 깨지는 문제를 겪었다.

## 왜 이렇게 동작할까

iOS와 Android는 키보드가 레이아웃에 영향을 주는 방식이 다르고, 웹의 \`resize\` 이벤트에 대응하는 개념이 플랫폼마다 다르다.

## 적용해보기

플랫폼 차이를 숨기려 하지 않고, 플랫폼별 훅으로 명시적으로 분기했다.

## 정리

플랫폼 차이는 추상화로 감추는 것보다 인정하고 분기하는 쪽이 장기적으로 유지보수하기 쉬웠다.`,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI가 설정되어 있지 않습니다. .env.local을 확인하세요.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB Atlas에 연결되었습니다.");

  await SeriesModel.deleteMany({});
  await PostModel.deleteMany({});

  const seriesBySlug: Record<string, mongoose.Types.ObjectId> = {};
  for (const [slug, title, description] of [
    [
      "react-deep-dive",
      "React 렌더링 딥다이브",
      "React가 화면을 그리는 방식을 내부 구조부터 다시 뜯어보는 시리즈.",
    ],
    [
      "nextjs-migration",
      "Next.js 마이그레이션 실전",
      "Express 블로그를 Next.js App Router로 옮기며 겪은 결정과 실수 기록.",
    ],
  ]) {
    const doc = await SeriesModel.create({ slug, title, description });
    seriesBySlug[slug] = doc._id;
  }

  await PostModel.insertMany(
    posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      content: p.content,
      tags: p.tags,
      seriesId: p.series ? seriesBySlug[p.series] : null,
      publishedAt: new Date(p.publishedAt),
      status: "published",
    }))
  );

  console.log(`${posts.length}개 게시글, ${Object.keys(seriesBySlug).length}개 시리즈 시드 완료.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
