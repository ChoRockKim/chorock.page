"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { previewMarkdown, saveDraft, publishPost, uploadImage, type SavePostInput } from "@/app/posts/write/actions";
import DraftsPopup from "@/components/DraftsPopup";
import LeaveConfirmDialog from "@/components/LeaveConfirmDialog";
import {
  autoPair,
  findFence,
  insertLink,
  isMacPlatform,
  listHeadings,
  setHeading,
  shortcutEdit,
  toggleWrap,
  type Edit,
  type KeyInput,
} from "@/components/editorShortcuts";
import type { EditorAdapter } from "@/components/LiveMarkdownEditor";

// CodeMirror is only loaded once someone actually picks the live mode — it never reaches the
// split mode's bundle, let alone a public page's.
const LiveMarkdownEditor = dynamic(() => import("@/components/LiveMarkdownEditor"), {
  ssr: false,
  loading: () => <div className="wp-live wp-live-loading">편집기를 불러오는 중…</div>,
});

type EditorMode = "split" | "live";
const EDITOR_MODE_KEY = "chorock-editor-mode";
import { detectCodeLang, sameFamily } from "@/components/detectCodeLang";

type SeriesOption = { id: string; title: string };

type InitialPost = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  seriesId: string | null;
};

/**
 * 저장 뒤 캐시 무효화. Server Action이 아니라 라우트 핸들러를 부르는 것이 요점이다 — 액션
 * 안에서 revalidate를 부르면 Next가 지금 보고 있는 /posts/write까지 다시 가져와, 동적 라우트라
 * loading.tsx가 끼어들며 회색 스켈레톤이 번쩍인다(app/api/revalidate-posts/route.ts 주석 참고).
 */
