"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { EditorState, Prec, StateField, Transaction, type Range } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  placeholder as placeholderExt,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { tags as t } from "@lezer/highlight";
import { autoPair, type Edit } from "@/components/editorShortcuts";
import { parseYouTube, youTubeThumb } from "@/lib/youtube";

/**
 * The write form's "라이브" mode: an Obsidian-style live-preview markdown editor.
 *
 * The document is the markdown source, character for character — formatting is drawn on top of
 * it with CodeMirror decorations, and the syntax marks (`##`, `**`, `` ` ``, `[](url)`) are only
 * hidden on lines the selection does not touch. Nothing is ever converted to another model and
 * back, which is the point: a Notion-style editor would re-serialize the markdown on save and
 * quietly rewrite old posts (and fight remark-breaks' single-newline rule). Loaded with
 * next/dynamic only when this mode is picked, so CodeMirror never reaches any other bundle.
 */

export type EditorAdapter = {
  getValue(): string;
  getSelection(): { s: number; e: number };
  apply(edit: Edit): void;
  focus(): void;
  hasFocus(): boolean;
  /** Puts the caret at `pos` and scrolls that line to the top (the TOC preview's jump). */
  reveal?(pos: number): void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  adapterRef: MutableRefObject<EditorAdapter | null>;
  /** Shared shortcut table; returns true when it consumed the key. */
  onKey: (e: KeyboardEvent) => boolean;
  /** Image upload / fence-language paste handling; returns true when it consumed the paste. */
  onPaste: (data: DataTransfer) => boolean;
  /** Caret position after every selection or document change — drives the TOC highlight. */
  onCaret?: (pos: number) => void;
  placeholder?: string;
};

/* — formatting — */

// Markdown-level styling. Code inside fences is highlighted by the fence language's own grammar
// (codeLanguages below); those tokens get github-dark colors, matching the published
// rehype-pretty-code theme, on the dark fence background.
const markdownStyle = HighlightStyle.define([
  { tag: t.heading, fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "var(--color-accent-600)" },
  { tag: t.url, color: "var(--color-accent-600)", opacity: "0.7" },
  { tag: [t.processingInstruction, t.contentSeparator], opacity: "0.45" },
  { tag: t.quote, fontStyle: "italic" },
  // fenced-code tokens (github-dark)
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: "#ff7b72" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#a5d6ff" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#8b949e", fontStyle: "italic" },
  { tag: [t.number, t.bool, t.atom, t.null], color: "#79c0ff" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#d2a8ff" },
  { tag: [t.typeName, t.className, t.namespace], color: "#ffa657" },
  { tag: [t.propertyName, t.attributeName], color: "#79c0ff" },
  { tag: [t.tagName, t.angleBracket], color: "#7ee787" },
  { tag: [t.definition(t.variableName)], color: "#ffa657" },
  { tag: t.operator, color: "#ff7b72" },
]);

class ImageWidget extends WidgetType {
  constructor(readonly src: string) {
    super();
  }
  eq(other: ImageWidget) {
    return other.src === this.src;
  }
  toDOM() {
    const wrap = document.createElement("span");
    // `pd-body` brings in the published `.pd-body img` look (rounded corners, 640px max height);
    // its margins are zeroed in the theme because the spacing is computed, not CSS-collapsed.
    wrap.className = "cm-md-image pd-body";
    if (this.src.startsWith("uploading:")) {
      wrap.textContent = "이미지 업로드 중…";
      wrap.classList.add("is-uploading");
    } else {
      const img = document.createElement("img");
      img.src = this.src;
      img.alt = "";
      wrap.appendChild(img);
    }
    return wrap;
  }
  ignoreEvent() {
    return false;
  }
}

/** The published code block's header bar (components/CodeBlock.tsx): traffic-light dots and the
 *  language label. An unlabeled fence renders as tsx on the site (defaultLang), so it says so. */
class FenceHeaderWidget extends WidgetType {
  constructor(readonly lang: string) {
    super();
  }
  eq(other: FenceHeaderWidget) {
    return other.lang === this.lang;
  }
  toDOM() {
    const bar = document.createElement("span");
    bar.className = "cm-md-fence-bar";
    for (const color of ["#ff5f57", "#ffbd2e", "#28c840"]) {
      const dot = document.createElement("span");
      dot.className = "cm-md-fence-dot";
      dot.style.background = color;
      bar.appendChild(dot);
    }
    const label = document.createElement("span");
    label.className = "cm-md-fence-lang";
    label.textContent = this.lang || "tsx";
    bar.appendChild(label);
    return bar;
  }
  ignoreEvent() {
    return false;
  }
}

/** Source position of a widget's DOM at click time — widgets are reused across edits (eq), so a
 *  position captured at construction would go stale. */
function enterBlockOnClick(el: HTMLElement, view: EditorView) {
  el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    view.dispatch({ selection: { anchor: view.posAtDOM(el) }, scrollIntoView: true });
    view.focus();
  });
}

