# next-blog

Express(SSR) + MongoDB Atlas + Docker + GitHub Actions + EC2로 운영하던 개인 블로그를
Next.js + MongoDB Atlas + Vercel로 옮기는 프로젝트. 현재는 게시글 상세 페이지
(`/posts/[slug]`)와 그에 필요한 최소 스캐폴딩만 구현되어 있다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local
# .env.local에 MONGODB_URI 채우기
npm run seed   # 샘플 게시글/시리즈 삽입
npm run dev
```

`http://localhost:3000/posts/rendering-vs-commit` 접속.

## 환경 변수

`.env.local.example` 참고.

- `MONGODB_URI`: MongoDB Atlas 커넥션 스트링.
- `NEXT_PUBLIC_GISCUS_*`: 댓글(giscus) 연동 값. 아래 순서로 발급받는다.
  1. GitHub에 Discussions가 활성화된 public repo 준비 (기존 블로그 repo 또는 새 repo).
  2. https://giscus.app 접속 → repo 입력 → giscus 앱 설치 승인 → 카테고리 선택.
  3. 페이지 하단에 생성되는 `data-repo-id`, `data-category-id` 값을 그대로 옮겨 적는다.
- 값을 채우지 않으면 댓글 영역에 안내 문구만 표시되고 에러 없이 동작한다.

## 배포 (Vercel)

1. 이 repo를 GitHub에 push.
2. Vercel에서 Import → 위 환경 변수를 Vercel 프로젝트 설정에 등록.
3. MongoDB Atlas는 Network Access에서 Vercel이 사용하는 아웃바운드 IP를 허용하거나(가변 IP라
   `0.0.0.0/0` + DB 사용자 별도 권한 최소화를 흔히 사용), Atlas의 Vercel 통합을 사용.

## 구현 범위

- 구현됨: 게시글 상세 페이지, 헤더(검색/다크모드), 푸터, 관련 글, 시리즈 이전/다음 글,
  목차(스크롤 스파이), 코드 블록 복사, 공유 버튼, giscus 댓글.
- 이번엔 안 함: 홈/글 목록/시리즈 목록/프로젝트/글쓰기 페이지, 기존 Express DB에서의
  실데이터 마이그레이션 스크립트, Vercel 프로젝트·Atlas 클러스터 생성 자체.

## 데이터 모델

`models/Post.ts`, `models/Series.ts` 참고. 본문은 Markdown 문자열로 저장하고,
렌더링 시점에 `lib/markdown.ts`에서 MDX로 컴파일 + 목차(h2/h3) 추출을 함께 수행한다.
