import "server-only";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { transformerColorizedBrackets } from "@shikijs/colorized-brackets";
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

/**
 * Shiki's grammar lookup is case-sensitive and only recognizes lowercase ids ("javascript",
 * not "JAVASCRIPT" or "Javascript") — a mismatched-case fence isn't treated as invalid/missing
 * (which would at least fall back to `defaultLang` below), it silently tokenizes as one plain
 * unstyled span, no syntax colors, no bracket colors, while `data-language` still shows the
 * original-cased string so the header badge looks fine. Confirmed directly against a real post
 * whose code fences were inconsistently ```JAVASCRIPT / ``` Javascript / ```(no language) —
 * exactly the "sometimes triggers, sometimes doesn't" symptom reported. Lowercasing here, before
 * rehypePrettyCode ever sees it, fixes this for every casing at once instead of only the
 * genuinely-missing-language case defaultLang covers.
 */
function remarkLowercaseCodeLang() {
  return (tree: import("mdast").Root) => {
    visit(tree, "code", (node) => {
      if (node.lang) node.lang = node.lang.toLowerCase();
    });
  };
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
 *
 * remarkBreaks turns every single newline within a paragraph/blockquote into a hard <br>
 * instead of CommonMark's default "soft break" (collapsed to a space) — without it, content
 * typed with single Enters between lines (the write form is a plain <textarea>, so that's the
 * natural way to type it) silently runs together into one line. Confirmed as the actual cause
 * of a real bug report: a post's `> /src` / `> /components` file-tree listing, one path per
 * line, rendered as a single run-on line. This affects prose paragraphs site-wide too, not just
 * blockquotes — every existing post with Enter-separated lines within a paragraph now renders
 * those as visible line breaks, which is the intended fix, not a side effect to guard against.
 */
export async function compileMarkdown(markdown: string): Promise<{ content: ReactNode }> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkLowercaseCodeLang)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: "github-dark",
      keepBackground: true,
      // Fenced code blocks with no language (```` ``` ```` alone) otherwise get skipped by
      // rehype-pretty-code entirely — no highlighting, no .code-block styling, no bracket
      // colors, just a bare <pre><code> passthrough (confirmed directly). Treating them as tsx
      // guarantees every code block gets colorized brackets regardless of whether the author
      // remembered a language tag, at the cost of possibly-wrong syntax coloring for a
      // non-JS/TS snippet that forgot its language — an acceptable trade for "always trigger".
      defaultLang: "tsx",
      // VSCode-style rainbow bracket matching (nested (), [], {}, <> each get a distinct,
      // rotating color) — supported for every built-in Shiki theme with no extra config.
      transformers: [transformerColorizedBrackets()],
    })
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