/** List markers, drawn the way the page does: disc / circle / square by depth, or the item's
 *  ordinal for ordered lists, right-aligned in a 1.4em hanging box. */
class MarkerWidget extends WidgetType {
  constructor(readonly kind: "disc" | "circle" | "square" | "ordinal", readonly label: string) {
    super();
  }
  eq(o: MarkerWidget) {
    return o.kind === this.kind && o.label === this.label;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-md-marker";
    if (this.kind === "ordinal") {
      el.textContent = this.label;
    } else {
      const dot = document.createElement("span");
      dot.className = `cm-md-dot is-${this.kind}`;
      el.appendChild(dot);
    }
    return el;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }
  eq(o: CheckboxWidget) {
    return o.checked === this.checked;
  }
  toDOM() {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.disabled = true;
    box.checked = this.checked;
    box.className = "cm-md-check";
    return box;
  }
}

class HrWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-md-hr pd-body";
    wrap.appendChild(document.createElement("hr"));
    return wrap;
  }
}

/** Inline markdown inside a table cell → DOM (code, bold, italic, strike, links). Text is only
 *  ever inserted as text nodes. */
function inlineNodes(text: string): Node[] {
  const out: Node[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    const tag = m[1] ? "code" : m[2] ? "strong" : m[3] ? "em" : m[4] ? "del" : "a";
    const el = document.createElement(tag);
    el.textContent = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5];
    out.push(el);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

/** A GFM table, rendered as the real <table> inside a `pd-body` wrapper so the published
 *  `.pd-body table/th/td` rules style it. Clicking it puts the caret in the source. */
class TableWidget extends WidgetType {
  constructor(readonly rows: string[][]) {
    super();
  }
  eq(o: TableWidget) {
    return JSON.stringify(o.rows) === JSON.stringify(this.rows);
  }
  toDOM(view: EditorView) {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-table pd-body";
    const table = document.createElement("table");
    const thead = table.createTHead().insertRow();
    this.rows[0].forEach((c) => {
      const th = document.createElement("th");
      th.append(...inlineNodes(c));
      thead.appendChild(th);
    });
    const tbody = table.createTBody();
    this.rows.slice(1).forEach((r) => {
      const tr = tbody.insertRow();
      r.forEach((c) => {
        const td = tr.insertCell();
        td.append(...inlineNodes(c));
      });
    });
    wrap.appendChild(table);
    enterBlockOnClick(wrap, view);
    return wrap;
  }
  get estimatedHeight() {
    return 36 * this.rows.length;
  }
}

/** The published click-to-play YouTube card (components/YouTubeEmbed.tsx), static: it shares the
 *  `.yt-embed` styles. Clicking puts the caret in the URL line. */
class YouTubeCardWidget extends WidgetType {
  constructor(readonly id: string, readonly shorts: boolean) {
    super();
  }
  eq(o: YouTubeCardWidget) {
    return o.id === this.id && o.shorts === this.shorts;
  }
  toDOM(view: EditorView) {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-yt";
    const box = document.createElement("div");
    box.className = `yt-embed${this.shorts ? " is-shorts" : ""}`;
    const face = document.createElement("div");
    face.className = "yt-embed-play";
    const img = document.createElement("img");
    img.src = youTubeThumb(this.id);
    img.alt = "";
    img.onload = () => {
      if (img.naturalWidth <= 120) img.src = youTubeThumb(this.id, "hqdefault");
    };
    img.onerror = () => {
      img.src = youTubeThumb(this.id, "hqdefault");
    };
    const icon = document.createElement("span");
    icon.className = "yt-embed-icon";
    icon.innerHTML =
      '<svg width="68" height="48" viewBox="0 0 68 48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3S12.8.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3Z" fill="#f00"/><path d="m27 34 18-10-18-10v20Z" fill="#fff"/></svg>';
    face.append(img, icon);
    box.appendChild(face);
    wrap.appendChild(box);
    enterBlockOnClick(wrap, view);
    return wrap;
  }
  get estimatedHeight() {
    return this.shorts ? 640 : 360;
  }
}

const hide = Decoration.replace({});
const HEADING = /^ATXHeading([1-6])$/;

/** Lines touched by any selection range — on those, the raw markdown stays visible. */
function activeLines(view: EditorView) {
  const lines = new Set<number>();
  const { doc } = view.state;
  for (const r of view.state.selection.ranges) {
    const a = doc.lineAt(r.from).number;
    const b = doc.lineAt(r.to).number;
    for (let n = a; n <= b; n++) lines.add(n);
  }
  return lines;
}

/* — vertical rhythm — */

// Block margins as the published post renders them, measured on real posts (gap between two
// blocks = max(previous margin-bottom, next margin-top), i.e. CSS margin collapsing):
// p>p 30, p>h2 60, h2>p 10, p>h3 40, p>h4 30, p>code 30, code>p 20, p>ul 10, ul>p 16,
// p>blockquote 30, blockquote>p 20, h2>table 20.
const MARGINS: Record<string, [top: number, bottom: number]> = {
  // h1 has no top margin on the page (only h2+ got one), so after a paragraph the gap is that
  // paragraph's own 30px.
  ATXHeading1: [0, 10],
  ATXHeading2: [60, 10],
  SetextHeading1: [0, 10],
  SetextHeading2: [60, 10],
  ATXHeading3: [40, 10],
  ATXHeading4: [30, 10],
  ATXHeading5: [30, 10],
  ATXHeading6: [0, 10],
  FencedCode: [20, 20],
  CodeBlock: [20, 20],
  BulletList: [10, 16],
  OrderedList: [10, 16],
  Blockquote: [20, 20],
  Table: [20, 20],
  HorizontalRule: [8, 8],
  // A paragraph holding only images: img margin-top 10 / margin-bottom 20 collapse into the
  // paragraph's own margin, so the box is 10 above and 30 below. Two in a row sit 10 apart.
  ImageParagraph: [10, 30],
  // A lone YouTube link → the 20px-margin embed box.
  Embed: [20, 20],
};
const IMAGE_ONLY = /^(?:!\[[^\]]*\]\([^)]*\)\s*)+$/;

