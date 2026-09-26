"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { isPlainLeftClick, scrollToHeading } from "@/components/scrollToHeading";

/**
 * 본문 헤딩으로 가는 링크. `href`는 그대로 두어(새 탭·중클릭·접근성) 클릭만 JS로 가로챈다 —
 * 이유는 scrollToHeading.ts 참고. TocMobile(서버 컴포넌트)이 쓰고, TableOfContents는 활성 표시와
 * 스크롤 락이 더 필요해 같은 유틸을 직접 부른다.
 */
export default function HeadingLink({
  id,
  style,
  children,
}: {
  id: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    scrollToHeading(id);
  };
  return (
    <a href={`#${id}`} onClick={onClick} style={style}>
      {children}
    </a>
  );
}