async function revalidateAfterSave(slug: string) {
  try {
    await fetch("/api/revalidate-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch {
    // 저장 자체는 이미 끝났다. 캐시가 늦게 갱신될 뿐이라(각 페이지의 300초 창) 저장을 실패로
    // 돌리지 않는다.
  }
}

function syncSlugToUrl(slug: string) {
  window.history.replaceState(null, "", `/posts/write?slug=${encodeURIComponent(slug)}`);
}

export default function WritePostForm({
  seriesOptions,
  allTags,
  initial,
  mode = "write",
}: {
  seriesOptions: SeriesOption[];
  allTags: string[];
  initial?: InitialPost;
  // "edit" is only ever reached from an already-published post's "수정" button (drafts have no
  // public detail page to link a "수정" button from — they're resumed via /posts/write?slug=
  // instead). So edit mode has no "draft vs published" ambiguity to offer: there's a single
  // "저장" action that re-publishes with the edited fields, and no "임시 저장" button that could
  // accidentally flip a live post's status back to "draft".
  mode?: "write" | "edit";
}) {
  const router = useRouter();

  const [slug, setSlug] = useState<string | null>(initial?.slug ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [tagSuggestOpen, setTagSuggestOpen] = useState(false);
  const [seriesTitle, setSeriesTitle] = useState(
    () => seriesOptions.find((s) => s.id === initial?.seriesId)?.title ?? ""
  );
  const [seriesSuggestOpen, setSeriesSuggestOpen] = useState(false);
  const [body, setBody] = useState(initial?.content ?? "");
  const [statusLabel, setStatusLabel] = useState(mode === "edit" ? "수정 중" : "작성 중");
  const [saving, setSaving] = useState(false);
  // 어느 버튼이 돌고 있는지. saving 하나만으로는 두 버튼이 똑같이 흐려지기만 해서
  // 무엇을 눌렀는지 구분되지 않았다.
  const [savingKind, setSavingKind] = useState<"draft" | "publish" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // ── 작성 중인 내용 유실 방지 ──────────────────────────────────────────────
  // 마지막으로 저장에 성공한 시점의 스냅샷과 현재 값을 비교해 "변경됨"을 판단한다.
  const snapshot = JSON.stringify([title, summary, body, tags, seriesTitle]);
  const savedRef = useRef(snapshot);
  const dirty = snapshot !== savedRef.current;
  const dirtyRef = useRef(dirty);
  // 의도한 이탈(발행 후 이동, 경고에서 "확인")에서는 다시 묻지 않기 위한 플래그.
  const leavingRef = useRef(false);
  const sentinelRef = useRef(false);
  // popstate가 실행될 시점엔 브라우저가 이미 주소를 이전 항목으로 되돌려 놓은 뒤다. 그래서
  // "취소"에서 location.href를 다시 쌓으면 되돌아간 주소가 박제되어, 임시저장으로 붙었던
  // ?slug=가 사라진다(그 상태로 새로고침하면 빈 새 글이 열린다). 커밋 때마다 갱신되는 이
  // ref가 "되돌아가기 직전의 주소"를 들고 있다 — popstate와 우리 핸들러 사이에는 렌더가
  // 끼어들지 않으므로 값이 오염되지 않는다.
  const pageUrlRef = useRef("");
  useEffect(() => {
    pageUrlRef.current = window.location.href;
  });
  // 모달 표시 여부. 어떤 경로로 나가려 했는지는 ref에 둔다 — 상태로 두면 onStay/onLeave의
  // 함수 정체성이 매 렌더 바뀌어 모달 쪽 effect(포커스·Escape 등록)가 계속 다시 돈다.
  const [leavePrompt, setLeavePrompt] = useState(false);
  const leaveKindRef = useRef<"popstate" | "link">("popstate");
  // "계속 작성"을 골랐을 때 되돌려 놓을 주소. 모달을 여는 것 자체가 리렌더라
  // pageUrlRef가 (이미 되돌아간) 현재 주소로 덮이기 때문에, 열기 직전 값을 따로 잡아둔다.
  const restoreUrlRef = useRef("");

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // 새로고침·탭 닫기·주소창 이동. 임시글 목록에서 다른 글을 고르는 것도 실제 페이지
  // 이동(<a href>)이라 여기서 함께 걸린다.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || leavingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // 브라우저 뒤로가기는 beforeunload가 잡지 못한다 — 같은 앱 안의 클라이언트 이동이라
  // 문서가 언로드되지 않기 때문. 대신 내용이 생긴 시점에 히스토리에 더미 항목을 하나
  // 쌓아두고, 뒤로가기가 그 항목을 소비할 때 popstate로 가로채 확인을 받는다.
  useEffect(() => {
    if (!dirty || sentinelRef.current) return;
    sentinelRef.current = true;
    pageUrlRef.current = window.location.href;
    window.history.pushState(null, "", window.location.href);
  }, [dirty]);

  useEffect(() => {
    const onPopState = () => {
      if (leavingRef.current) return;
      if (!dirtyRef.current) {
        // 저장을 마쳐 지킬 내용이 없는데 더미 항목만 소비된 경우 — 사용자가 원래 가려던
        // 곳으로 그대로 보낸다. 그러지 않으면 뒤로가기를 두 번 눌러야 나가진다.
        if (!sentinelRef.current) return;
        sentinelRef.current = false;
        leavingRef.current = true;
        window.history.back();
        return;
      }
      // 네이티브 confirm은 떠 있는 동안 메인 스레드를 막아 화면이 멈춘다. 히스토리 위치는
      // 되돌아간 그대로 두고(이전과 같은 계산을 유지) 비동기 모달로 묻는다.
      restoreUrlRef.current = pageUrlRef.current || window.location.href;
      leaveKindRef.current = "popstate";
      setLeavePrompt(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [previewContent, setPreviewContent] = useState<ReactNode>(null);
  const [readTime, setReadTime] = useState(1);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 분할(원문 + 미리보기) / 라이브(옵시디언식). Starts as split on both server and first client
  // render, then switches to the remembered choice after mount, so hydration always matches.
  const [editorMode, setEditorMode] = useState<EditorMode>("split");
  const modeRef = useRef<EditorMode>("split");
  modeRef.current = editorMode;
  useEffect(() => {
    try {
      if (localStorage.getItem(EDITOR_MODE_KEY) === "live") setEditorMode("live");
    } catch {}
  }, []);
  const changeEditorMode = (next: EditorMode) => {
    setEditorMode(next);
    try {
      localStorage.setItem(EDITOR_MODE_KEY, next);
    } catch {}
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // Which pane's scroll event triggered the sync — set right before programmatically
  // scrolling the *other* pane, so that pane's own scroll handler can tell "this fired
  // because I was just set by code, not because the user scrolled me" and skip re-syncing
  // back (otherwise the two onScroll handlers would ping-pong off each other).
  const scrollSyncSource = useRef<"body" | "preview" | null>(null);

  // Auto-grow the borderless title textarea so long titles wrap without a scrollbar.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  // Debounced live preview — routed through the real compileMarkdown() pipeline via a
  // Server Action (that module is "server-only" and can't be imported here directly), so
  // the preview always matches what the published post will actually look like.
  useEffect(() => {
    const timer = setTimeout(() => {
      previewMarkdown(body).then(({ content, readTime }) => {
        setPreviewContent(content);
        setReadTime(readTime);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [body]);

  const addTag = (value?: string) => {
    const t = (value ?? tagDraft).trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
    setTagSuggestOpen(false);
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  // Existing tags (across every post, draft or published — see listDistinctTags) that match
  // what's being typed and aren't already attached to this post. Typing something that
  // matches nothing just adds a brand-new tag on Enter — tags are plain strings, so "creating"
  // one is nothing more than that string ending up in this post's tags array.
  const tagSuggestions = tagDraft.trim()
    ? allTags.filter((t) => t.toLowerCase().includes(tagDraft.trim().toLowerCase()) && !tags.includes(t)).slice(0, 6)
    : [];

  // Same pattern as tags: matching against the fetched series list is by exact title (case-
  // insensitive) so a typed name that doesn't match anything just creates a new series on save.
  const matchedSeries = seriesOptions.find(
    (s) => s.title.toLowerCase() === seriesTitle.trim().toLowerCase()
  );
  const seriesSuggestions = (
    seriesTitle.trim()
      ? seriesOptions.filter((s) => s.title.toLowerCase().includes(seriesTitle.trim().toLowerCase()))
      : seriesOptions
  ).slice(0, 6);

  // All five body-mutation helpers below go through document.execCommand("insertText", ...)
  // instead of setBody(splicedString) + manually reassigning el.value via React's controlled-
  // input re-render. Setting a textarea's value via JS (which is what React does under the hood
  // for a controlled input whenever the new value differs from the DOM's current one) discards
  // the browser's native undo/redo history for everything before that point — execCommand fires
  // a real "input" event instead, so it lands in the same undo stack as normal typing, and the
  // existing onChange={(e) => setBody(e.target.value)} on the <textarea> picks up the resulting
  // value exactly as before (no change needed there). This is why writing in this form used to
  // make Cmd+Z stop working almost immediately — Tab-indenting a code block or file tree (common
  // in this blog's content) reset the undo baseline every time. The one deliberate exception is
  // uploadImageAtCursor's async placeholder->URL replace below, which stays a plain setBody call.
  // Two editors share every helper below through one small adapter: the split mode's <textarea>
  // (the execCommand path described above) and the live mode's CodeMirror, which has its own
  // transactions and undo history. An empty-range, empty-text edit (stepping over an
  // auto-closed bracket) only moves the caret.
  const textareaAdapter: EditorAdapter = {
    getValue: () => bodyRef.current?.value ?? "",
    getSelection: () => ({ s: bodyRef.current?.selectionStart ?? 0, e: bodyRef.current?.selectionEnd ?? 0 }),
    apply: (edit) => {
      const el = bodyRef.current;
      if (!el) return;
      el.focus();
      if (edit.from !== edit.to || edit.text) {
        el.setSelectionRange(edit.from, edit.to);
        document.execCommand("insertText", false, edit.text);
      }
      el.setSelectionRange(edit.selStart, edit.selEnd);
    },
    focus: () => bodyRef.current?.focus(),
    hasFocus: () => !!bodyRef.current && document.activeElement === bodyRef.current,
  };
  const liveAdapterRef = useRef<EditorAdapter | null>(null);
  // Live mode only: a TOC preview beside the editor, laid out like the published post's.
  const [caretPos, setCaretPos] = useState(0);
  const draftHeadings = editorMode === "live" ? listHeadings(body) : [];
  const activeHeadingPos = draftHeadings.reduce((acc, h) => (h.pos <= caretPos ? h.pos : acc), -1);
  const editor = (): EditorAdapter | null =>
    modeRef.current === "live" ? liveAdapterRef.current : bodyRef.current ? textareaAdapter : null;

  const applyEdit = (edit: Edit | null) => {
    const ed = editor();
    if (!ed || !edit) return false;
    ed.apply(edit);
    return true;
  };

  // Toggles: the same button/shortcut on already-wrapped text unwraps it (Notion behavior).
  const wrapSelection = (marker: string, endMarker = marker) => {
    const ed = editor();
    if (!ed) return;
    const { s, e } = ed.getSelection();
    applyEdit(toggleWrap(ed.getValue(), s, e, marker, endMarker));
  };

  const insertLinePrefix = (prefix: string) => {
    const ed = editor();
    if (!ed) return;
    const { s } = ed.getSelection();
    const lineStart = ed.getValue().lastIndexOf("\n", s - 1) + 1;
    const pos = s + prefix.length;
    applyEdit({ from: lineStart, to: lineStart, text: prefix, selStart: pos, selEnd: pos });
  };

  const insertBlock = (template: string, cursorOffset?: number) => {
    const ed = editor();
    if (!ed) return;
    const { s, e } = ed.getSelection();
    const before = ed.getValue().slice(0, s);
    const needsNL = before.length > 0 && !before.endsWith("\n");
    const text = (needsNL ? "\n" : "") + template + "\n";
    const pos = s + (needsNL ? 1 : 0) + (cursorOffset ?? template.length);
    applyEdit({ from: s, to: e, text, selStart: pos, selEnd: pos });
  };

  // The shortcut table itself lives in editorShortcuts.ts#shortcutEdit, shared by both editors.
  // Returns whether the key was consumed. `stop` keeps ⌘K/⌘⇧K away from Header's site search.
  const handleEditorKey = (e: KeyInput & { preventDefault(): void; stopPropagation(): void }) => {
    const ed = editor();
    if (!ed) return false;
    const { s, e: selEnd } = ed.getSelection();
    const result = shortcutEdit(e, ed.getValue(), s, selEnd, isMacPlatform());
    if (!result.handled) return false;
    e.preventDefault();
    if (result.stop) e.stopPropagation();
    if (result.edit) ed.apply(result.edit);
    return true;
  };

  // A plain <textarea> treats Tab as "move focus to the next field" by default — the shared
  // table makes it indent instead. Keys pressed mid-composition (isComposing) are left alone —
  // handling Enter there duplicates or drops the last Hangul syllable.
  const handleBodyKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    handleEditorKey(e);
  };

  // Auto-closing ( [ { " runs on the native beforeinput event, not keydown. Typing "(" right
  // after a Hangul syllable ("함수(") reaches keydown still flagged isComposing; by beforeinput
  // the syllable has been committed and "(" arrives as its own insertText. React's
  // onBeforeInput is a polyfill over keypress/textInput, hence the raw listener. The edit's own
  // execCommand fires beforeinput again with data "()", which the length-1 check ignores.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.isComposing || e.inputType !== "insertText" || !e.data || e.data.length !== 1) return;
      const edit = autoPair(el.value, el.selectionStart, el.selectionEnd, e.data);
      if (!edit) return;
      e.preventDefault();
      applyEdit(edit);
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => el.removeEventListener("beforeinput", onBeforeInput);
    // The textarea unmounts in live mode, so the listener must be re-attached on the way back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode]);

  // Matches the 4MB cap actions.ts#uploadImage enforces server-side — checked here too so an
  // oversized paste never leaves the browser. Vercel's own serverless request body cap
  // (~4.5MB, independent of our code) rejects an over-limit request before it ever reaches our
  // Server Action, which surfaces client-side as Next's generic masked production error
  // instead of this action's own clear message — catching it client-side avoids that entirely.
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

  // Textareas can't show an inline image while it uploads, so a unique-token placeholder
  // stands in for it — insert immediately at `pos` for feedback, then once the upload
  // action resolves, find-and-replace that exact placeholder string with the real markdown
  // image. The token makes the replace precise even if several images are uploading at once
  // or the user keeps typing elsewhere in the body while they wait.
  const uploadImageAtCursor = (file: File, pos: number): number => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError("이미지가 너무 큽니다 (4MB 이하로 올려주세요).");
      return pos;
    }

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placeholder = `![업로드 중...](uploading:${token})`;
    const after = pos + placeholder.length + 1;
    if (!applyEdit({ from: pos, to: pos, text: `${placeholder}\n`, selStart: after, selEnd: after })) {
      setBody((prev) => prev.slice(0, pos) + placeholder + "\n" + prev.slice(pos));
    }

    const formData = new FormData();
    formData.append("image", file);
    uploadImage(formData)
      .then((result) => {
        if ("error" in result) {
          setBody((prev) => prev.replace(`${placeholder}\n`, ""));
          setImageError(result.error);
        } else {
          setBody((prev) => prev.replace(placeholder, `![](${result.url})`));
        }
      })
      .catch((err) => {
        setBody((prev) => prev.replace(`${placeholder}\n`, ""));
        setImageError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
      });

    return pos + placeholder.length + 1;
  };

  // Typed code gets the same treatment as pasted code: once the author pauses inside a closed
  // fence that has no language yet, fill it in from the content. The owner writes fences by
  // typing ``` twice rather than with the toolbar, so paste-only detection never fired for them.
  // Only the fence at the caret — opening an old post for editing must not relabel every bare
  // fence in it. A content string is tried once: if the author deletes the label it stays gone.
  const labeledFences = useRef(new Set<string>());
  useEffect(() => {
    const timer = setTimeout(() => {
      const ed = editor();
      if (!ed || !ed.hasFocus()) return;
      const value = ed.getValue();
      const { s, e: selEnd } = ed.getSelection();
      const fence = findFence(value, s);
      if (!fence || !fence.closed || fence.lang) return;
      const content = value.slice(fence.contentStart, fence.contentEnd);
      if (content.trim().length < 12 || labeledFences.current.has(content)) return;
      labeledFences.current.add(content);
      const lang = detectCodeLang(content);
      if (!lang) return;
      const shift = (p: number) => (p >= fence.langStart ? p + lang.length : p);
      applyEdit({ from: fence.langStart, to: fence.langStart, text: lang, selStart: shift(s), selEnd: shift(selEnd) });
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  // Pasting code into an *empty* fence (the toolbar's "코드 블록" then ⌘V) fills in the fence's
  // language from the snippet. Only empty fences: a block that already has content had its label
  // chosen deliberately. detectCodeLang returns null when unsure, and the label is left alone.
  // Two execCommands (label, then text) so both steps stay in the undo stack.
  const pasteIntoCodeFence = (text: string) => {
    const ed = editor();
    if (!ed || !text.trim()) return false;
    const value = ed.getValue();
    const { s, e } = ed.getSelection();
    const fence = findFence(value, s);
    if (!fence || value.slice(fence.contentStart, fence.contentEnd).trim()) return false;
    const lang = detectCodeLang(text);
    if (!lang || sameFamily(lang, fence.lang)) return false;
    const delta = lang.length - fence.lang.length;
    // A fence with no language ("```" alone) needs no space; the opening line is just ```.
    applyEdit({ from: fence.langStart, to: fence.langEnd, text: lang, selStart: s + delta, selEnd: e + delta });
    const end = s + delta + text.length;
    applyEdit({ from: s + delta, to: e + delta, text, selStart: end, selEnd: end });
    return true;
  };

  // Shared by both editors; returns true when the paste was consumed (caller prevents default).
  const handlePasteData = (data: DataTransfer) => {
    const imageFiles = Array.from(data.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length === 0) return pasteIntoCodeFence(data.getData("text/plain"));

    setImageError(null);
    let pos = editor()?.getSelection().s ?? body.length;
    for (const file of imageFiles) {
      pos = uploadImageAtCursor(file, pos);
    }
    return true;
  };

  const handleBodyPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (handlePasteData(e.clipboardData)) e.preventDefault();
  };

  const handleFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setImageError(null);
    uploadImageAtCursor(file, editor()?.getSelection().s ?? body.length);
  };

  // Proportional (not line-accurate) scroll sync — mirrors how far down each pane is by
  // percentage, since mapping a textarea's raw markdown position to a spot in the compiled
  // preview tree would need source-position tracking through the whole rehype pipeline.
  const syncScroll = (from: "body" | "preview") => {
    if (scrollSyncSource.current === from) {
      scrollSyncSource.current = null;
      return;
    }
    const source = from === "body" ? bodyRef.current : previewRef.current;
    const target = from === "body" ? previewRef.current : bodyRef.current;
    if (!source || !target) return;
    const sourceRange = source.scrollHeight - source.clientHeight;
    const ratio = sourceRange > 0 ? source.scrollTop / sourceRange : 0;
    const targetRange = target.scrollHeight - target.clientHeight;
    scrollSyncSource.current = from === "body" ? "preview" : "body";
    target.scrollTop = ratio * targetRange;
  };

  const buildInput = (): SavePostInput => ({
    slug,
    title,
    summary,
    content: body,
    tags,
    seriesId: matchedSeries?.id ?? null,
    newSeriesTitle: !matchedSeries && seriesTitle.trim() ? seriesTitle.trim() : null,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    setSavingKind("draft");
    setSaveError(null);
    const attempted = snapshot;
    try {
      const result = await saveDraft(buildInput());
      if ("error" in result) {
        setSaveError(result.error);
      } else {
        setSlug(result.slug);
        syncSlugToUrl(result.slug);
        if (result.needsRevalidate) await revalidateAfterSave(result.slug);
        setStatusLabel("임시 저장됨");
        // 기준선은 "현재 값"이 아니라 "방금 보낸 값"으로 갱신한다 — 저장을 누른 뒤
        // 응답을 기다리는 동안 이어서 타이핑한 부분은 그대로 미저장으로 남아야 한다.
        savedRef.current = attempted;
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
      setSavingKind(null);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setSavingKind("publish");
    setSaveError(null);
    const attempted = snapshot;
    try {
      const result = await publishPost(buildInput());
      if ("error" in result) {
        setSaveError(result.error);
        setSaving(false);
        setSavingKind(null);
        return;
      }
      savedRef.current = attempted;
      // 이동 전에 캐시를 비운다 — 그러지 않으면 방금 발행한 글이 목록에 없는 채로 도착한다.
      if (result.needsRevalidate) await revalidateAfterSave(result.slug);
      leavingRef.current = true;
      // 이동이 끝날 때까지 버튼을 잠근 채로 둔다(saving을 되돌리지 않는다). 되돌리면
      // router.push가 진행되는 동안 한 번 더 눌려 중복 발행될 수 있다.
      router.push(`/posts/${encodeURIComponent(result.slug)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "발행에 실패했습니다.");
      setSaving(false);
      setSavingKind(null);
    }
  };

  // Shortcut labels for tooltips and the cheat sheet. Starts as the Mac glyphs and switches after
  // mount — reading navigator during render would mismatch the server's HTML.
  const [keys, setKeys] = useState({ mod: "⌘", alt: "⌥", shift: "⇧" });
  useEffect(() => {
    if (!isMacPlatform()) setKeys({ mod: "Ctrl+", alt: "Alt+", shift: "Shift+" });
  }, []);
  const { mod, alt, shift } = keys;
  const shortcutList: [string, string][] = [
    [`${mod}B`, "굵게"],
    [`${mod}I`, "기울임"],
    [`${mod}${shift}S`, "취소선"],
    [`${mod}E`, "인라인 코드"],
    [`${mod}K`, "링크"],
    [`${mod}${alt}1 · 2 · 3`, "제목 ## · ### · ####"],
    [`${alt}↑ / ↓`, "줄 이동"],
    [`${alt}${shift}↑ / ↓`, "줄 복사"],
    [`${mod}${shift}K`, "줄 삭제"],
    ["Tab / Shift+Tab", "들여쓰기 / 내어쓰기"],
    ["Enter", "목록 이어쓰기 · 코드 자동 들여쓰기"],
    ["( [ { \"", "자동 닫기 (선택 영역은 감싸기)"],
  ];

  const toolbarBtn = (
    label: ReactNode,
    title: string,
    onClick: () => void,
    style?: CSSProperties
  ) => (
    <button type="button" title={title} onClick={onClick} className="wp-toolbar-btn" style={style}>
      {label}
    </button>
  );

  const handleStay = useCallback(() => {
    // 뒤로가기를 막아세운 경우에만 히스토리를 원위치시킨다. "← 나가기"는 아직 아무것도
    // 이동하지 않았으므로 되돌릴 것이 없다.
    if (leaveKindRef.current === "popstate") {
      window.history.pushState(null, "", restoreUrlRef.current || window.location.href);
    }
    setLeavePrompt(false);
  }, []);

  const handleLeave = useCallback(() => {
    leavingRef.current = true;
    setLeavePrompt(false);
    if (leaveKindRef.current === "popstate") window.history.back();
    else router.push("/posts");
  }, [router]);

  return (
    <>
      <LeaveConfirmDialog open={leavePrompt} onStay={handleStay} onLeave={handleLeave} />
      {/* top: 0이면 화면 맨 위, 즉 고정된 사이트 헤더 뒤에 붙어 가려진다(헤더 z-40 > 여기 z-30).
          헤더가 실측해 :root에 심어둔 --header-h만큼 내려서 헤더 바로 아래에 붙게 한다. */}
      <div style={{ position: "sticky", top: "var(--header-h, 67px)", zIndex: 30 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-6)",
            background: "var(--color-bg)",
            borderBottom: "1px solid var(--color-divider)",
          }}
        >
          <Link
            href="/posts"
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={(e) => {
              if (!dirty) return;
              e.preventDefault();
              leaveKindRef.current = "link";
              setLeavePrompt(true);
            }}
          >
            ← 나가기
          </Link>
          {saveError && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-danger, #e5484d)" }}>
              {saveError}
            </span>
          )}
          <span style={{ marginLeft: saveError ? 0 : "auto", fontSize: 12, opacity: 0.5 }}>{statusLabel}</span>
          {mode === "write" && (
            <>
              <DraftsPopup currentSlug={slug} />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                aria-busy={savingKind === "draft"}
                onClick={handleSaveDraft}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {savingKind === "draft" ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> 저장 중…
                  </>
                ) : (
                  "임시 저장"
                )}
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            aria-busy={savingKind === "publish"}
            onClick={handlePublish}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {savingKind === "publish" ? (
              <>
                <span className="spinner" aria-hidden="true" /> {mode === "edit" ? "저장 중…" : "발행 중…"}
              </>
            ) : mode === "edit" ? (
              "저장"
            ) : (
              "발행하기"
            )}
          </button>
        </div>
      </div>

      {/* 작성 화면은 읽기용 본문이 아니라 도구다 — 가독폭(960)에 맞출 이유가 없고, 2단으로
          쪼개면 한 칸이 440px밖에 안 돼 좁다는 지적을 받았다. 다만 화면 폭을 다 쓰는 1680은
          이번엔 너무 넓다는 판단이라, 둘의 중간인 1320으로 맞췄다(한 칸 약 620px). */}
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
        <textarea
          ref={titleRef}
          className="wp-title"
          rows={1}
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="input"
          placeholder="요약 (목록 카드에 보일 짧은 설명)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={{ margin: "var(--space-3) 0" }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) 0",
            marginBottom: "var(--space-4)",
            borderBottom: "1px solid var(--color-divider)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <span key={tag} className="tag tag-accent" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11, opacity: 0.7 }}
                >
                  ×
                </button>
              </span>
            ))}
            <div style={{ position: "relative" }}>
              <input
                className="input"
                style={{ width: 140, minHeight: 28, padding: "3px 8px", fontSize: 12 }}
                placeholder="태그 입력 후 Enter"
                value={tagDraft}
                onChange={(e) => {
                  setTagDraft(e.target.value);
                  setTagSuggestOpen(true);
                }}
                onFocus={() => setTagSuggestOpen(true)}
                onBlur={() => setTagSuggestOpen(false)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === "Escape") {
                    setTagSuggestOpen(false);
                  }
                }}
              />
              {tagSuggestOpen && tagSuggestions.length > 0 && (
                <div
                  className="elev-md"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 10,
                    minWidth: 140,
                    padding: 4,
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {tagSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      // mousedown (not click) fires before the input's blur, so the
                      // suggestion is still mounted when this handler runs
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addTag(t);
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        font: "inherit",
                        fontSize: 12,
                        padding: "5px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
            <input
              className="input"
              style={{ width: 160, minHeight: 32, fontSize: 13, paddingRight: seriesTitle ? 22 : 8 }}
              placeholder="시리즈 없음"
              value={seriesTitle}
              onChange={(e) => {
                setSeriesTitle(e.target.value);
                setSeriesSuggestOpen(true);
              }}
              onFocus={() => setSeriesSuggestOpen(true)}
              onBlur={() => setSeriesSuggestOpen(false)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Escape") setSeriesSuggestOpen(false);
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            {seriesTitle && (
              <button
                type="button"
                title="시리즈 선택 해제"
                // mousedown (not click) fires before the input's blur, matching the tag
                // suggestion buttons below
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSeriesTitle("");
                }}
                style={{
                  position: "absolute",
                  right: 6,
                  border: "none",
                  background: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 13,
                  opacity: 0.5,
                }}
              >
                ×
              </button>
            )}
            {seriesSuggestOpen && seriesSuggestions.length > 0 && (
              <div
                className="elev-md"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  zIndex: 10,
                  minWidth: 160,
                  padding: 4,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {seriesSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSeriesTitle(s.title);
                      setSeriesSuggestOpen(false);
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                      fontSize: 12,
                      padding: "5px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
            {seriesTitle.trim() && !matchedSeries && (
              <span style={{ fontSize: 11, opacity: 0.5, whiteSpace: "nowrap" }}>새 시리즈로 생성됨</span>
            )}
          </div>
          <span style={{ fontSize: 12, opacity: 0.55, marginLeft: "auto" }}>예상 읽는 시간 {readTime}분</span>
        </div>

        <div className={`wp-split${editorMode === "live" ? " is-live" : ""}`}>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePicked}
              style={{ display: "none" }}
            />
            <div className="wp-mode-row">
              <div className="wp-mode-toggle" role="group" aria-label="편집 방식">
                <button
                  type="button"
                  className={editorMode === "split" ? "is-active" : ""}
                  aria-pressed={editorMode === "split"}
                  onClick={() => changeEditorMode("split")}
                  title="마크다운 원문과 미리보기를 나란히"
                >
                  분할
                </button>
                <button
                  type="button"
                  className={editorMode === "live" ? "is-active" : ""}
                  aria-pressed={editorMode === "live"}
                  onClick={() => changeEditorMode("live")}
                  title="쓰는 자리에서 바로 서식이 보이는 편집기"
                >
                  라이브
                </button>
              </div>
              {imageError && (
                <span style={{ fontSize: 11, color: "var(--color-danger, #e5484d)" }}>{imageError}</span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "4px 6px",
                border: "1px solid var(--color-divider)",
                borderBottom: "none",
                borderRadius: "6px 6px 0 0",
                background: "var(--color-surface)",
                flexWrap: "wrap",
              }}
            >
              {toolbarBtn(<span style={{ fontWeight: 700, fontSize: 13 }}>H1</span>, `제목 (${mod}${alt}1)`, () => {
                const ed = editor();
                if (ed) applyEdit(setHeading(ed.getValue(), ed.getSelection().s, 2));
              })}
              {toolbarBtn(<span style={{ fontWeight: 700, fontSize: 14 }}>B</span>, `굵게 (${mod}B)`, () => wrapSelection("**"))}
              {toolbarBtn(<span style={{ fontStyle: "italic", fontSize: 14 }}>I</span>, `기울임 (${mod}I)`, () => wrapSelection("*"))}
              {toolbarBtn(<span style={{ textDecoration: "line-through", fontSize: 14 }}>S</span>, `취소선 (${mod}${shift}S)`, () => wrapSelection("~~"))}
              <span className="wp-toolbar-divider" />
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <path d="M96 72H56a16 16 0 0 0-16 16v40a16 16 0 0 0 16 16h16v24a16 16 0 0 1-16 16M216 72h-40a16 16 0 0 0-16 16v40a16 16 0 0 0 16 16h16v24a16 16 0 0 1-16 16" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                "인용구",
                () => insertLinePrefix("> ")
              )}
              <span className="wp-toolbar-divider" />
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <circle cx="44" cy="64" r="12" fill="currentColor" />
                  <rect x="88" y="56" width="120" height="16" rx="4" fill="currentColor" />
                  <circle cx="44" cy="128" r="12" fill="currentColor" />
                  <rect x="88" y="120" width="120" height="16" rx="4" fill="currentColor" />
                  <circle cx="44" cy="192" r="12" fill="currentColor" />
                  <rect x="88" y="184" width="120" height="16" rx="4" fill="currentColor" />
                </svg>,
                "글머리 기호",
                () => insertLinePrefix("- ")
              )}
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <text x="32" y="72" fontSize="34" fill="currentColor" fontFamily="ui-monospace,monospace">1</text>
                  <rect x="88" y="56" width="120" height="16" rx="4" fill="currentColor" />
                </svg>,
                "번호 목록",
                () => insertLinePrefix("1. ")
              )}
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <rect x="32" y="52" width="36" height="36" rx="6" stroke="currentColor" strokeWidth="14" />
                  <path d="M40 70l10 10 16-18" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="88" y="56" width="120" height="16" rx="4" fill="currentColor" />
                </svg>,
                "할 일 목록",
                () => insertLinePrefix("- [ ] ")
              )}
              <span className="wp-toolbar-divider" />
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <path d="M104 152l-16 16a40 40 0 0 1-56-56l24-24a40 40 0 0 1 56-2" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
                  <path d="M152 104l16-16a40 40 0 0 1 56 56l-24 24a40 40 0 0 1-56 2" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
                </svg>,
                `링크 (${mod}K)`,
                () => {
                  const ed = editor();
                  if (!ed) return;
                  const { s, e } = ed.getSelection();
                  applyEdit(insertLink(ed.getValue(), s, e));
                }
              )}
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <rect x="32" y="56" width="192" height="144" rx="10" stroke="currentColor" strokeWidth="14" />
                  <circle cx="92" cy="104" r="14" fill="currentColor" />
                  <path d="M32 168l52-40 40 32 36-44 60 60" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                "이미지 (붙여넣기도 가능)",
                () => fileInputRef.current?.click()
              )}
              <span className="wp-toolbar-divider" />
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <path d="M84 88 36 128l48 40M172 88l48 40-48 40M144 72l-32 112" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                `인라인 코드 (${mod}E)`,
                () => wrapSelection("`")
              )}
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <rect x="32" y="48" width="192" height="160" rx="10" stroke="currentColor" strokeWidth="14" />
                  <path d="M92 104 68 128l24 24M164 104l24 24-24 24" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                "코드 블록",
                () => insertBlock("```\n\n```", 4)
              )}
              <details className="wp-shortcuts">
                <summary className="wp-toolbar-btn" title="단축키" aria-label="단축키 보기">?</summary>
                <div className="wp-shortcuts-panel">
                  <dl>
                    {shortcutList.map(([k, label]) => (
                      <div key={k}>
                        <dt><kbd>{k}</kbd></dt>
                        <dd>{label}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>빈 코드 블록에 코드를 붙여넣으면 언어를 자동으로 채웁니다.</p>
                </div>
              </details>
            </div>
            {editorMode === "live" ? (
              <LiveMarkdownEditor
                value={body}
                onChange={setBody}
                adapterRef={liveAdapterRef}
                onKey={handleEditorKey}
                onPaste={handlePasteData}
                onCaret={setCaretPos}
                placeholder="## 소제목 — 쓰는 자리에서 바로 서식이 보입니다."
              />
            ) : (
            <textarea
              ref={bodyRef}
              className="wp-body"
              style={{ height: "calc(60vh - 40px)", border: "1px solid var(--color-divider)", borderRadius: "0 0 6px 6px", padding: "var(--space-3)" }}
              placeholder={"## 소제목\n\n본문을 마크다운으로 작성하세요.\n\n```tsx\n코드 블록\n```\n\n> 인용구"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={handleBodyPaste}
              onKeyDown={handleBodyKeyDown}
              onScroll={() => syncScroll("body")}
            />
            )}
          </div>
          {editorMode === "live" && (
            <aside className="wp-live-toc" aria-label="목차 미리보기">
              <p>목차</p>
              {draftHeadings.length === 0 ? (
                <span className="wp-live-toc-empty">## 제목을 쓰면 여기에 목차가 생깁니다.</span>
              ) : (
                <ul>
                  {draftHeadings.map((h) => (
                    <li key={`${h.pos}-${h.text}`} className={h.depth === 3 ? "is-sub" : undefined}>
                      <button
                        type="button"
                        className={h.pos === activeHeadingPos ? "is-active" : undefined}
                        onClick={() => liveAdapterRef.current?.reveal?.(h.pos)}
                      >
                        {h.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
          <div className="wp-preview-col">
            <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 var(--space-2)" }}>
              미리보기
            </p>
            <div
              ref={previewRef}
              className="pd-body"
              style={{ height: "60vh", overflowY: "auto", paddingRight: "var(--space-2)" }}
              onScroll={() => syncScroll("preview")}
            >
              {body.trim() ? (
                previewContent
              ) : (
                <p style={{ opacity: 0.4, fontSize: 14 }}>왼쪽에 내용을 작성하면 여기에 미리보기가 표시됩니다.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