/** The block's spacing class: a paragraph of only images or only a YouTube URL behaves differently
 *  from a text paragraph (see the margin table above). */
function blockKind(state: EditorState, node: { name: string; from: number; to: number }): string {
  if (node.name !== "Paragraph") return node.name;
  const text = state.doc.sliceString(node.from, node.to).trim();
  if (IMAGE_ONLY.test(text)) return "ImageParagraph";
  const url = /^<(.+)>$/.exec(text)?.[1] ?? text;
  if (!/\s/.test(url) && parseYouTube(url)) return "Embed";
  return "Paragraph";
}
const margins = (name: string): [number, number] => MARGINS[name] ?? [0, 30];
const isList = (name: string) => name === "BulletList" || name === "OrderedList";
const lineStyle = (style: string) => Decoration.line({ attributes: { style } });
// A line whose only content is a block-level widget (an image, an <hr>): zero strut, and no
// .cm-widgetBuffer — CodeMirror puts a 1em-tall zero-width <img> on each side of every widget,
// and beside a block widget each one becomes its own 16px line box.
const blockLine = Decoration.line({ class: "cm-md-blockline", attributes: { style: "line-height:0" } });

/**
 * In the source, blocks are separated by blank lines, and every blank line is one full text line
 * tall (~29px) — so headings sat too close to the paragraph above and too far from the one below,
 * code blocks floated, and lists gapped. Instead, the first blank line between two top-level blocks
 * gets exactly the published gap as its height; further blank lines collapse (as they do when
 * rendered) unless the caret is on one. With no blank line at all, the gap goes on the next block's
 * first line as padding. Padding and line-height, never margin: CodeMirror measures line heights
 * from the DOM, and margins fall outside that measurement.
 */
class GapWidget extends WidgetType {
  constructor(readonly height: number) {
    super();
  }
  eq(other: GapWidget) {
    return other.height === this.height;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-md-gap";
    el.style.height = `${this.height}px`;
    return el;
  }
  get estimatedHeight() {
    return this.height;
  }
}

