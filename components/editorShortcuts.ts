/**
 * Pure text-editing computations for WritePostForm's body <textarea>.
 *
 * Every function takes the current value and selection and returns an `Edit` (or null for
 * "nothing to do"). The component applies it by selecting [from, to], replacing that range with
 * `document.execCommand("insertText", false, text)` and then restoring [selStart, selEnd] —
 * routing every mutation through execCommand is what keeps the browser's native undo stack
 * intact (see the comment above WritePostForm's wrapSelection). Keeping the arithmetic here,
 * away from the DOM, is what makes it checkable in isolation.
 */
export type Edit = { from: number; to: number; text: string; selStart: number; selEnd: number };

export const isMacPlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* — lines — */

/** Full-line range [start, end) touched by a selection. Like VSCode, a selection that ends at
 *  column 0 of a line does not count that line. `end` points at the line's "\n" (or EOF). */
export function lineRange(value: string, s: number, e: number) {
  const start = value.lastIndexOf("\n", s - 1) + 1;
  const endPos = e > s && value[e - 1] === "\n" ? e - 1 : e;
  const nl = value.indexOf("\n", endPos);
  return { start, end: nl === -1 ? value.length : nl };
}

export function duplicateLines(value: string, s: number, e: number, dir: "up" | "down"): Edit {
  const { start, end } = lineRange(value, s, e);
  const block = value.slice(start, end);
  if (dir === "down") {
    const shift = block.length + 1;
    return { from: end, to: end, text: "\n" + block, selStart: s + shift, selEnd: e + shift };
  }
  // Inserting the copy *above* pushes the original down, so the unchanged offsets now land on
  // the new upper copy — which is where VSCode leaves the cursor for ⌥⇧↑.
  return { from: start, to: start, text: block + "\n", selStart: s, selEnd: e };
}

export function moveLines(value: string, s: number, e: number, dir: "up" | "down"): Edit | null {
  const { start, end } = lineRange(value, s, e);
  const block = value.slice(start, end);
  if (dir === "up") {
    if (start === 0) return null;
    const prevStart = value.lastIndexOf("\n", start - 2) + 1;
    const prev = value.slice(prevStart, start - 1);
    const shift = prev.length + 1;
    return { from: prevStart, to: end, text: block + "\n" + prev, selStart: s - shift, selEnd: e - shift };
  }
  if (end === value.length) return null;
  const nextNl = value.indexOf("\n", end + 1);
  const nextEnd = nextNl === -1 ? value.length : nextNl;
  const next = value.slice(end + 1, nextEnd);
  const shift = next.length + 1;
  return { from: start, to: nextEnd, text: next + "\n" + block, selStart: s + shift, selEnd: e + shift };
}

export function deleteLines(value: string, s: number, e: number): Edit {
  const { start, end } = lineRange(value, s, e);
  if (end < value.length) return { from: start, to: end + 1, text: "", selStart: start, selEnd: start };
  const from = Math.max(0, start - 1);
  return { from, to: end, text: "", selStart: from, selEnd: from };
}

/* — inline formatting — */

/** Wraps the selection in `marker`…`endMarker`, or unwraps it if it is already wrapped — either
 *  inside the selection (`**x**` selected) or just outside it (`x` selected inside `**x**`).
 *  The `*` (italic) case refuses to treat one half of a `**` as its own marker. */
export function toggleWrap(
  value: string,
  s: number,
  e: number,
  marker: string,
  endMarker = marker,
  placeholder = "텍스트",
): Edit {
  const sel = value.slice(s, e);
  const m = marker.length;
  const em = endMarker.length;
  const italic = marker === "*";

  const innerWrapped =
    sel.length >= m + em &&
    sel.startsWith(marker) &&
    sel.endsWith(endMarker) &&
    !(italic && sel.startsWith("**") && !sel.startsWith("***"));
  if (innerWrapped) {
    const inner = sel.slice(m, sel.length - em);
    return { from: s, to: e, text: inner, selStart: s, selEnd: s + inner.length };
  }

  const outerWrapped =
    s >= m &&
    value.slice(s - m, s) === marker &&
    value.slice(e, e + em) === endMarker &&
    !(italic && value[s - 2] === "*" && value[e + 1] === "*");
  if (outerWrapped) {
    return { from: s - m, to: e + em, text: sel, selStart: s - m, selEnd: s - m + sel.length };
  }

  const body = sel || placeholder;
  return { from: s, to: e, text: marker + body + endMarker, selStart: s + m, selEnd: s + m + body.length };
}

/** `[selection](https://)` with the URL selected, ready to be typed over. With nothing selected
 *  the link text is selected instead, since that's what has to be typed first. */
export function insertLink(value: string, s: number, e: number): Edit {
  const sel = value.slice(s, e);
  const label = sel || "링크 텍스트";
  const text = `[${label}](https://)`;
  if (sel) {
    const urlStart = s + label.length + 3;
    return { from: s, to: e, text, selStart: urlStart, selEnd: urlStart + "https://".length };
  }
  return { from: s, to: e, text, selStart: s + 1, selEnd: s + 1 + label.length };
}

