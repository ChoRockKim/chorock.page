import "server-only";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeReact from "rehype-react";
import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import CodeBlock from "@/components/CodeBlock";
import { MDXBlockquote, MDXImage } from "@/components/Mdx";

export type Heading = { id: string; text: string; depth: 2 | 3 };

/**
 * Parsed separately from compileMDX (rather than read back off the compiled
 * tree) so the TOC array is available before render, e.g. for
 * scroll-spy state seeded on the client. Uses the same slug algorithm as
 * rehype-slug (both wrap github-slugger), so ids always match the
 * anchors actually rendered in the body.
 */
export function extractHeadings(markdown: string): Heading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  visit(tree, "heading", (node) => {
    const depth = node.depth;
    if (depth !== 2 && depth !== 3) return;
    let text = "";
    visit(node, ["text", "inlineCode"], (leaf) => {
      if ("value" in leaf) text += leaf.value;
    });
    if (!text) return;
    headings.push({ id: slugger.slug(text), text, depth });
  });

  return headings;
}

const CJK_RANGE = /[ㄱ-힝一-鿿]/g;

export function estimateReadTime(markdown: string): number {
  const cjkChars = markdown.match(CJK_RANGE)?.length ?? 0;
  const withoutCjk = markdown.replace(CJK_RANGE, " ");
  const words = withoutCjk.trim().split(/\s+/).filter(Boolean).length;
  // Korean has no inter-word spaces, so CJK chars are counted individually
  // at a pace roughly matching read-aloud speed for the mixed-language posts.
  return Math.max(1, Math.round((words + cjkChars) / 350));
}

/**
 * Deliberately a plain Markdown pipeline (remark -> rehype -> React), not MDX.
 * Post content comes from a database (originally free-form prose migrated from
 * the old forum blog), not authored MDX files — MDX treats `{...}` in prose as
 * a JavaScript expression to evaluate, so any post that happens to mention
 * something like "`{ error }` 처럼 표시됩니다" outside a code fence would throw
 * `ReferenceError: error is not defined` at render time under next-mdx-remote's
 * compileMDX. Plain remark/rehype treats `{}` as literal text, matching the
 * old blog's markdown-it rendering, and rehype-pretty-code/rehype-slug work
 * identically either way since they operate on the hast tree, not on MDX.
 */
export async function compileMarkdown(markdown: string): Promise<{ content: ReactNode }> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, { theme: "github-dark", keepBackground: true })
    .use(rehypeReact, {
      Fragment,
      jsx,
      jsxs,
      components: {
        pre: CodeBlock,
        img: MDXImage,
        blockquote: MDXBlockquote,
      },
    })
    .process(markdown);

  return { content: file.result as ReactNode };
}
