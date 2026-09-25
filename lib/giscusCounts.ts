import "server-only";
import { unstable_cache } from "next/cache";

/**
 * giscus 댓글 개수. giscus는 자체 API가 없고 GitHub Discussions에 그대로 저장하므로, 카테고리의
 * Discussion을 GitHub GraphQL로 긁어 `pathname → 개수` 맵을 만든다. 공개 저장소의 Discussion
 * 읽기라도 GraphQL은 인증이 필수라 서버 전용 토큰(`GISCUS_GITHUB_TOKEN`, Discussions read-only)이
 * 하나 필요하다.
 *
 * slug마다 검색하지 않고 **카테고리 전체를 한 번에** 가져오는 이유: 글이 수십 개 수준이라 GraphQL
 * 한두 페이지면 끝나고, 결과를 unstable_cache로 300초 묶어두면 목록 페이지가 아무리 열려도
 * GitHub 호출은 5분에 한 번이다. slug별 검색은 호출 수가 카드 수에 비례해 rate limit 계산이 필요해진다.
 *
 * 개수는 **댓글 + 답글 합산**이다. Discussion의 `comments.totalCount`는 최상위 댓글만 세므로
 * 각 댓글의 `replies.totalCount`를 더한다. 한 글에 최상위 댓글이 100개를 넘는 경우는 이 블로그
 * 규모에서 없다고 보고 `comments(first: 100)`만 읽는다.
 */

const ENDPOINT = "https://api.github.com/graphql";
const PAGE = 100;

type DiscussionNode = {
  title: string;
  comments: { totalCount: number; nodes: { replies: { totalCount: number } }[] };
};

type GraphQLResponse = {
  data?: {
    repository?: {
      discussions: {
        nodes: DiscussionNode[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  };
  errors?: { message: string }[];
};

const QUERY = `
  query ($owner: String!, $name: String!, $categoryId: ID!, $after: String) {
    repository(owner: $owner, name: $name) {
      discussions(first: ${PAGE}, categoryId: $categoryId, after: $after) {
        nodes {
          title
          comments(first: 100) {
            totalCount
            nodes { replies { totalCount } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

/**
 * giscus가 `data-mapping="pathname"`으로 만드는 Discussion 제목은 **앞 슬래시가 없는**
 * `posts/<slug>`이고, 한글 slug는 브라우저 `location.pathname`이 percent-encoding된 문자열이라
 * 제목도 인코딩된 채 저장된다 — 둘 다 실제 저장소의 Discussion 목록에서 확인한 사실이다
 * (`posts/app-router-3-react-server-component`, `posts/react-native-%EC%9B%B9%EC%95%B1-...`).
 * 맵 키와 조회 키를 둘 다 "앞 슬래시 제거 + 디코드"로 정규화해 두면, giscus가 나중에 슬래시나
 * 인코딩 처리를 바꿔도 어느 쪽으로 저장돼 있든 맞는다. 디코드가 실패하는 제목(`%`가 들어간
 * 일반 텍스트 등)은 원문 그대로 둔다.
 */
function normalizeTitle(title: string): string {
  const bare = title.trim().replace(/^\/+/, "");
  try {
    return decodeURIComponent(bare);
  } catch {
    return bare;
  }
}

function countOf(node: DiscussionNode): number {
  const replies = node.comments.nodes.reduce((sum, c) => sum + (c.replies?.totalCount ?? 0), 0);
  return node.comments.totalCount + replies;
}

/**
 * 카테고리 전체의 `정규화된 제목 → 댓글 수` 맵. 설정이 비어 있거나 GitHub 호출이 실패하면 빈
 * 맵을 돌려주고 절대 throw하지 않는다 — 장식성 지표가 목록 페이지를 깨면 안 된다(indexnow와
 * 같은 원칙). 타임아웃 4초.
 */
type Config = { token: string; owner: string; name: string; categoryId: string };

function readConfig(): Config | null {
  const token = process.env.GISCUS_GITHUB_TOKEN;
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  if (!token || !repo || !categoryId) return null;
  const [owner, name] = repo.split("/");
  if (!owner || !name) return null;
  return { token, owner, name, categoryId };
}

async function fetchAllCommentCounts(): Promise<Record<string, number>> {
  const config = readConfig();
  if (!config) return {};
  const { token, owner, name, categoryId } = config;

  const counts: Record<string, number> = {};
  let after: string | null = null;
  try {
    for (;;) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "chorock.page",
        },
        body: JSON.stringify({ query: QUERY, variables: { owner, name, categoryId, after } }),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn(`[giscus-counts] GitHub GraphQL ${res.status}`);
        return {};
      }
      const json = (await res.json()) as GraphQLResponse;
      if (json.errors?.length) {
        console.warn(`[giscus-counts] ${json.errors.map((e) => e.message).join("; ")}`);
        return {};
      }
      const page = json.data?.repository?.discussions;
      if (!page) return {};
      for (const node of page.nodes) {
        const key = normalizeTitle(node.title);
        counts[key] = (counts[key] ?? 0) + countOf(node);
      }
      if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
      after = page.pageInfo.endCursor;
    }
  } catch (err) {
    console.warn("[giscus-counts] 실패:", err instanceof Error ? err.message : err);
    return {};
  }
  return counts;
}

export const getCachedCommentCounts = unstable_cache(fetchAllCommentCounts, ["giscus-counts"], {
  revalidate: 300,
  tags: ["giscus-counts"],
});

/** 요청한 slug마다 댓글 수. 없는 글은 0으로 채운다(클라이언트가 빈 값을 따로 다루지 않아도 되게). */
export async function getCommentCounts(slugs: string[]): Promise<Record<string, number>> {
  // 설정이 없으면 캐시를 거치지 않는다. 빈 결과가 unstable_cache에 300초 남으면 토큰을 막 넣은
  // 뒤에도 그 시간 동안 계속 0이 나온다 — 로컬에서 실제로 겪은 일이다(Data Cache는 .next/cache에
  // 남아 서버를 재시작해도 그대로다).
  const all = readConfig() ? await getCachedCommentCounts() : {};
  return Object.fromEntries(slugs.map((slug) => [slug, all[normalizeTitle(`posts/${slug}`)] ?? 0]));
}