/** Sets the current line's heading level; pressing the same level again removes it. */
export function setHeading(value: string, s: number, level: number): Edit {
  const { start } = lineRange(value, s, s);
  const existing = value.slice(start).match(/^#{1,6} /)?.[0] ?? "";
  const target = "#".repeat(level) + " ";
  const next = existing === target ? "" : target;
  const delta = next.length - existing.length;
  const pos = Math.max(start, s + delta);
  return { from: start, to: start + existing.length, text: next, selStart: pos, selEnd: pos };
}

/* — code fences — */

export type Fence = {
  /** Range of the language word after the opening ``` (empty range if there is none). */
  langStart: number;
  langEnd: number;
  lang: string;
  /** Range of the fence's body: just after the opening line, up to the closing line. */
  contentStart: number;
  contentEnd: number;
};

/** The fenced code block containing `pos`, if any. A fence opens and closes on lines starting
 *  with ``` (or ~~~); an unclosed fence runs to the end of the document. */
export function findFence(value: string, pos: number): Fence | null {
  const re = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/gm;
  let open: { lineEnd: number; langStart: number; lang: string; marker: string } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const lineStart = m.index;
    const lineEnd = m.index + m[0].length;
    if (!open) {
      if (lineStart > pos) return null;
      const info = m[2];
      const lang = info.trim().split(/\s+/)[0] ?? "";
      const langStart = lineEnd - info.length + (info.length - info.trimStart().length);
      open = { lineEnd, langStart, lang, marker: m[1] };
    } else if (m[1][0] === open.marker[0] && m[1].length >= open.marker.length && !m[2].trim()) {
      if (pos > open.lineEnd && pos <= lineStart) {
        return {
          langStart: open.langStart,
          langEnd: open.langStart + open.lang.length,
          lang: open.lang,
          contentStart: open.lineEnd + 1,
          contentEnd: lineStart,
        };
      }
      if (lineStart >= pos) return null;
      open = null;
    }
  }
  if (open && pos > open.lineEnd) {
    return {
      langStart: open.langStart,
      langEnd: open.langStart + open.lang.length,
      lang: open.lang,
      contentStart: open.lineEnd + 1,
      contentEnd: value.length,
    };
  }
  return null;
}

/* — Enter — */

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Enter inside a code fence: keep the line's indentation, add one level after a line ending in
 *  `:` `{` `(` `[`, and split `{|}` onto three lines the way VSCode does. Outside a fence:
 *  continue a markdown list/quote, or end it when Enter is pressed on an empty item. */
export function handleEnter(value: string, s: number, e: number): Edit | null {
  if (s !== e) return null;
  const { start } = lineRange(value, s, s);
  const before = value.slice(start, s);
  const fence = findFence(value, s);

  if (fence) {
    if (s < fence.contentStart) return null;
    const indent = before.match(/^[ \t]*/)![0];
    const unit = /^(python|py)$/.test(fence.lang) ? "    " : "  ";
    const last = before.trimEnd().slice(-1);
    const opens = last === ":" || last in OPEN_TO_CLOSE;
    if (!opens) {
      // A bare Enter on an unindented line is just a newline — let the browser do it.
      if (!indent) return null;
      const text = "\n" + indent;
      return { from: s, to: s, text, selStart: s + text.length, selEnd: s + text.length };
    }
    const inner = indent + unit;
    if (OPEN_TO_CLOSE[last] && value[s] === OPEN_TO_CLOSE[last]) {
      const text = "\n" + inner + "\n" + indent;
      const pos = s + 1 + inner.length;
      return { from: s, to: s, text, selStart: pos, selEnd: pos };
    }
    const text = "\n" + inner;
    return { from: s, to: s, text, selStart: s + text.length, selEnd: s + text.length };
  }

  const m = before.match(/^(\s*)([-*+] \[[ xX]\] |[-*+] |(\d+)([.)]) |> )/);
  if (!m) return null;
  const [marker, indent, , num, delim] = m;
  const { end } = lineRange(value, s, s);
  if (before.length === marker.length && value.slice(s, end).trim() === "") {
    // Enter on an empty item ends the list (Notion/VSCode): drop the marker, keep the line.
    return { from: start, to: s, text: "", selStart: start, selEnd: start };
  }
  let next = marker.slice(indent.length);
  if (num) next = `${Number(num) + 1}${delim} `;
  else if (/\[[ xX]\]/.test(next)) next = next.replace(/\[[xX]\]/, "[ ]");
  const text = "\n" + indent + next;
  return { from: s, to: s, text, selStart: s + text.length, selEnd: s + text.length };
}

/* — auto-closing pairs — */

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"' };
const CLOSERS = new Set([")", "]", "}", '"']);

/** Typing one of `( [ { "`. Wraps a selection; otherwise always inserts the pair, even with
 *  text right after the caret (an earlier version skipped that case, VSCode-style, and it read
 *  as "auto-close randomly doesn't work"). Typing a closer that is already the next character
 *  steps over it instead of doubling it. `"` only pairs when it isn't glued to a preceding word,
 *  since there it is almost always the closing quote. */
export function autoPair(value: string, s: number, e: number, ch: string): Edit | null {
  const next = value[s] ?? "";
  if (s === e && CLOSERS.has(ch) && next === ch) {
    return { from: s, to: s, text: "", selStart: s + 1, selEnd: s + 1 };
  }
  const close = PAIRS[ch];
  if (!close) return null;
  if (s !== e) {
    const sel = value.slice(s, e);
    return { from: s, to: e, text: ch + sel + close, selStart: s + 1, selEnd: e + 1 };
  }
  if (ch === '"' && /[\p{L}\p{N}_"]/u.test(value[s - 1] ?? "")) return null;
  return { from: s, to: s, text: ch + close, selStart: s + 1, selEnd: s + 1 };
}

/** Backspace between an empty pair `(|)` removes both halves. */
export function deletePair(value: string, s: number, e: number): Edit | null {
  if (s !== e || s === 0) return null;
  const open = value[s - 1];
  if (!PAIRS[open] || value[s] !== PAIRS[open]) return null;
  return { from: s - 1, to: s + 1, text: "", selStart: s - 1, selEnd: s - 1 };
}
