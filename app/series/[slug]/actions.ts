"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pingIndexNow } from "@/lib/indexnow";
import { PostModel } from "@/models/Post";
import { SeriesModel } from "@/models/Series";

/**
 * 시리즈 안의 글 순서를 저장한다.
 *
 * 실패는 `throw`가 아니라 `{ error }`로 돌려준다 — Next.js는 Server Action에서 던져진 오류를
 * 프로덕션에서 전부 "An error occurred..."로 덮어버려서, 의도한 안내 문구가 사용자에게
 * 도달하지 못한다(app/posts/write/actions.ts의 ActionResult 규칙과 동일).
 */
export async function reorderSeriesPosts(
  seriesSlug: string,
  orderedSlugs: string[]
): Promise<{ error: string } | { ok: true }> {
  // 버튼이 소유자에게만 보인다는 사실을 믿지 않는다. 액션에서 다시 확인한다.
  const session = await auth();
  if (!session) return { error: "로그인이 필요합니다." };

  await connectToDatabase();

  const series = await SeriesModel.findOne({ slug: seriesSlug }).lean<{ _id: unknown } | null>();
  if (!series) return { error: "시리즈를 찾지 못했습니다." };

  const current = await PostModel.find(
    { seriesId: series._id, status: "published" },
    { slug: 1 }
  ).lean<{ slug: string }[]>();

  // 넘어온 목록이 이 시리즈의 published 글 집합과 정확히 일치해야 한다. 저장하는 사이에 다른
  // 탭에서 글이 추가·삭제되면 여기서 걸린다 — 그대로 쓰면 일부만 번호가 붙어 null이 섞이고,
  // 그러면 정렬이 어긋난다(lib/series.ts의 compareSeriesPosts 주석 참고).
  const currentSet = new Set(current.map((p) => p.slug));
  const incomingSet = new Set(orderedSlugs);
  const sameSize =
    incomingSet.size === orderedSlugs.length && incomingSet.size === currentSet.size;
  const sameMembers = sameSize && orderedSlugs.every((s) => currentSet.has(s));
  if (!sameMembers) {
    return { error: "그 사이 글 목록이 바뀌었습니다. 새로고침 후 다시 시도해주세요." };
  }

  // 전부 다시 쓴다. 일부만 쓰면 한 시리즈 안에 null과 숫자가 섞인다.
  await PostModel.bulkWrite(
    orderedSlugs.map((slug, i) => ({
      updateOne: { filter: { slug }, update: { $set: { seriesOrder: i + 1 } } },
    }))
  );

  // 순서는 시리즈 목록 카드(미리보기 목차)·시리즈 상세·각 글의 이전/다음에 모두 나타난다.
  // 한글 슬러그는 percent-encoding이 필수다 — 안 하면 조용히 무효화에 실패한다(CHANGELOG 0.7.29).
  revalidateTag("posts");
  revalidatePath("/series");
  revalidatePath(`/series/${encodeURIComponent(seriesSlug)}`);
  for (const slug of orderedSlugs) {
    revalidatePath(`/posts/${encodeURIComponent(slug)}`);
  }
  await pingIndexNow([`/series/${encodeURIComponent(seriesSlug)}`]);

  return { ok: true };
}
