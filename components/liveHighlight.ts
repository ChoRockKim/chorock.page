import type { BundledLanguage, Highlighter, ShikiTransformer } from "shiki";

/**
 * Code colors for the write form's live editor, produced by the same highlighter the published
 * page uses (Shiki "github-dark" + colorized brackets, as configured in lib/markdown.ts).
 *
 * CodeMirror has its own tokenizers, and a palette can be matched to Shiki's but the token
 * boundaries cannot — a parameter, a type annotation or an ALL_CAPS name comes out in a different
 * color. Running Shiki itself makes the colors identical by construction, for every language,
 * for inline code as well as fences. It is loaded on demand (only in live mode, which is already
 * its own chunk), and until a language is ready the caller falls back to CodeMirror's colors.
 */

export type ColorRun = { from: number; to: number; color: string; italic: boolean };

const THEME = "github-dark";
// Shiki's built-in no-grammar language: what rehype-pretty-code falls back to for an unknown one.
const PLAIN = "plaintext";

let highlighter: Highlighter | null = null;
let brackets: ShikiTransformer | null = null;
let starting: Promise<void> | null = null;
const loaded = new Set<string>([PLAIN]);
const failed = new Set<string>();
const pending = new Set<string>();
const cache = new Map<string, ColorRun[]>();
const listeners = new Set<() => void>();

/** Bumped whenever a language finishes loading, so cached widgets know to redraw. */
export let highlightVersion = 0;

/** Calls `fn` each time more code can be colored than before. Returns the unsubscribe. */
export function onHighlightReady(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function start(): Promise<void> {
  starting ??= (async () => {
    const [{ createHighlighter }, { transformerColorizedBrackets }] = await Promise.all([
      import("shiki"),
      import("@shikijs/colorized-brackets"),
    ]);
    brackets = transformerColorizedBrackets();
    highlighter = await createHighlighter({ themes: [THEME], langs: [] });
  })();
  return starting;
}

function load(lang: string) {
  if (pending.has(lang)) return;
  pending.add(lang);
  start()
    .then(() => highlighter!.loadLanguage(lang as BundledLanguage))
    .then(
      () => loaded.add(lang),
      // Not a language Shiki knows (or the highlighter failed to start): render as plain text,
      // which is what the published pipeline does too.
      () => failed.add(lang),
    )
    .finally(() => {
      pending.delete(lang);
      highlightVersion++;
      listeners.forEach((fn) => fn());
    });
}

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * Colored runs for `code` in `lang`, as offsets into `code`. Returns null while the language is
 * still loading (the caller is notified through onHighlightReady when to ask again).
 */
export function colorRuns(code: string, lang: string): ColorRun[] | null {
  if (!code) return [];
  let use = lang;
  if (failed.has(lang)) {
    if (!highlighter) return null;
    use = PLAIN;
  } else if (!highlighter || !loaded.has(lang)) {
    load(lang);
    return null;
  }
  const key = `${use}\0${code}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let root: HastNode;
  try {
    root = highlighter.codeToHast(code, {
      lang: use,
      theme: THEME,
      transformers: brackets ? [brackets] : [],
    }) as unknown as HastNode;
  } catch {
    return null;
  }

  // root > pre > code > (span.line | "\n")*, each line holding one <span style="color:…"> per
  // token. Offsets come from adding up the text as it is walked.
  const runs: ColorRun[] = [];
  let offset = 0;
  const walk = (node: HastNode, color: string, italic: boolean) => {
    if (node.type === "text") {
      const length = node.value?.length ?? 0;
      if (color && node.value?.trim()) runs.push({ from: offset, to: offset + length, color, italic });
      offset += length;
      return;
    }
    const style = typeof node.properties?.style === "string" ? node.properties.style : "";
    const own = /(?:^|;)\s*color:\s*([^;]+)/i.exec(style)?.[1]?.trim();
    const slanted = /font-style:\s*italic/i.test(style);
    for (const child of node.children ?? []) walk(child, own ?? color, italic || slanted);
  };
  walk(root, "", false);

  // Nothing here grows without bound in practice (one entry per distinct code block text), but
  // every keystroke inside a block makes a new entry, so start over now and then.
  if (cache.size > 400) cache.clear();
  cache.set(key, runs);
  return runs;
}