function spacingDecorations(state: EditorState): Range<Decoration>[] {
  const { doc } = state;
  const active = new Set<number>();
  for (const r of state.selection.ranges) {
    for (let n = doc.lineAt(r.from).number; n <= doc.lineAt(r.to).number; n++) active.add(n);
  }
  const decos: Range<Decoration>[] = [];
  const blankLines = (fromLine: number, toLine: number) => {
    const out: number[] = [];
    for (let n = fromLine; n <= toLine; n++) if (!doc.line(n).text.trim()) out.push(n);
    return out;
  };

  let prev: { name: string; to: number } | null = null;
  for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
    const kind = blockKind(state, node);
    if (prev) {
      // A text paragraph right before an image paragraph / list tightens to 10px (see globals.css).
      const prevBottom =
        prev.name === "Paragraph" && (isList(kind) || kind === "ImageParagraph") ? 10 : margins(prev.name)[1];
      const gap =
        prev.name === "ImageParagraph" && kind === "ImageParagraph"
          ? 10
          : Math.max(prevBottom, margins(kind)[0]);
      const blanks = blankLines(doc.lineAt(prev.to).number + 1, doc.lineAt(node.from).number - 1);
      if (blanks.length) {
        blanks.forEach((n, i) => {
          const h = i === 0 ? gap : active.has(n) ? 28.8 : 0;
          decos.push(lineStyle(`line-height:${h}px`).range(doc.line(n).from));
        });
      } else {
        // No blank line in the source (a paragraph followed directly by ```, say). Padding on the
        // next line would be painted by its own background — and a code block header's padding
        // rule overrode it outright — so the gap is a block widget of its own instead.
        decos.push(
          Decoration.widget({ widget: new GapWidget(gap), block: true, side: -1 }).range(doc.lineAt(node.from).from),
        );
      }
    }

    // Whole-block replacements. Block widgets may only come from state (not the view plugin), which
    // is why they live here. The raw source comes back while the caret is anywhere inside it.
    const firstLine = doc.lineAt(node.from).number;
    const lastLine = doc.lineAt(node.to).number;
    let touched = false;
    for (let n = firstLine; n <= lastLine && !touched; n++) touched = active.has(n);
    if (!touched && node.name === "Table") {
      const rows: string[][] = [];
      for (let row = node.node.firstChild; row; row = row.nextSibling) {
        if (row.name !== "TableHeader" && row.name !== "TableRow") continue;
        const cells: string[] = [];
        for (let c = row.firstChild; c; c = c.nextSibling) {
          if (c.name === "TableCell") cells.push(doc.sliceString(c.from, c.to).trim());
        }
        rows.push(cells);
      }
      if (rows.length >= 1 && rows[0].length) {
        decos.push(
          Decoration.replace({ widget: new TableWidget(rows), block: true }).range(
            doc.line(firstLine).from,
            doc.line(lastLine).to,
          ),
        );
      }
    } else if (!touched && kind === "Embed") {
      const text = doc.sliceString(node.from, node.to).trim();
      const ref = parseYouTube(/^<(.+)>$/.exec(text)?.[1] ?? text);
      if (ref) {
        decos.push(
          Decoration.replace({ widget: new YouTubeCardWidget(ref.id, ref.shorts), block: true }).range(
            doc.line(firstLine).from,
            doc.line(lastLine).to,
          ),
        );
      }
    }

    if (isList(node.name)) {
      // li + li is 5px on the page; blank lines between loose items collapse into that.
      node.toTree().iterate({
        enter: (n) => {
          if (n.name !== "ListItem") return;
          const from = node!.from + n.from;
          const sib = n.node.prevSibling;
          if (sib?.name === "ListItem") {
            decos.push(lineStyle("padding-top:5px").range(doc.lineAt(from).from));
            const blanks = blankLines(doc.lineAt(node!.from + sib.to).number + 1, doc.lineAt(from).number - 1);
            for (const b of blanks) decos.push(lineStyle(`line-height:${active.has(b) ? 28.8 : 0}px`).range(doc.line(b).from));
          }
        },
      });
    }
    prev = { name: kind, to: node.to };
  }
  return decos;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const { doc } = state;
  const active = activeLines(view);
  const isActive = (pos: number) => active.has(doc.lineAt(pos).number);
  const decos: Range<Decoration>[] = [];
  const lineClass = (pos: number, cls: string) =>
    decos.push(Decoration.line({ class: cls }).range(doc.lineAt(pos).from));
  // line number → list depth. Filled while walking (outer items first, so a nested item's lines
  // overwrite its parent's) and turned into one indent decoration per line afterwards.
  const listLines = new Map<number, { depth: number; first: boolean }>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        const heading = HEADING.exec(name);
        if (heading) {
          lineClass(node.from, `cm-md-h${heading[1]}`);
          return;
        }
        switch (name) {
          case "HeaderMark": {
            if (isActive(node.from)) return;
            // Hide "## " including the space, so the heading text starts flush left.
            const end = doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            decos.push(hide.range(node.from, end));
            return;
          }
          case "EmphasisMark":
          case "StrikethroughMark":
            if (!isActive(node.from)) decos.push(hide.range(node.from, node.to));
            return;
          case "CodeMark": {
            // Inline code's backticks only — a fence's ``` is a CodeMark too, kept visible so
            // the block's boundaries stay editable.
            if (node.node.parent?.name !== "InlineCode") return;
            if (!isActive(node.from)) decos.push(hide.range(node.from, node.to));
            return;
          }
          case "InlineCode":
            decos.push(Decoration.mark({ class: "cm-md-code" }).range(node.from, node.to));
            return;
          case "Link": {
            const marks = node.node.getChildren("LinkMark");
            const url = node.node.getChild("URL");
            if (marks.length >= 2) {
              // The link text is underlined in the accent color whether or not the syntax shows.
              if (marks[1].from > marks[0].to) {
                decos.push(Decoration.mark({ class: "cm-md-link" }).range(marks[0].to, marks[1].from));
              }
              // [text](url): hide everything except the text.
              if (!isActive(node.from)) {
                decos.push(hide.range(marks[0].from, marks[0].to));
                decos.push(hide.range(marks[1].from, url && marks.length >= 4 ? marks[3].to : node.to));
              }
            }
            return;
          }
          case "URL": {
            // A bare URL (not the target of [text](url) or an image) is shown as the link it is.
            const parent = node.node.parent?.name;
            if (parent !== "Link" && parent !== "Image") {
              decos.push(Decoration.mark({ class: "cm-md-link" }).range(node.from, node.to));
            }
            return;
          }
          case "Autolink": {
            // <https://…>: the page shows only the address.
            if (isActive(node.from)) return;
            for (const m of node.node.getChildren("LinkMark")) decos.push(hide.range(m.from, m.to));
            return;
          }
          case "Escape": {
            // \* → *: the backslash is source, not content.
            if (!isActive(node.from)) decos.push(hide.range(node.from, node.from + 1));
            return;
          }
          case "HorizontalRule": {
            if (isActive(node.from)) return;
            decos.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to));
            // A block widget inside a line leaves a line-box above and below it; zero the strut.
            decos.push(blockLine.range(doc.lineAt(node.from).from));
            return;
          }
          case "ListItem": {
            let depth = 0;
            for (let a: typeof node.node | null = node.node; a; a = a.parent) if (a.name === "ListItem") depth++;
            const first = doc.lineAt(node.from).number;
            const last = doc.lineAt(node.to).number;
            for (let n = first; n <= last; n++) listLines.set(n, { depth, first: n === first });
            return;
          }
          case "ListMark": {
            const item = node.node.parent;
            if (item?.name !== "ListItem" || isActive(node.from)) return;
            const list = item.parent;
            let depth = 0;
            for (let a: typeof item | null = item; a; a = a.parent) if (a.name === "ListItem") depth++;
            const end = doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            let marker: MarkerWidget;
            if (list?.name === "OrderedList") {
              let index = 0;
              for (let sib = item.prevSibling; sib; sib = sib.prevSibling) if (sib.name === "ListItem") index++;
              const startMark = list.firstChild?.getChild("ListMark");
              const start = startMark ? parseInt(doc.sliceString(startMark.from, startMark.to), 10) || 1 : 1;
              marker = new MarkerWidget("ordinal", `${start + index}.`);
            } else {
              marker = new MarkerWidget(depth % 3 === 1 ? "disc" : depth % 3 === 2 ? "circle" : "square", "");
            }
            // A nested item's source is indented with spaces; the page indents by 1.4em per level
            // instead, so the raw whitespace is hidden along with the marker.
            const lineStart = doc.lineAt(node.from).from;
            decos.push(Decoration.replace({ widget: marker }).range(lineStart, end));
            return;
          }
          case "TaskMarker": {
            if (isActive(node.from)) return;
            const checked = /x/i.test(doc.sliceString(node.from, node.to));
            const end = doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            decos.push(Decoration.replace({ widget: new CheckboxWidget(checked) }).range(node.from, end));
            return;
          }
          case "Image": {
            if (isActive(node.from)) return;
            const url = node.node.getChild("URL");
            if (!url) return;
            const src = doc.sliceString(url.from, url.to);
            decos.push(hide.range(node.from, node.to));
            decos.push(Decoration.widget({ widget: new ImageWidget(src), side: 1 }).range(node.to));
            // Only a line holding nothing but images gets a zero strut (an image mid-sentence keeps
            // its text's line height).
            if (IMAGE_ONLY.test(doc.lineAt(node.from).text.trim())) {
              decos.push(blockLine.range(doc.lineAt(node.from).from));
            }
            // An image on its own source line *inside* a longer paragraph (text, newline, image):
            // the page puts 10px above it and 20px below, or 10px between two stacked images.
            const line = doc.lineAt(node.from);
            const para = node.node.parent;
            if (para?.name === "Paragraph" && IMAGE_ONLY.test(line.text.trim())) {
              const isFirstLine = doc.lineAt(para.from).number === line.number;
              const isLastLine = doc.lineAt(para.to).number === line.number;
              const imgLine = (n: number) => n >= 1 && n <= doc.lines && IMAGE_ONLY.test(doc.line(n).text.trim());
              const top = isFirstLine || imgLine(line.number - 1) ? 0 : 10;
              const bottom = isLastLine ? 0 : imgLine(line.number + 1) ? 10 : 20;
              if (top || bottom) {
                decos.push(lineStyle(`padding-top:${top}px;padding-bottom:${bottom}px`).range(line.from));
              }
            }
            return;
          }
          case "Blockquote": {
            const firstLine = doc.lineAt(node.from).number;
            const lastLine = doc.lineAt(node.to).number;
            for (let n = firstLine; n <= lastLine; n++) {
              const edge = `${n === firstLine ? " is-first" : ""}${n === lastLine ? " is-last" : ""}`;
              lineClass(doc.line(n).from, `cm-md-quote${edge}`);
            }
            return;
          }
          case "FencedCode": {
            // Drawn like the published block: header bar, numbered body lines, no visible fences.
            // Each fence line shows its raw ``` text only while the caret is on that line, so
            // the language stays one click away from being edited.
            const first = doc.lineAt(node.from).number;
            const last = doc.lineAt(node.to).number;
            const closing = node.node.lastChild;
            const closed = !!closing && closing.name === "CodeMark" && doc.lineAt(closing.from).number !== first;
            const bodyLast = closed ? last - 1 : last;
            const digits = String(Math.max(1, bodyLast - first)).length;
            const head = doc.line(first);
            decos.push(Decoration.line({ class: "cm-md-fence cm-md-fence-head" }).range(head.from));
            if (!active.has(first)) {
              const info = node.node.getChild("CodeInfo");
              const lang = info ? doc.sliceString(info.from, info.to).toLowerCase() : "";
              decos.push(Decoration.replace({ widget: new FenceHeaderWidget(lang) }).range(head.from, head.to));
            }
            for (let n = first + 1; n <= bodyLast; n++) {
              const edge = `${n === first + 1 ? " is-first" : ""}${n === bodyLast ? ` is-last${closed ? " has-tail" : ""}` : ""}`;
              const cls = `cm-md-fence cm-md-fence-body cm-md-fence-d${digits}${edge}`;
              decos.push(Decoration.line({ class: cls }).range(doc.line(n).from));
            }
            if (closed) {
              const tail = doc.line(last);
              decos.push(Decoration.line({ class: "cm-md-fence cm-md-fence-tail" }).range(tail.from));
              if (!active.has(last) && tail.to > tail.from) decos.push(hide.range(tail.from, tail.to));
            }
            return;
          }
        }
      },
    });
  }
  for (const [n, { depth, first }] of listLines) {
    // 1.4em per level, as .pd-body ul/ol; the first line hangs its marker into that space.
    decos.push(
      lineStyle(`padding-left:${(depth * 1.4).toFixed(1)}em${first ? ";text-indent:-1.4em" : ""}`).range(
        doc.line(n).from,
      ),
    );
  }
  return Decoration.set(decos, true);
}

