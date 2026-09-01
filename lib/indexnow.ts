/**
 * IndexNow ping — 콘텐츠가 발행·수정·삭제된 순간 참여 검색엔진(네이버·Bing 등)에 해당 URL을
 * 직접 알린다. 구글은 IndexNow에 참여하지 않으므로 구글 쪽은 sitemap의 lastmod가 담당한다
 * (0.7.75). api.indexnow.org 한 곳에 보내면 참여 엔진 전체에 공유된다.
 *
 * 의도적으로 "server-only"를 import하지 않는다 — scripts/seed-projects.ts(tsx로 실행되는 일반
 * Node 스크립트)도 이 모듈을 써야 하는데, server-only 패키지는 react-server 조건 밖에서 import
 * 자체가 throw한다. 키는 비밀이 아니라서 문제가 없다: IndexNow는 같은 값을
 * https://chorock.page/<key>.txt 로 공개 서빙하는 것으로 소유를 검증하므로(public/의 키 파일),
 * env로 숨겨봐야 얻는 것이 없다. 키 파일명과 아래 상수는 항상 함께 바꿔야 한다.
 */
export const INDEXNOW_KEY = "98bc6ea9b89c29eb92d330e36a4e1bd0241dc5182d10225db158303977f7cd44";

const HOST = "chorock.page";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * paths는 이미 percent-encoding까지 끝난 경로여야 한다 — 한글 슬러그는 호출부에서
 * encodeURIComponent를 거쳐 온다(sitemap·revalidatePath와 같은 규칙, CLAUDE.md 참고).
 *
 * 실패를 절대 밖으로 던지지 않는다. 발행·삭제 액션의 부수 작업일 뿐이라, 핑이 죽어도 발행은
 * 성공해야 한다. 타임아웃 4초 — IndexNow가 느려도 발행 응답이 그 이상 늘어지지 않게.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const urlList = paths.map((p) => `https://${HOST}${p}`);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(4000),
    });
    console.log(`[indexnow] ${res.status} ${urlList.length}개 URL`);
  } catch (err) {
    console.warn("[indexnow] 핑 실패(무시됨):", err instanceof Error ? err.message : err);
  }
}
