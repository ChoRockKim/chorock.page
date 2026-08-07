"use client";

import {
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
import Link from "next/link";
import { previewMarkdown, saveDraft, publishPost, uploadImage, type SavePostInput } from "@/app/posts/write/actions";

type SeriesOption = { id: string; title: string };

type InitialPost = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  seriesId: string | null;
};

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [previewContent, setPreviewContent] = useState<ReactNode>(null);
  const [readTime, setReadTime] = useState(1);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const wrapSelection = (marker: string, endMarker = marker) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e) || "텍스트";
    const next = body.slice(0, s) + marker + selected + endMarker + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      const pos = s + marker.length;
      el.focus();
      el.setSelectionRange(pos, pos + selected.length);
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", s - 1) + 1;
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(next);
    requestAnimationFrame(() => {
      const pos = s + prefix.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const insertBlock = (template: string, cursorOffset?: number) => {
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const before = body.slice(0, s);
    const needsNL = before.length > 0 && !before.endsWith("\n");
    const insertText = (needsNL ? "\n" : "") + template + "\n";
    const next = before + insertText + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      const pos = before.length + (needsNL ? 1 : 0) + (cursorOffset ?? template.length);
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  // Textareas can't show an inline image while it uploads, so a unique-token placeholder
  // stands in for it — insert immediately at `pos` for feedback, then once the upload
  // action resolves, find-and-replace that exact placeholder string with the real markdown
  // image. The token makes the replace precise even if several images are uploading at once
  // or the user keeps typing elsewhere in the body while they wait.
  const uploadImageAtCursor = (file: File, pos: number): number => {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placeholder = `![업로드 중...](uploading:${token})`;
    setBody((prev) => prev.slice(0, pos) + placeholder + "\n" + prev.slice(pos));

    const formData = new FormData();
    formData.append("image", file);
    uploadImage(formData)
      .then(({ url }) => {
        setBody((prev) => prev.replace(placeholder, `![](${url})`));
      })
      .catch((err) => {
        setBody((prev) => prev.replace(`${placeholder}\n`, ""));
        setImageError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
      });

    return pos + placeholder.length + 1;
  };

  const handleBodyPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length === 0) return;

    e.preventDefault();
    setImageError(null);
    let pos = bodyRef.current?.selectionStart ?? body.length;
    for (const file of imageFiles) {
      pos = uploadImageAtCursor(file, pos);
    }
  };

  const handleFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setImageError(null);
    uploadImageAtCursor(file, bodyRef.current?.selectionStart ?? body.length);
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
    setSaveError(null);
    try {
      const result = await saveDraft(buildInput());
      setSlug(result.slug);
      syncSlugToUrl(result.slug);
      setStatusLabel("임시 저장됨");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await publishPost(buildInput());
      router.push(`/posts/${encodeURIComponent(result.slug)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "발행에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
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
          <Link href="/posts" className="btn btn-ghost" style={{ fontSize: 13 }}>
            ← 나가기
          </Link>
          {saveError && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-danger, #e5484d)" }}>
              {saveError}
            </span>
          )}
          <span style={{ marginLeft: saveError ? 0 : "auto", fontSize: 12, opacity: 0.5 }}>{statusLabel}</span>
          {mode === "write" && (
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={handleSaveDraft}>
              임시 저장
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handlePublish}>
            {mode === "edit" ? "저장" : "발행하기"}
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-6)", animation: "pageFadeIn .5s ease both" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePicked}
              style={{ display: "none" }}
            />
            <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 var(--space-2)" }}>
              마크다운 편집
              {imageError && (
                <span style={{ marginLeft: 8, color: "var(--color-danger, #e5484d)", textTransform: "none", letterSpacing: "normal" }}>
                  {imageError}
                </span>
              )}
            </p>
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
              {toolbarBtn(<span style={{ fontWeight: 700, fontSize: 13 }}>H1</span>, "제목", () => insertLinePrefix("## "))}
              {toolbarBtn(<span style={{ fontWeight: 700, fontSize: 14 }}>B</span>, "굵게", () => wrapSelection("**"))}
              {toolbarBtn(<span style={{ fontStyle: "italic", fontSize: 14 }}>I</span>, "기울임", () => wrapSelection("*"))}
              {toolbarBtn(<span style={{ textDecoration: "line-through", fontSize: 14 }}>S</span>, "취소선", () => wrapSelection("~~"))}
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
                "링크",
                () => wrapSelection("[", "](https://)")
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
                "인라인 코드",
                () => wrapSelection("`")
              )}
              {toolbarBtn(
                <svg width="15" height="15" viewBox="0 0 256 256" fill="none">
                  <rect x="32" y="48" width="192" height="160" rx="10" stroke="currentColor" strokeWidth="14" />
                  <path d="M92 104 68 128l24 24M164 104l24 24-24 24" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                "코드 블록",
                () => insertBlock("```tsx\n\n```", 7)
              )}
            </div>
            <textarea
              ref={bodyRef}
              className="wp-body"
              style={{ height: "calc(60vh - 40px)", border: "1px solid var(--color-divider)", borderRadius: "0 0 6px 6px", padding: "var(--space-3)" }}
              placeholder={"## 소제목\n\n본문을 마크다운으로 작성하세요.\n\n```tsx\n코드 블록\n```\n\n> 인용구"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={handleBodyPaste}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="text-muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 var(--space-2)" }}>
              미리보기
            </p>
            <div className="pd-body" style={{ height: "60vh", overflowY: "auto", paddingRight: "var(--space-2)" }}>
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
