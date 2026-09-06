import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import RevealBlocks from "@/components/RevealBlocks";

/**
 * 프로젝트 개요 본문에서 지정한 h2 섹션만 카드로 감싸 강조한다(맡은 일 · 성과와 한계).
 *
 * **마크다운은 페이지에서 한 번만 컴파일한다.** 섹션별로 `compileMarkdown`을 나눠 부르면 호출마다
 * `GithubSlugger`가 새로 만들어져 중복 제목의 id 접미사가 달라지고, 목차 앵커가 조용히 깨진다
 * (`components/RevealBlocks.tsx`가 섹션을 재컴파일하지 않는 이유와 같은 함정). 그래서 여기서는
 * 이미 컴파일된 결과의 **자식 배열을 잘라 묶기만** 한다 — 엘리먼트를 다시 만들지 않으므로 id가
 * 그대로 살아 있고, 목차 링크와 스크롤스파이가 손대지 않은 채로 동작한다.
 *
 * `rehypeReact`는 최상위 블록들을 Fragment의 자식으로 내놓는다(`RevealBlocks`가 그 자식들을
 * DOM에서 순회하고 있고, globals.css의 `.pd-body.reveal-blocks > *` 규칙도 같은 전제다).
 *
 * 카드가 `.pd-body`의 직접 자식이 되므로 카드 한 덩어리가 한 번에 페이드된다 — 블록마다 따로
 * 페이드되던 기존 동작보다 카드에는 이쪽이 맞다.
 */
export default function ProjectOverview({
  content,
  cardIds,
}: {
  content: ReactNode;
  cardIds: Set<string>;
}) {
  const blocks = Children.toArray(
    (content as ReactElement<{ children?: ReactNode }>)?.props?.children ?? content
  );

  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const node = blocks[i];
    if (!isCardHeading(node, cardIds)) {
      out.push(node);
      continue;
    }
    // 이 h2부터 다음 h2 직전까지가 한 섹션이다.
    const section: ReactNode[] = [node];
    let j = i + 1;
    for (; j < blocks.length && !isHeading2(blocks[j]); j++) section.push(blocks[j]);
    out.push(
      <div className="proj-callout" key={`callout-${headingId(node)}`}>
        {section}
      </div>
    );
    i = j - 1;
  }

  return <RevealBlocks>{out}</RevealBlocks>;
}

function headingId(node: ReactNode): string | undefined {
  if (!isValidElement<{ id?: string }>(node)) return undefined;
  return node.props.id;
}

function isHeading2(node: ReactNode): boolean {
  return isValidElement(node) && node.type === "h2";
}

/** 제목 텍스트를 파싱하지 않고 id로 판별한다 — `extractHeadings`가 `rehypeSlug`와 같은 슬러그를
 *  계산하므로, 페이지에서 그 결과로 만든 id 집합을 그대로 받아 쓴다. */
function isCardHeading(node: ReactNode, cardIds: Set<string>): boolean {
  if (!isHeading2(node)) return false;
  const id = headingId(node);
  return !!id && cardIds.has(id);
}
