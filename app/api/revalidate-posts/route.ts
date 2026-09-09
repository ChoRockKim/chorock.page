import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";

/**
 * 글을 저장한 뒤 캐시를 비운다. **Server Action이 아니라 라우트 핸들러인 것이 요점이다.**
 *
 * Server Action 안에서 revalidatePath/Tag를 부르면 Next가 **사용자가 보고 있는 라우트까지**
 * 다시 가져온다. 그 라우트가 /posts/write라서, 발행된 글을 편집하다 저장할 때마다 편집 화면이
 * 통째로 다시 그려졌다 — 동적 라우트라 loading.tsx가 끼어들어 회색 스켈레톤이 번쩍였다
 * (브라우저에서 `_rsc=` 표식 없는 /posts/write 자기 재요청으로 확인했다. 문서 자체가
 * 새로 로드된 것은 아니어서 글이 날아가지는 않았다).
 *
 * 라우트 핸들러는 라우터 리프레시를 유발하지 않으므로, 캐시는 똑같이 비우면서 화면은 가만히 있다.
 *
 * 무효화 대상은 app/posts/write/actions.ts가 부르던 것과 같다: getCachedPosts(tags: ["posts"]),
 * /posts, 그 글의 상세, /about의 "최근 글", /series.
 */
export async function POST(request: NextRequest) {
  // 세션이 있다는 것 자체가 소유자라는 뜻이다(auth.ts의 signIn 콜백이 다른 계정을 전부 막는다).
  if (!(await auth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  revalidateTag("posts");
  revalidatePath("/posts");
  // 한글 slug는 퍼센트 인코딩해야 한다 — revalidatePath는 디코드된 세그먼트가 아니라 실제
  // 요청 경로를 키로 쓴다(CLAUDE.md 참고).
  revalidatePath(`/posts/${encodeURIComponent(slug)}`);
  revalidatePath("/about");
  revalidatePath("/series");

  return NextResponse.json({ ok: true });
}
