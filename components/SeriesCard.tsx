import Link from "next/link";
import type { SeriesSummary } from "@/lib/series";

/**
 * /series 목록의 카드 한 장. 구조는 components/ProjectCard.tsx를 그대로 따른다 —
 * 16:9 커버 박스 + 그 아래 메타.
 *
 * **커버가 `next/image`가 아니라 CSS로 그린 배너라는 점만 다르다.** Series 모델에는 커버 이미지
 * 필드가 없고, 대신 쓸 만한 포스트 커버도 없다(Post.coverImage는 존재하지만 실제 데이터 33건 중
 * 0건이 값을 갖는다). 배너를 CSS로 그리면 채워 넣을 이미지도, 새 DB 필드도, 네트워크 요청도
 * 필요 없고 — 새 시리즈를 만들면 아무 작업 없이 배너가 따라 생긴다. 나중에 진짜 커버 이미지를
 * 쓰고 싶어지면 Series에 coverImage를 추가하고 여기서 분기하면 된다.
 *
 * **제목(`<h3>`)은 배너 *안에* 있고 배너 밖에는 없다.** 참고한 레퍼런스는 커버 아래에 제목
 * 라벨이 따로 있지만, 거기선 커버가 이미지라 그 안의 문구가 라벨과 다른 아트워크였다. 여기서는
 * 배너 문구가 곧 시리즈 제목이라, 아래에 또 쓰면 같은 문자열이 두 번 나온다(실제로 그렇게
 * 만들어 보고 확인했다). 제목을 배너 안으로 넣으면 중복이 사라지면서도 heading은 그대로 남는다.
 *
 * `next/link`를 쓴다(`next-view-transitions` 아님) — /series는 View Transition 경로가 아니다.
 */
export default function SeriesCard({ series }: { series: SeriesSummary }) {
  return (
    <Link href={`/series/${series.slug}`} className="series-card">
      <div className="series-banner">
        <h3 className="series-banner-title">{series.title}</h3>
        <span className="series-banner-rule" aria-hidden />
      </div>

      {/* 설명은 실데이터가 전부 비어 있다. 빈 <p>는 공백만 만드니 있을 때만 그린다
          (나중에 채우면 자동으로 살아난다). */}
      {series.description?.trim() && <p className="card-body">{series.description}</p>}

      <p className="card-meta" style={{ margin: 0 }}>
        {series.count}개의 포스트
        {series.lastUpdated && ` · 마지막 업데이트 ${series.lastUpdated}`}
      </p>
    </Link>
  );
}
