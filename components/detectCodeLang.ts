import flourite from "flourite";

/**
 * Guesses a Shiki language id for a pasted code snippet, or null when unsure — callers leave the
 * fence's language alone on null. Only WritePostForm imports this, so flourite never reaches a
 * public page's bundle.
 *
 * flourite alone was measured against real snippets and got the ones this blog writes most
 * wrong: a TSX component came back "html", a two-line npm/cd script "lua", a SwiftUI view
 * "javascript" (it has no Swift detector at all). So three checks run first, and flourite's
 * answer is only taken from a trusted set with a minimum score — a wrong label is worse than the
 * existing tsx default, because the author has to notice and fix it.
 */
const TRUSTED = new Set([
  "python", "go", "sql", "json", "css", "javascript", "typescript", "java", "kotlin",
  "rust", "c", "cpp", "csharp", "php", "ruby", "dart", "yaml", "dockerfile", "html",
]);

export function detectCodeLang(code: string): string | null {
  const src = code.trim();
  if (src.length < 8) return null;

  if (/^\s*import (SwiftUI|Foundation|UIKit)\b|:\s*View\s*\{|\bsome View\b|@State\b|\bguard let\b/m.test(src)) {
    return "swift";
  }
  const lines = src.split("\n").filter((l) => l.trim());
  const shellLine = /^\s*(\$ )?(npm|npx|yarn|pnpm|bun|git|cd|ls|mkdir|rm|cp|mv|brew|curl|sudo|export|echo|cat|docker|pip3?|python3?|node|chmod|touch|source)\b/;
  if (lines.length && lines.every((l) => shellLine.test(l) || l.trim().startsWith("#"))) return "bash";

  if (/^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|VIEW)|ALTER\s+TABLE|DROP\s+TABLE|WITH\s+\w+\s+AS)\b/i.test(src)) {
    return "sql";
  }

  const jsLike = /\b(const|let|function|return|import|export|=>|useState|useEffect)\b/.test(src);
  const hasJsx = /<[A-Za-z][\w.]*(\s[^<>]*)?\/?>/.test(src) && jsLike;
  const hasTypes = /\binterface\s+\w|\btype\s+\w+\s*=|:\s*(string|number|boolean|React\.\w+|\w+\[\])\b|<\w+>\(/.test(src);
  if (hasJsx) return hasTypes ? "tsx" : "jsx";

  const { language, statistics } = flourite(src, { shiki: true });
  if (language === "unknown" || !TRUSTED.has(language)) return null;
  const best = Math.max(...Object.values(statistics));
  if (best < 3) return null;
  if (language === "html" && jsLike) return null;
  // flourite reaches for C on short snippets of anything brace-and-semicolon shaped (a one-line
  // SQL query came back "c"); this blog writes no C, so demand the one unmistakable sign.
  if ((language === "c" || language === "cpp") && !/^\s*#include\b/m.test(src)) return null;
  return language;
}

/** JS/TS dialects are interchangeable enough that swapping one for another (the toolbar's
 *  `tsx` for a detected `typescript`) would only lose JSX highlighting. */
export const sameFamily = (a: string, b: string) => {
  const js = /^(js|jsx|ts|tsx|javascript|typescript)$/;
  return a === b || (js.test(a) && js.test(b));
};