// Spacing lives in a StateField rather than the ViewPlugin above: block widgets (GapWidget) may
// only come from state, not from a view plugin. It covers the whole document, which is cheap at
// blog-post length and keeps heights stable while scrolling.
const spacingField = StateField.define<DecorationSet>({
  create: (state) => Decoration.set(spacingDecorations(state), true),
  update(value, tr) {
    if (tr.docChanged || tr.selection || syntaxTree(tr.startState) !== syntaxTree(tr.state)) {
      return Decoration.set(spacingDecorations(tr.state), true);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = buildDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// Colors and type come from the site's own CSS variables, so light/dark needs no second theme.
const theme = EditorView.theme({
  // Paragraphs and lists are 88% opaque on the page (--pd-text-opacity); headings are not.
  "&": { color: "color-mix(in srgb, var(--color-text) 88%, transparent)", backgroundColor: "transparent", fontSize: "16px", height: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-body)", lineHeight: "1.8", overflow: "auto" },
  ".cm-content": { padding: "var(--space-3) var(--space-4)", caretColor: "var(--color-text)" },
  // CodeMirror gives every line 0 2px 0 6px. Block widgets (table, YouTube card) have none, so
  // they stood 6px left of the text, and the text column was 632px instead of the page's 640.
  ".cm-line": { padding: "0" },
  ".cm-cursor": { borderLeftColor: "var(--color-text)" },
  // Native selection, not drawSelection(): CodeMirror's drawn selection sits in a layer *behind*
  // the text, so the code block's opaque line backgrounds covered it and dragging inside a block
  // showed nothing. The native highlight paints over backgrounds.
  ".cm-content ::selection": { backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)" },
  // Both the line itself (bare text between tokens, e.g. spaces) and the token spans inside it —
  // with only the descendant selector the gaps took the prose color and the highlight was striped.
  ".cm-md-fence::selection, .cm-md-fence ::selection": { backgroundColor: "rgb(56 139 253 / 0.4)" },
  ".cm-placeholder": { color: "var(--color-text)", opacity: "0.35" },
  // Published sizes and the global heading line-height (1.12); the space around headings comes
  // from spacingDecorations, matching .pd-body's margins.
  // Same rule as the page: global h1 is 42px (only h2/h3 are shrunk inside .pd-body), h6 is 13px
  // uppercase with wide tracking, and every heading has letter-spacing -0.015em.
  ".cm-md-h1, .cm-md-h2, .cm-md-h3, .cm-md-h4, .cm-md-h5, .cm-md-h6": {
    color: "var(--color-text)",
    fontWeight: "600",
    lineHeight: "1.12",
    letterSpacing: "-0.015em",
  },
  ".cm-md-h1": { fontSize: "42px" },
  ".cm-md-h2": { fontSize: "22px" },
  ".cm-md-h3": { fontSize: "18px" },
  ".cm-md-h4": { fontSize: "16px" },
  ".cm-md-h5": { fontSize: "15px" },
  ".cm-md-h6": { fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" },
  // .pd-body code:not(pre code), verbatim.
  ".cm-md-code": {
    fontFamily: "var(--font-mono)",
    fontSize: "0.85em",
    padding: "0.15em 0.4em",
    borderRadius: "4px",
    background: "var(--color-surface)",
  },
  // Global `a`: accent color, underlined, offset 3px.
  ".cm-md-link": {
    color: "var(--color-accent)",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  // List markers hang inside the 1.4em the line is indented by (see buildDecorations).
  ".cm-md-marker": {
    display: "inline-block",
    width: "1.4em",
    textIndent: "0",
    textAlign: "right",
    paddingRight: "0.52em",
    boxSizing: "border-box",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-md-dot": { display: "inline-block", width: "5px", height: "5px", marginBottom: "2px", background: "currentColor", borderRadius: "50%" },
  ".cm-md-dot.is-circle": { background: "transparent", border: "1px solid currentColor", boxSizing: "border-box" },
  ".cm-md-dot.is-square": { borderRadius: "0" },
  // UA checkbox margin is 3px 3px 3px 4px, followed by the source's space (≈4.4px).
  ".cm-md-check": { margin: "0 7.4px 0 4px", verticalAlign: "-1px", width: "13px", height: "13px" },
  ".cm-md-hr": { display: "block" },
  ".cm-md-hr hr": { margin: "0" },
  // Published .pd-body table, minus its margins (the gap to neighbours is computed).
  ".cm-md-table": { cursor: "pointer", lineHeight: "1.55" },
  ".cm-md-table table": { margin: "0" },
  ".cm-md-yt": { cursor: "pointer" },
  ".cm-md-yt .yt-embed": { margin: "0" },
  // .pd-body blockquote: accent-100 box, 15px/20px padding, rounded, italic, accent-800 text.
  ".cm-md-quote": {
    background: "var(--color-accent-100)",
    color: "var(--color-accent-800)",
    // The blockquote itself is 15px but its text lives in a <p>, which is 16px/1.8 on the page.
    fontSize: "16px",
    fontStyle: "italic",
    paddingLeft: "20px !important",
    paddingRight: "20px !important",
  },
  ".cm-md-quote.is-first": { paddingTop: "15px", borderTopLeftRadius: "var(--radius-md)", borderTopRightRadius: "var(--radius-md)" },
  ".cm-md-quote.is-last": { paddingBottom: "15px", borderBottomLeftRadius: "var(--radius-md)", borderBottomRightRadius: "var(--radius-md)" },
  // Mirrors .code-block / .code-block-header / .code-block pre in globals.css: #3a3a3a header,
  // github-dark #24292e body, 13px/1.6 mono, line-number gutter, hovered-line highlight.
  ".cm-md-fence": {
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    lineHeight: "1.6",
    background: "#24292e",
    color: "#e1e4e8",
    caretColor: "#e1e4e8",
    paddingLeft: "15px !important",
    paddingRight: "15px !important",
  },
  // Heights measured against the published block: header 46px (10px padding + 26px row),
  // pre padding 20px top and bottom, 20.8px per code line.
  ".cm-md-fence-head": {
    background: "#3a3a3a",
    borderRadius: "8px 8px 0 0",
    padding: "10px 15px !important",
    lineHeight: "26px",
    color: "#9ca3af",
    counterReset: "cmfence",
  },
  ".cm-md-fence-bar": { display: "inline-flex", alignItems: "center", gap: "8px", verticalAlign: "top", height: "26px" },
  // CodeMirror puts a zero-width .cm-widgetBuffer <img> beside every replaced range; on its default
  // baseline alignment it pushed heading lines 2px and fence headers 1px taller than the published
  // ones (measured 26.63 vs 24.64), which added up over a long post.
  ".cm-line .cm-widgetBuffer": { verticalAlign: "top" },
  ".cm-md-blockline .cm-widgetBuffer": { display: "none" },
  ".cm-md-fence-dot": { width: "12px", height: "12px", borderRadius: "50%", display: "inline-block" },
  ".cm-md-fence-lang": {
    fontSize: "11px",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginLeft: "2px",
  },
  ".cm-md-fence-body": { counterIncrement: "cmfence" },
  ".cm-md-fence-body.is-first": { paddingTop: "20px" },
  // An unclosed block has no tail line, so its last body line carries the bottom padding.
  ".cm-md-fence-body.is-last:not(.has-tail)": { paddingBottom: "20px" },
  ".cm-md-fence-body::before": {
    content: "counter(cmfence)",
    display: "inline-block",
    width: "1ch",
    marginRight: "1.25rem",
    textAlign: "right",
    color: "#636b78",
    userSelect: "none",
  },
  ".cm-md-fence-d2::before": { width: "2ch" },
  ".cm-md-fence-d3::before": { width: "3ch" },
  // The (hidden) closing ``` line doubles as the block's bottom padding.
  ".cm-md-fence-tail": { borderRadius: "0 0 8px 8px", color: "#8b949e", lineHeight: "20px" },
  "@media (hover: hover)": {
    ".cm-md-fence-body:hover": { backgroundImage: "linear-gradient(rgb(255 255 255 / 0.06), rgb(255 255 255 / 0.06))" },
    ".cm-md-fence-body:hover::before": { color: "#d4d4d8" },
  },
  // `pd-body` supplies the page's img look; margins are zeroed because spacing is computed, and
  // flow-root keeps the widget's height whole for CodeMirror's measuring.
  ".cm-md-image": { display: "flow-root" },
  ".cm-md-image img": { margin: "0 auto !important", display: "block" },
  ".cm-md-image.is-uploading": { fontSize: "13px", opacity: "0.6" },
});

export default function LiveMarkdownEditor({ value, onChange, adapterRef, onKey, onPaste, onCaret, placeholder }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Handlers change identity every WritePostForm render; the editor is built once, so it reads
  // them through a ref instead of being rebuilt (which would drop history and selection).
  const handlers = useRef({ onChange, onKey, onPaste, onCaret });
  handlers.current = { onChange, onKey, onPaste, onCaret };

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          Prec.highest(
            EditorView.domEventHandlers({
              keydown: (e, v) => (e.isComposing || v.composing ? false : handlers.current.onKey(e)),
              paste: (e) => {
                if (!e.clipboardData || !handlers.current.onPaste(e.clipboardData)) return false;
                e.preventDefault();
                return true;
              },
            }),
          ),
          EditorView.inputHandler.of((v, from, to, text) => {
            if (v.composing || text.length !== 1) return false;
            const edit = autoPair(v.state.doc.toString(), from, to, text);
            if (!edit) return false;
            v.dispatch({
              changes: { from: edit.from, to: edit.to, insert: edit.text },
              selection: { anchor: edit.selStart, head: edit.selEnd },
              userEvent: "input.type",
            });
            return true;
          }),
          history(),
          keymap.of([...historyKeymap, ...defaultKeymap]),
          EditorView.lineWrapping,
          // addKeymap: false — Enter/Backspace list handling comes from the shared shortcut table
          // so both modes behave identically.
          markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: false }),
          syntaxHighlighting(markdownStyle),
          livePreview,
          spacingField,
          theme,
          placeholder ? placeholderExt(placeholder) : [],
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString());
            if (u.docChanged || u.selectionSet) handlers.current.onCaret?.(u.state.selection.main.head);
          }),
        ],
      }),
    });
    viewRef.current = view;
    adapterRef.current = {
      getValue: () => view.state.doc.toString(),
      getSelection: () => ({ s: view.state.selection.main.from, e: view.state.selection.main.to }),
      apply: (edit) => {
        view.dispatch({
          changes: { from: edit.from, to: edit.to, insert: edit.text },
          selection: { anchor: edit.selStart, head: edit.selEnd },
          userEvent: "input",
          scrollIntoView: true,
        });
        view.focus();
      },
      focus: () => view.focus(),
      hasFocus: () => view.hasFocus,
      reveal: (pos) => {
        view.dispatch({
          selection: { anchor: pos },
          effects: EditorView.scrollIntoView(pos, { y: "start", yMargin: 24 }),
        });
        view.focus();
      },
    };
    return () => {
      adapterRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
    // Built once; `value` is only the initial document — later changes sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External edits to `body` (an image upload swapping its placeholder for the real URL, which
  // lands via setBody) are applied as a minimal diff so the caret stays where the author is
  // typing, and kept out of the undo history like the split mode's equivalent.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    let start = 0;
    while (start < current.length && start < value.length && current[start] === value[start]) start++;
    let endA = current.length;
    let endB = value.length;
    while (endA > start && endB > start && current[endA - 1] === value[endB - 1]) {
      endA--;
      endB--;
    }
    view.dispatch({
      changes: { from: start, to: endA, insert: value.slice(start, endB) },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [value]);

  return <div ref={hostRef} className="wp-live" />;
}
