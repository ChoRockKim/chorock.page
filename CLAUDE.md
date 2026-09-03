# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Next.js + MongoDB Atlas rewrite of a personal blog (chorock.page) previously run as
Express(SSR) + MongoDB Atlas + Docker + GitHub Actions + EC2. Most of the site is now
implemented (posts, series, projects, about, the write/edit editor, owner auth, search) —
see "What exists" below before assuming a page/route is present.

## Commands

```bash
npm install
cp .env.local.example .env.local   # then fill MONGODB_URI (and NEXT_PUBLIC_GISCUS_* to test comments)
npm run seed                        # inserts sample posts/series via scripts/seed.ts (tsx, reads .env.local directly)
npm run dev
npm run build                       # also runs eslint + tsc; treat lint errors as build failures
npm run lint
```

There is no test suite yet. `npm run build` is the main correctness gate (Next.js runs
type-checking and ESLint as part of `build`, so a green build implies both pass).

## Architecture

**Data layer is server-only and lives in `lib/`, not in components.**
- `lib/mongodb.ts` — mongoose connection cached on `global` (survives dev HMR reloads and
  serverless re-invocations). Import `connectToDatabase()` before any model query.
- `lib/posts.ts` — all Mongo access for posts/series (`getPostBySlug`, `getSeriesNav`,
  `getRelatedPosts`, `searchPosts`). Imports `"server-only"` so it can't accidentally end
  up in a client bundle. Uses `.lean<T>()` generics for typed query results instead of `any`.
- `lib/markdown.ts` — two separate concerns that must stay in sync:
  - `extractHeadings()` parses the raw markdown with `remark` directly to build the TOC, and
    slugs headings with `github-slugger` — the same algorithm `rehype-slug` uses internally,
    so the ids always match the anchors actually rendered.
  - `compileMarkdown()` is a **plain remark→rehype pipeline** (`remarkParse`, `remarkGfm`,
    `remarkRehype`, `rehypeSlug`, `rehypePrettyCode`, `rehypeReact`), deliberately NOT MDX.
    Post content is free-form prose from a database (migrated forum posts, future
    hand-written posts), not authored MDX files — MDX treats `{...}` in prose as a JS
    expression to evaluate, so a post that just *mentions* `{ error }` outside a code fence
    throws `ReferenceError` at render time under `next-mdx-remote`'s `compileMDX` (hit this
    for real on migrated content, see CHANGELOG 0.3.0). Don't reintroduce MDX here — `{}` and
    `<tags>` in prose must stay literal text. `rehype-pretty-code`/`rehype-slug` work
    identically in either pipeline since they operate on the hast tree; only the
    hast→React step changed (`rehypeReact` instead of MDX's own JSX compiler), and the
    `pre`/`img`/`blockquote` → `components/CodeBlock.tsx`/`components/Mdx.tsx` component
    mapping still works the same way. `rehypePrettyCode`'s `transformers` option includes
    `@shikijs/colorized-brackets`' `transformerColorizedBrackets()` for VSCode-style rainbow
    bracket matching (nested `()`/`[]`/`{}` each get a distinct, rotating color) — works with
    the `"github-dark"` theme with no extra config since the transformer supports every Shiki
    built-in theme out of the box. Required bumping `shiki` from `^1` to `^4` (the transformer
    package pins shiki 4.x internally); `rehype-pretty-code@0.14.5`'s peer range
    (`^1 || ^2 || ^3 || ^4`) already covered this, so no other pipeline changes were needed.
    **Rainbow brackets (and syntax highlighting generally) silently no-op for two distinct
    reasons**, both confirmed directly against real post content and both fixed in the same
    pass: (1) a fenced code block with no language at all (```` ``` ```` alone) — `rehype-
    pretty-code` skips it entirely, passing through a bare `<pre><code>` with no highlighting,
    no `.code-block` styling, no bracket colors; fixed with `defaultLang: "tsx"` so every
    language-less fence gets tokenized as tsx rather than skipped (imperfect for a genuinely
    non-JS/TS unlabeled snippet, but "always trigger" was the explicit ask). (2) A language *is*
    specified but wrong-cased (` ```JAVASCRIPT `/` ```Javascript ` instead of ` ```javascript `)
    — Shiki's grammar lookup is case-sensitive, and a case mismatch isn't treated as invalid (an
    error `rehype-pretty-code` would fall back to `defaultLang` for) — it silently renders as
    one plain unstyled span with zero token colors, while `data-language` (and the header badge
    it feeds) still shows the original string, so the block *looks* labeled and fine. This is
    the actual explanation behind "works sometimes, not others" reports — real posts have
    inconsistently-cased fences throughout. Fixed with a small custom remark plugin
    (`remarkLowercaseCodeLang`, right before `remarkRehype`) that lowercases every `code` node's
    `lang` before `rehypePrettyCode` ever sees it — covers every casing at once, whereas
    `defaultLang` alone only ever covers the fully-missing-language case.
    **`remark-breaks`** (also in this pipeline) turns every single newline within a
    paragraph/blockquote into a hard `<br>` instead of CommonMark's default "soft break"
    (collapsed to a space) — without it, anything typed with single Enters between lines (the
    write form is a plain `<textarea>`, so that's the natural way to type it) silently runs
    together into one line. Confirmed as the real cause of a bug report: a post's `> /src` /
    `> /components` file-tree listing, one path per line, rendered as a single run-on line. This
    is a site-wide rendering change (affects prose paragraphs everywhere, not just blockquotes)
    and was applied deliberately as the fix, not as a scoped-down workaround.
- Series "prev/next" and "related posts" are computed by query (sibling posts sorted by
  `publishedAt`, tag overlap) rather than stored as arrays on the document — there is no
  denormalized ordering to keep in sync when posts are added.

**Models** (`models/Post.ts`, `models/Series.ts`) are a fresh schema, not a 1:1 port of the old
Express blog's (forum uses the raw MongoDB driver, no slug/tags/status/series concept at all —
see `scripts/migrate-from-forum.ts` for the actual field mapping). `Post` has a `legacyId`
field (sparse unique, the old forum `_id` as a hex string) on posts brought over by that
script — it's the upsert key (re-running the migration is safe/idempotent) and how
`app/detail/[id]/route.ts` resolves the old `/detail/:id` URLs to a 308 redirect.

**Old blog source**: `/Users/chorock/Desktop/coding/node 장인/forum` — Express (raw MongoDB
driver, not Mongoose) + MongoDB Atlas (same cluster as next-blog, `forum` database — see
`lib/mongodb.ts`'s sibling connection logic in `scripts/migrate-from-forum.ts`) + Docker +
GitHub Actions + EC2. `post` collection content is already Markdown (good — no HTML
conversion needed), no slug/tags/status/series. `comments` collection has real DB-backed
comments that are **not** migrated (giscus can't ingest arbitrary historical comments) — see
CHANGELOG 0.3.0 for the full schema mapping and what was intentionally left out.

**Dynamic route params are not auto-decoded.** `params.slug` in `app/posts/[slug]/page.tsx`
arrives percent-encoded (e.g. Korean slugs), not decoded — call `decodeURIComponent(slug)`
before querying. Only surfaced once real (Korean-titled) migrated posts existed; the dummy
seed data happened to use ASCII slugs so this was invisible until 0.3.0. Conversely, a
`Location` header (e.g. in `permanentRedirect(...)`) must be ASCII — encode with
`encodeURIComponent` when building one from a Korean slug, or Node throws
"Cannot convert argument to a ByteString". `<Link href>`/`<a href>` don't need this — the
browser encodes non-ASCII in hrefs itself. **`revalidatePath()` has the same encoding
requirement** — it keys its cache entry off the literal request pathname (percent-encoded),
not the decoded segment value `generateStaticParams()` returns. Confirmed by reproducing the
bug directly: `revalidatePath(\`/posts/${slug}\`)` with a raw Korean slug silently failed to
invalidate the post's ISR cache (edits kept showing stale content indefinitely), while
`revalidatePath(\`/posts/${encodeURIComponent(slug)}\`)` worked immediately — see
`app/posts/write/actions.ts#revalidatePosts` / `app/posts/[slug]/actions.ts#deletePost` and
CHANGELOG 0.7.29. `generateStaticParams()` itself takes the plain decoded slug (confirmed
working — Korean filenames show up correctly under `.next/server/app/posts/*.html`), so these
two Next.js APIs disagree on encoding for the exact same route and each needs handling
differently.

**Never sort with `localeCompare()` in code that runs during SSR** (e.g. anything computed
in a Server Component or in a Client Component's render, like the tag list in
`components/PostsListClient.tsx`). Locale-aware collation of mixed Korean/Latin strings can
order differently between Node's ICU (server) and the browser's — same items, different
order — which breaks hydration (see CHANGELOG 0.5.2). Use plain code-unit comparison
(`a < b ? -1 : a > b ? 1 : 0`) instead, or pin an explicit locale if you really need
locale-aware ordering.

**Theme (light/dark) has no React context.** `app/layout.tsx` sets `data-theme` on `<html>`
via an inline script before hydration (avoids a flash of the wrong theme), and
`suppressHydrationWarning` is required on `<html>` because of this. `components/Header.tsx`
owns the toggle (localStorage key `chorock-theme`, optional `document.startViewTransition`
circular-reveal animation — must be called as `obj.startViewTransition(...)`, not
destructured into a bare variable, or the browser throws "Illegal invocation"). Any other
component that needs to react to theme changes (e.g. `components/GiscusComments.tsx`) reads
it via `components/useTheme.ts`, which watches the `data-theme` attribute with a
`MutationObserver` instead of prop-drilling.

**Styling has no Tailwind / CSS-in-JS.** Everything is CSS custom properties + plain classes
in `app/globals.css`. The design system it implements ("Broadsheet") is **the site owner's own** —
they authored it in Claude Design, referencing various examples, and then ported it here; it is
not a third-party or off-the-shelf system, so treat its conventions as deliberate authorship
rather than someone else's constraints. Only the part chorock.page actually uses was ported —
the CMYK print-separation effect and Source Serif headline treatment were demo-only and are
intentionally left out.

**Pretendard is loaded asynchronously, not via a plain CSS `@import`.** A CDN `@import` at the
top of `globals.css` used to render-block every single page load (confirmed by Lighthouse —
"Render-blocking requests", see CHANGELOG 0.7.31). The fix is the standard `media="print"`
stylesheet trick in `app/layout.tsx`: `<link id="pretendard-css" media="print" ...>` doesn't
block paint, then a script flips `media` to `"all"` once it loads. **The classic version of
this trick — a raw `onload="this.media='all'"` HTML attribute right on the `<link>` — does NOT
work in this stack**: React's rendering model (SSR included) never serializes an `on*` prop as
a literal inline-handler HTML attribute — there's no code path for it, so it's not "stripped" so
much as never emitted in the first place (verified by `curl`-ing the rendered HTML — the
attribute is simply absent, no warning, no error). Use a real `<script>` with
`link.addEventListener("load", ...)` instead (see `PRETENDARD_ASYNC_LOAD_SCRIPT`
in `layout.tsx`) — this is the one thing in the file that can't just be a JSX prop.

**The header collapses into a floating glass capsule on scroll, and three rules keep it from
breaking things.** `<header>` (`.site-header`) is a transparent positioning shell; `.site-bar`
carries the visible surface and animates from full-bleed to a right-aligned ~462px capsule
(`border-radius: 999px`, glass, `--shadow-lg`). Glass values live in `--glass-bg`/`--glass-sheen`/
`--glass-edge`/`--glass-rim` per theme — they used to be `white` mixes hardcoded in an inline style,
which dark mode had no way to adjust.
- **Nothing may change the header's height.** If it shrinks, the spacer shrinks with it, 55px
  vanishes from the top of the document and the body jumps up — Chromium's scroll anchoring hides
  this, Safari has none (hit for real in 0.7.98). So the float offset is `transform: translateY()`,
  never `margin`, and the block padding is fixed while only the inline padding animates. Header and
  spacer measure 67px in both states.
- **The gathered width is measured in JS (`--bar-w`), not expressed in CSS.** The pure-CSS version
  (`min-width: 100% → 0` against `width: max-content`) resolves to `max(min-width, content width)`,
  so the shrink finishes early in the timeline; with a slow easing the bar sat still while the
  corners were still rounding. `Header.tsx` sums the children's widths and re-measures on
  `document.fonts.ready` (Pretendard loads async, so glyph widths change late).
- **Two easings, deliberately.** An overshoot curve on `width` drives it *below* the content width
  for a few frames, and the nav visibly folds to two lines and back (reproduced by sampling 40 rAF
  frames). Size properties use `--bar-ease-size` (no overshoot); only `border-radius` and
  `transform` get `--bar-ease-spring`. `.site-bar` is also `flex-wrap: nowrap` so a fold is
  impossible regardless.
- Real refraction (`components/LiquidGlassFilter.tsx`) is **Chromium-only** — Safari and Firefox
  accept `backdrop-filter` and silently drop the SVG part, so the iPhone this imitates never shows
  it. It is gated on a Houdini Paint API check rather than on graceful degradation, and only applied
  once the width transition has ended. The filter splits the backdrop into R/G/B with `feColorMatrix`,
  displaces each at a *different* `scale` (0.085/0.06/0.035) and adds them back with
  `feComposite(arithmetic, k2=k3=1)` — that per-channel difference is the chromatic aberration, and
  it is what separates "glass" from "a blurred rectangle". `primitiveUnits="objectBoundingBox"` makes
  `scale` a fraction of the element, so the lens tracks the capsule's animated width instead of
  needing a rebuilt displacement map at every size.
- **Order matters in that `backdrop-filter`: `blur()` must come before `url()`.** With `url()` first
  the frosting effectively disappears and high-contrast content behind shows straight through
  (verified by laying a black/white stripe pattern behind the capsule and diffing with the lens on
  and off). The header passes over post body content, so this is a legibility bug, not a cosmetic
  one. Blur first, then bend.
- The angular rim highlight (`.site-bar::before`, a conic gradient masked to the border width) is the
  one part of the glass that is **pure CSS and therefore works everywhere**, Safari included.
- **The mobile menu is a separate glass surface with its own lens.** `LiquidGlassFilter` takes an `id`
  and is mounted twice — the displacement map is generated for a specific element size, so sharing one
  map between the capsule and the (differently sized) menu warps it wrongly. The menu also uses a
  darker tint (`--glass-bg-panel`) than the bar: a bar is glanced past, a menu is read, and at the
  bar's clarity the items disappear over a post's cover image.
- **Testing the ≤640px layout in this environment: use a same-origin `<iframe>`, not window resizing.**
  This machine's Chrome does not apply `resize_window` to the rendering viewport, but media queries
  inside an iframe evaluate against the iframe's box, so a 390×800 iframe reproduces the mobile
  layout faithfully and can be scripted through `contentWindow`/`contentDocument`.
- The mobile nav panel lives inside `<header>` at `top: 100%`; reusing the measured `spacerH` (as it
  once did) misaligns it against the floated capsule.

**Any grid/flex container whose item can render a `.code-block` needs `min-width: 0` on that
item.** Grid/flex items default to `min-width: auto`, which refuses to shrink below their
content's intrinsic width — a wide code block (`.code-block pre` has `overflow-x: auto`, but
that only scrolls the block's *own* content, it doesn't stop the block itself from stretching
its grid/flex track) was silently forcing `.pd-body` (post detail's `.pd-grid` column) and
`WritePostForm`'s 50/50 editor/preview split wide enough to fit the longest code line — on
mobile this kept the post detail page desktop-width no matter what `@media` rules said, and in
the write form the preview column ate into the editor column. Fixed by adding `min-width: 0` to
`.pd-body` (`globals.css`) and to both grid-item `<div>`s wrapping the editor/preview in
`WritePostForm.tsx` (see CHANGELOG 0.7.33). `app/projects/[slug]/page.tsx`'s content column
already had `minWidth: 0` from when it was first written, so it never had this bug — if you add
a new place that can render compiled markdown inside a grid/flex layout, give it `min-width: 0`
from the start rather than waiting to hit this.

**`.pd-body img` (`globals.css`) styles *every* `<img>` inside the post detail `<article>`, not
just images from the post's own markdown.** It sets `margin: var(--space-4) auto`, `width: auto`,
`max-height: 640px`, meant for images that come out of `compileMarkdown()`. But it's a plain
descendant-class selector, so any OTHER component rendered inside `<article className="pd-body">`
— e.g. `components/PostAuthorCard.tsx`'s profile photo — inherits it too. Confirmed as a real bug:
the author card's photo isn't a markdown image but still picked up the 20px top margin, shoving it
down inside its circular mask and cropping it into a lopsided shape (verified via
`getBoundingClientRect()`/`getComputedStyle()` in the browser, not just visually — see CHANGELOG
0.7.38, and 0.7.37 for the wrong "WebKit clipping bug" theory tried first before finding this).
Any non-markdown `<Image>` placed inside `.pd-body` needs to explicitly override
`margin`/`maxHeight` (and `borderRadius`/`width` if it needs to differ) in its own inline `style`
— inline style beats a class selector, so this is enough, but it has to be done explicitly rather
than assumed.

**`.code-block pre` has `-webkit-text-size-adjust: 100%` / `text-size-adjust: 100%`** to opt out
of mobile WebKit/Blink's automatic font-boosting (Text Autosizer) — a narrow, horizontally
scrollable (`overflow-x: auto`), monospace-heavy element like this is exactly what triggers that
heuristic, so the code block's text rendered larger than its explicit `font-size: 13px` on mobile
even though desktop was unaffected (desktop Chrome doesn't have this behavior at all, so it can't
be reproduced/verified there — see CHANGELOG 0.7.39). If another element develops the same
"looks fine on desktop, mysteriously bigger on a real phone" symptom, check for this class of
narrow+scrollable+monospace container before assuming it's a font-size or media-query bug.

**Modal entrance/exit animations must live in `app/globals.css`, never in a component's inline
`style`.** `.dialog`/`.dialog-backdrop` are shared by the header search, `DraftsPopup` and
`LeaveConfirmDialog`, and all three used to declare `animation: "modalPop …"` inline. Inline style
beats a class, so `.dialog-backdrop.is-closing .dialog { animation: modalPopOut … }` was silently
ignored — the closing class was applied and the animation name stayed `modalPop` (confirmed by
sampling `getComputedStyle(...).animationName` per frame). A dialog that needs an exit animation also
has to stay mounted through it: keep a `…Mounted` state and unmount on a timer that outlasts the
keyframes (the pattern `ScrollToTopButton` established), and defer clearing its content to that
timer, or the box renders empty while it animates away.

**Comments are giscus, not a custom backend.** `components/GiscusComments.tsx` embeds the
giscus script client-side against `NEXT_PUBLIC_GISCUS_*` env vars; if they're unset it
renders a setup hint instead of erroring. There is no comment data in MongoDB.

**Clicking a markdown-body image opens a full-screen pinch-zoom viewer** (Naver Blog-style),
via `react-photo-view` — `components/Mdx.tsx#MDXImage` wraps its `<img>` in `PhotoView`, and
`app/layout.tsx` mounts one global `PhotoProvider`. Scope is deliberately narrow: only images
that come out of `compileMarkdown()`'s `img` mapping go through `MDXImage`, so project cover
images (the `/projects` View Transition targets) and the `PostAuthorCard` avatar are untouched
— confirmed by clicking a cover image directly, no viewer opens. **`react-photo-view` ships
zero `"use client"` directives anywhere in its bundle** (checked directly —
`grep -c "use client" node_modules/react-photo-view/dist/*.js` → `0` for every format), so
`app/layout.tsx` (a Server Component) importing and rendering `PhotoProvider` straight from
the package broke `npm run build` with `TypeError: (0, d.createContext) is not a function`
during `/_not-found` page-data collection — Next's RSC bundler had no signal to treat the
module as client-only. Fixed the same way as `QueryProvider.tsx`/`AuthSessionProvider.tsx`:
`components/PhotoViewProvider.tsx` is a thin wrapper that starts with `"use client"` and
re-exports `PhotoProvider`; `layout.tsx` imports that wrapper, never the package directly. Any
future third-party provider that needs mounting in `layout.tsx` should be assumed to need this
same wrapper treatment unless its bundle is confirmed to ship its own `"use client"`.

**Pasting an image into the write-form editor uploads it, ported from the legacy Express
blog's S3 setup.** `components/WritePostForm.tsx`'s body `<textarea>` isn't a rich editor
(no built-in paste-blob hook the way Toast UI Editor gave the old blog), so the paste
detection is hand-rolled: `onPaste` inspects `e.clipboardData.items` for `image/*` entries,
inserts a unique-token placeholder (`![업로드 중...](uploading:<token>)`) at the cursor for
immediate feedback, then calls the `uploadImage` Server Action
(`app/posts/write/actions.ts`) and find-and-replaces that exact placeholder string with the
real `![](url)` once the upload resolves — the token makes the replace precise even with
several images uploading at once or the user typing elsewhere in the body meanwhile. The
toolbar's "이미지" button reuses the exact same upload path via a hidden
`<input type="file">` instead of duplicating logic. `lib/uploadImage.ts` (`"server-only"`)
does the actual upload: `sharp` resize-to-1200px+webp-compress (same pipeline as the old
blog's `utils/uploadToS3.js`) then `@aws-sdk/client-s3` `PutObjectCommand` to the **same S3
bucket the old forum blog used** (`nodeblogforum0530`, `ap-southeast-2` — same
`S3_ACCESS_KEY`/`S3_ACCESS_SECRET_KEY` values reused from forum's `.env`, identical pattern
to `MONGODB_URI` reusing forum's `DB_PASSWORD`), but under a `next-posts/` prefix so these
uploads don't mix with images the old forum already uploaded under `posts/`. Uploads are
capped at 4MB (`app/posts/write/actions.ts#uploadImage`) — this isn't arbitrary, it's because
Vercel's serverless function request body cap (~4.5MB, all plans) sits outside and below
whatever `next.config.ts`'s `experimental.serverActions.bodySizeLimit` (bumped to `4mb` from
the 1MB default) allows, so anything larger would fail with an unhelpful platform-level error
instead of this action's own clear message. A presigned-URL direct-to-S3 upload would dodge
that ceiling entirely but is more infra than a single-owner blog's editor needs.
`lib/uploadImage.ts#uploadPostImage` reads with `sharp(buffer, { animated: true })`, not a bare
`sharp(buffer)` — sharp's own type defs say `animated` defaults to `false`, meaning it silently
reads only an image's first frame/page. Without this, an uploaded animated GIF converted to a
WebP with zero animation (confirmed directly: a real 4-frame test GIF run through the old,
option-less call produced a `metadata().pages` of `undefined` — a single static frame — while
the same input with `animated: true` kept multiple frames through the resize+webp() pipeline).
Harmless to pass unconditionally for every upload, animated or not — a single-frame image
behaves identically either way, so there's no need to branch on file type.

**That `animated: true` change immediately surfaced a second, pre-existing bug when a real GIF
was pasted**: `app/posts/write/actions.ts#uploadImage` called `uploadPostImage(buffer)` with no
try/catch, so any exception it threw propagated out of the Server Action uncaught — and per this
file's own "Server Actions must `return { error }`, never `throw`" rule (see below), Next.js
masks every uncaught Server Action throw into the generic "An error occurred in the Server
Components render..." message in production, with zero diagnostic info. Confirmed the actual
trigger directly: sharp's animated read reports an image's `height` as every frame stacked
(frame height × frame count), so total pixel count scales with frame count — a real
screen-recording-derived GIF can cross sharp's default ~268M-pixel safety cap
(`limitInputPixels`, meant to guard against decompression-bomb-style input on
public/untrusted endpoints) well before it looks suspicious by any other measure; forcing that
limit low on a real multi-frame test GIF reproduces sharp's own `Input image exceeds pixel
limit` throw exactly. Fixed two ways together: (1) wrapped `uploadPostImage(buffer)` in
try/catch, returning `{ error: "이미지 업로드에 실패했습니다: " + <real message> }` so any future
failure here is actually visible instead of masked — matches this file's own established
`ActionResult<T>` pattern already used for deliberate validation, just extended to also cover
this specific external, fallible operation's *unexpected* failures (image decode/encode + S3
`PutObject`), since the single owner using this form benefits far more from a real diagnostic
message than from the generic mask this route had been silently relying on. (2) Set
`limitInputPixels: false` in `uploadPostImage`'s own `sharp()` call — this action is behind
`requireOwner()` (never public) and already bounded by the 4MB compressed-input cap
(`app/posts/write/actions.ts`'s `MAX_UPLOAD_BYTES`), so sharp's own decompression-bomb guard is
redundant here and was the actual thing standing between the owner and a normal, legitimate GIF.

**The write-form body `<textarea>`'s Tab-indent, toolbar buttons (bold/italic/heading/code
block/etc.), Shift+Tab-outdent, and the image-paste placeholder insert all go through
`document.execCommand("insertText", false, text)`, not `setBody(splicedString)`.** This
textarea is a React-controlled input (`value={body}`); splicing the string in JS and calling
`setBody` makes React reassign the DOM `.value` property directly, which is NOT a native input
event — and Chrome discards a textarea's undo/redo history for everything before a
JS-assigned `.value`. Since this blog's actual content is code-block/file-tree heavy (constant
Tab presses), Cmd+Z was effectively broken almost immediately in every real writing session
(confirmed as the actual complaint, not a hypothetical edge case). `execCommand("insertText")`
fires a genuine native `input` event instead, so it lands in the browser's own undo stack
exactly like typing does, and the existing `onChange={(e) => setBody(e.target.value)}` picks up
the result unchanged — no downstream logic (the debounced preview, etc.) needed to change.
**Deliberate exception**: `uploadImageAtCursor`'s async placeholder→real-URL replace (after the
upload Server Action resolves) is NOT part of this `execCommand` conversion — it stays a plain
`setBody((prev) => prev.replace(...))`. That replace can happen well after the user has
moved on to typing elsewhere; routing it through `execCommand` would require refocusing the
textarea and moving the selection to the placeholder's location, hijacking the user's cursor
mid-typing. Losing the undo baseline at that one specific moment (upload completing in the
background) is the accepted tradeoff — the immediate placeholder insertion (a direct result of
the user's own paste action) still goes through `execCommand`, so that step is undo-able.

**Header search** (`app/api/search/route.ts` + `lib/posts.ts#searchPosts`) does a regex
match against title/summary/tags server-side — it is not a full-text/Atlas Search index.

**Visitor counting (`today`/`total`, right-aligned in the avatar row on `/about`) is two
separate client components, deliberately not merged into one.** `components/VisitTracker.tsx`
(mounted once in `app/layout.tsx`, no UI, fires on every route) `POST`s
`app/api/visits/route.ts` to record a visit; `components/VisitCounter.tsx` (mounted only in
`app/about/page.tsx`) separately `GET`s the same route to display current counts, never
recording. `VisitCounter` renders `today 0 · total 0` immediately (state initialized to
`{ today: 0, total: 0 }`, not `null`) rather than nothing while the fetch is in flight — it
used to render nothing until loaded, which per user feedback meant the counter was slow enough
to show up that people didn't notice it existed in the first place; showing 0 immediately and
letting the real numbers replace it a moment later is the fix. This has to be client-side at all
(not counted during the page's own server render) because `/about` — like most routes — is ISR
(`revalidate = 300`), so a server-render-time count would only tick on cache regeneration, not
on real visits. `DailyVisitModel` (`models/Visit.ts`) is one document per KST calendar day
(`Intl.DateTimeFormat` with an explicit `timeZone: "Asia/Seoul"` — Vercel's functions run in UTC,
so a plain `Date` would roll "today" over at 9am KST instead of midnight); the site total is a
`$sum` aggregation across that collection rather than a second, separately-maintained running
counter, so the two numbers can never drift apart. Uniqueness is a single httpOnly cookie
(`chorock_last_visit`, value = last-recorded KST date) checked in the `POST` handler, not
IP-based, to avoid storing IPs at all. **Known, accepted quirk**: on the very first `/about`
load of a browser session (no cookie yet), `VisitTracker`'s `POST` and `VisitCounter`'s `GET`
fire as two independent concurrent requests with no ordering guarantee, so the displayed numbers
can be momentarily inconsistent (e.g. "오늘 1 · 총 0") if the `GET` resolves before the `POST`'s
increment commits — confirmed via direct testing, and confirmed it self-corrects on the very
next load once the cookie exists (`VisitTracker`'s `POST` becomes a dedup no-op, so there's only
one request in flight). Deliberately not "fixed" by having `VisitCounter` do the recording
itself — that would remove the display race but introduce a real double-counting risk instead
(two components racing to see "no cookie yet" and both incrementing) for a purely decorative
counter, a worse trade.

**`components/ScrollToTopButton.tsx` is mounted site-wide in `app/layout.tsx`** (not per-page
like `components/ReadingProgressBar.tsx`, which only exists on `/posts/[slug]`) — appears bottom
right once `window.scrollY` passes 400px, same `passive: true` scroll-listener pattern as
`ReadingProgressBar`. It stays mounted through its own exit animation instead of vanishing
instantly the moment you scroll back up: a `wasVisibleRef` (plain ref, not state — needs a
synchronous read inside the scroll handler, which a `useState` value can't give you across
renders) tracks the last known shown/hidden edge, and a `leaveTimer` delays the actual unmount
until `globals.css`'s `scrollTopOut` keyframe (200ms) has had time to finish playing, matching
its duration exactly. Clicking `window.scrollTo({ top: 0, behavior: "smooth" })`s and briefly
toggles an `is-bouncing` class that replays a small arrow-bounce keyframe — this is a purely
decorative "fun" touch the user explicitly asked for, not tied to any state that needs to
survive a re-render. Its `bottom` offset (`app/globals.css`'s `.scroll-top-btn`) is
`calc(var(--space-6) + 60px)`, not a plain `var(--space-6)` — `position: fixed` means it stays
the same distance from the viewport bottom regardless of scroll position, so at the very bottom
of the page (where the button's own show condition is satisfied) a bare `var(--space-6)` landed
it directly on top of `Footer.tsx`'s GitHub/LinkedIn/Instagram icon row, which is also
right-aligned near the bottom edge. The extra 60px clears the footer's own height (~30px padding
+ 24px icon row + 30px padding) so the two never overlap.

**`/projects` list → `/projects/[slug]` uses a real cross-page View Transition** (the card's
cover image and title visually morph into the detail page's corresponding elements, not a plain
cut) via the `next-view-transitions` package (`app/layout.tsx` wraps everything in its
`<ViewTransitions>`; `components/ProjectCard.tsx` and `app/projects/[slug]/page.tsx` both import
`Link` from `next-view-transitions` instead of `next/link` — a plain `next/link` navigation
would NOT trigger a transition even with matching names, since the library's own router is what
actually calls `document.startViewTransition()` around the navigation). Hand-rolling this with
raw `document.startViewTransition()` (the way `components/Header.tsx`'s theme toggle does it)
was considered and rejected — that works for the theme toggle because it's a synchronous
same-page state flip, but sequencing `document.startViewTransition()` correctly against Next.js
App Router's *async* client-side navigation (waiting for the new route's RSC payload to actually
land before the "after" DOM snapshot is captured) is a known sharp edge; the library exists
specifically to solve that timing problem. The actual visual pairing is just matching
`viewTransitionName` inline-style values between the two pages — `project-cover-<slug>` on both
`ProjectCard`'s image wrapper and the detail page's cover image wrapper, `project-title-<slug>`
on both title elements — the browser handles the morph itself, no custom
`::view-transition-group()` timing was added (the default was good enough once tested). The
detail page's cover image is deliberately **not** wrapped in `<ScrollReveal>` the way the
sections below it are — its own opacity:0-start entrance animation would fight the incoming
morph. Confirmed working by patching `document.startViewTransition` to count invocations before
clicking a card (not just by eye — the transition itself is sub-300ms and too fast to reliably
catch with screenshot polling) and by diffing rendered HTML for matching `view-transition-name`
values on both pages. Browsers without `startViewTransition` support (feature-detected inside
the library) just navigate normally, same graceful-degradation shape as the theme toggle;
`prefers-reduced-motion: reduce` is handled separately in `globals.css` (browsers don't skip
View Transitions for that preference automatically, so it's a manual `animation: none` override
on the `::view-transition-*` pseudo-elements — same reasoning as the theme toggle's manual
`matchMedia` check).

**Two follow-up causes of visible flicker during that transition, both fixed**: (1)
`components/ProjectCard.tsx`'s cover image used a smaller `sizes` (`33vw`-ish, appropriate for
its actual grid-tile size) than the detail page's cover image (`sizes="(min-width: 900px) 700px,
100vw"`) — next/image resolves `sizes` to one of a handful of fixed candidate widths, so a
different `sizes` hint meant the card and the detail page requested genuinely different-
resolution files under different `/_next/image` URLs. The detail page's larger file was a cache
miss on first visit, so it hadn't finished loading when the view transition captured the "after"
frame — visible as a flash of empty space before the real image popped in a moment later,
outside the transition's control. Fixed by making the card request the exact same `sizes` as the
detail page, so the browser already has the file cached (from viewing the grid) by the time the
transition fires — traded against the grid's own non-priority card images now taking slightly
longer to paint (larger files), an acceptable trade for 3 projects. (2) **The bigger one**:
`.proj-grid` (this file, `app/projects/[slug]/page.tsx`) and `/projects/page.tsx`'s `<main>` both
had `animation: pageFadeIn 0.5s ease both` — a leftover from before either page used View
Transitions. Once `ProjectCard`/the back-link started navigating through
`next-view-transitions`' `Link`, EVERY mount of either page now got pageFadeIn's own opacity
animation stacking on top of the view transition's own default page-level cross-fade — two
separate opacity animations racing on the same content, in both directions (list→detail and
detail→list), which is what actually read as "flickering" once a real person watched it live
(screenshot-polling too slow to have caught this one — found by re-reading the plan's own
flagged risk after the user reported it live). Fixed by removing `pageFadeIn` from both — no
replacement entrance animation needed since the view transition itself already provides one.

**A third, asymmetric flicker source**: fixing both of the above made list→detail smooth, but
detail→list still flickered — the giveaway that it wasn't the same root cause again is that it
only happened in *one* direction. `app/projects/page.tsx`'s grid had `className="stagger-list"`
(the same `cardIn` opacity/translateY keyframe `components/PostsListClient.tsx` uses, per-child
`nth-child` delays), which re-fires on every mount of the grid — including landing back on it via
`next-view-transitions`' `Link` from a detail page — fighting the transition's own morph of that
same card's cover image/title back into place. `PostsListClient.tsx`'s own `.stagger-list` usage
is untouched — it doesn't participate in View Transitions so there's nothing for it to conflict
with there.

**`.stagger-list` on `/projects` was later restored, suppressed only for the one navigation that
can conflict with it.** Removing it entirely (previous paragraph) fixed the flicker but also
killed the list's entrance animation for every visit, including ones with zero conflict risk —
a user complaint prompted checking which arrivals into `/projects` actually go through
`next-view-transitions`' `Link` (the only thing that triggers a View Transition at all):
grepping confirmed it's exactly one place, the "← 프로젝트 목록" back-link on
`app/projects/[slug]/page.tsx` (`Header.tsx`'s nav and every other path to `/projects` use a
plain `next/link`, so they were never at risk). `components/ProjectsBackLink.tsx` extracts that
one link into a client component whose `onClick` adds `projects-nav-no-stagger` to
`<html>` synchronously before navigating (same `html.theme-transition` technique
`components/Header.tsx`'s theme toggle already uses to scope an animation override to one
specific transition) and removes it via `setTimeout` ~700ms later (comfortably longer than both
the View Transition's default duration and `cardIn`'s own 0.45s). `app/globals.css`'s
`html.projects-nav-no-stagger .stagger-list > *` rule is the only thing that reads this class — `app/projects/page.tsx` itself stays a plain Server Component with
`.stagger-list` unconditionally in its markup, no awareness of "how did the visitor arrive"
needed. Verified with a `MutationObserver` on `<html>`'s `class` attribute (screenshot polling is
too slow for a sub-second class add/remove) that the class is added synchronously on click and
cleared ~700ms later, and separately confirmed the CSS rule itself flips `getComputedStyle(...)
.animationName` between `"cardIn"` and `"none"` as expected.

**That suppression rule must shorten the animation, never remove it — and this bit an already-
shipped "fix".** `animation: none` clears `animation-name`, which *cancels* the animation; putting
the name back when the class is removed starts a BRAND NEW animation from zero. So the original
rule didn't suppress the stagger at all, it postponed it: the cards fanned in ~700ms after the
cover image had already morphed back into place, which reads as two animations in a row and was
reported as exactly that. The rule now overrides `animation-duration: 1ms` / `animation-delay: 0s`
instead, keeping `animation-name` intact — the same animation keeps running, finishes in a
millisecond, and by the time the override lifts its elapsed time is past the full 0.71s timeline
(`cardIn` 0.45s + the last child's 0.26s delay), so it stays finished. `SUPPRESS_MS` is 1200, not
700: it has to outlast that 0.71s measured from when the grid *mounts*, i.e. after the navigation
itself. Verified by sampling `<html>`'s class, the last card's computed opacity and
`animation-duration` every 50ms across a real back-navigation from three different projects.
`ProjectsBackLink` also registers a `popstate` listener, because the browser back button and the
swipe-back gesture reach `/projects` without ever touching that `Link`.

**View Transitions are disabled below 800px** (`app/globals.css`, same `@media (max-width: ...)`
breakpoint `.proj-grid` itself uses to collapse to one column) — the morph reads as janky rather
than delightful at phone width (explicit user call), same `animation: none !important` on the
`::view-transition-*` pseudo-elements as the `prefers-reduced-motion` block right above it, just
gated on viewport width instead of the motion preference. Both rules can apply simultaneously
with no conflict (same declaration, `!important` in both). With the morph fully off on mobile,
navigating list→detail became an instant, jarring cut with no transition at all — the same
`@media (max-width: 800px)` block on `.proj-grid` (the detail page's own root class; the list
page doesn't use it, so this can't fire on `/projects` itself) reuses the existing `pageFadeIn`
keyframe (`.pd-grid`'s post-detail entrance fade) as a plain `animation: pageFadeIn 0.4s ease
both` to soften that cut. This does NOT risk the 0.7.53 bug (`pageFadeIn` stacking with View
Transition's own cross-fade, which caused the original flicker) — that conflict can only happen
where the browser's View Transition animation is actually running, and at this same breakpoint
it's already force-disabled by the rule above, so there's nothing left to stack with.

**`app/sitemap.ts` emits a real `<lastmod>` per URL**, via
`lib/posts.ts#listPostSitemapEntries` / `lib/projects.ts#listProjectSitemapEntries` /
`lib/series.ts#listSeriesSitemapEntries` (each falling back to `publishedAt` for documents that
predate `{ timestamps: true }`). It used to emit bare `<loc>` entries, which gives Google no
freshness signal to prioritise crawling with — a contributing cause of the indexing backlog
0.7.75 fixed. A series' `lastModified` is the `$max` over its *posts*, not the Series document's
own `updatedAt`: the page's content is its post list, so adding a post changes the page while
leaving the Series document untouched.

**Both detail pages have a TOC, and it is the same two components.** `components/TableOfContents.tsx`
(client, scrollspy) and `components/TocMobile.tsx` (a plain `<details>` server component) are used
by `/posts/[slug]` AND `/projects/[slug]`; neither was modified to be reused. The scrollspy finds
its targets with `document.getElementById(h.id)` only — no container selector — so it is portable
anywhere the ids exist. On the project page they live *inside* `.proj-sidebar` rather than in a
grid column of their own, which needs two scoped CSS overrides (`app/globals.css`): the inline
`position: sticky` has to be neutralized because `.proj-sidebar` is already sticky at the same
offset, and the `.toc-desktop`/`.toc-mobile` swap happens at 900px (matching `.pd-grid`) while
`.proj-grid` collapses at 800px — without an override, 801–900px would show the mobile
`<details>` beside a still-full-width sidebar. The project TOC is filtered to `h2` only
(`extractHeadings(...).filter((h) => h.depth === 2)`); including `h3` makes `boo-game` 13 entries
and overflows the sidebar. **`extractHeadings` must be given the exact same string
`compileMarkdown` got** — they are independent pipelines that only agree because both bottom out
in `github-slugger`, so a trimmed variant silently desyncs every anchor.

**A `position: sticky` element taller than the viewport is not merely clipped — its lower part is
unreachable**, because scrolling moves the page while the pinned box stays put. Adding the TOC
pushed `.proj-sidebar` to ~688px, and at a 583px viewport the last TOC entry sat 185px below the
fold with no way to scroll to it. `app/globals.css` caps the sidebar (`max-height: calc(100vh -
100px)`, flex column) above 800px and gives `overflow-y: auto` to `.proj-toc` **only** — the
sidebar itself keeps `overflow: visible` so the `<h1>` carrying
`viewTransitionName: project-title-<slug>` never gains a clipping/scrolling ancestor that could
crop its morph in from `/projects`.

**A TOC anchor jump does not move the scrollspy's active marker on its own, and that needed an
explicit fix.** The jump lands a heading at `scroll-margin-top: 90px`, but `TableOfContents`'
active band is `rootMargin: "-30% 0px -60% 0px"` — the viewport's 30–40% strip, measured at
262–349px on an 872px viewport. The clicked heading therefore lands ~170px *above* the band and is
never reported active, so the marker stayed put (this affected `/posts/[slug]` too, for as long as
the TOC has existed). The link's `onClick` now sets `activeId` directly and stamps a `clickedAt`
ref that makes the observer ignore entries for 700ms, so the settling scroll can't immediately
override the click. `clickedAt` starts at 0, so the early-return can't fire before a first click —
plain scroll behavior is unchanged. The lock is released by `scrollend`, not a fixed timer:
`app/globals.css` sets `html { scroll-behavior: smooth }` (so TOC links glide rather than
teleport), and a timed lock that expires mid-flight lets every heading the scroll passes through
drag the marker along. The 1.2s timer is only a fallback for browsers without `scrollend` and for
a click that doesn't scroll at all — clicking the section you're already on — where `scrollend`
never fires.

**`components/RevealBlocks.tsx` exists because a ratio `threshold` is the wrong tool for a tall
element.** `/projects/[slug]`'s overview used to be one `<ScrollReveal>`, and long projects showed
"you have to scroll way down before anything appears". `IntersectionObserver`'s
`intersectionRatio` is intersectionArea/elementArea, so `threshold: 0.1` means *a tenth of the
element* must be inside the root: measured on `/projects/boo-game` at an 872px viewport, body
5,139px and root 785px, so ~514px of body had to enter before anything faded. `RevealBlocks`
passes no `threshold` (default 0, height-independent) and reveals each top-level markdown block
separately. It deliberately does NOT split and re-compile the markdown per section — a fresh
`GithubSlugger` per `compileMarkdown` call would change duplicate-heading id suffixes and silently
break the TOC anchors above. `ScrollReveal` still carries the same `threshold: 0.1`; its other
uses wrap short elements, so it was left alone.

**`.pd-body p` / `.pd-body ul,ol` set `opacity: var(--pd-text-opacity)` (0.88), and that
specificity beats a naive reveal rule.** `.pd-body p` is (0,1,1) and outranks `.reveal-blocks > *`
at (0,1,0) — the first version of the per-block fade left prose and lists permanently visible
while only headings, figures and tables faded, so half the page popped in. The rules are written
`.pd-body.reveal-blocks > *` (both classes are on the same element) to reach (0,2,0), and the
revealed state restores `--pd-text-opacity` for `p`/`ul`/`ol` explicitly rather than forcing
`opacity: 1`, which would have brightened body text site-wide. The variable exists so that 0.88
isn't hardcoded in two places.

**IndexNow pings fire on every publish/delete/seed** (`lib/indexnow.ts`) — Naver and Bing get
told about changed URLs immediately; Google does not participate in IndexNow, so its discovery
path is the sitemap `lastmod` (0.7.75). The module deliberately does NOT import `"server-only"`:
`scripts/seed-projects.ts` runs under plain tsx where that package throws at import time, and the
key is not a secret anyway — IndexNow verifies ownership by serving the same value publicly at
`/<key>.txt` (the file in `public/`), so hiding it in an env var buys nothing. The key constant in
`lib/indexnow.ts` and the `public/<key>.txt` filename must always change together. Pings swallow
every failure with a 4s timeout — a dead ping must never break publishing (same spirit as the
`return { error }` rule). Hooked in `upsertPost` (published status only — drafts have no public
URL), `deletePost` (submitting deleted URLs is spec-sanctioned: engines recrawl and drop them),
and `seed-projects.ts` (published entries only).

**SEO/share-preview metadata is generated, not static image files.** No favicon/OG image
assets exist in the repo (no logo was ever made) — `app/icon.tsx`/`app/apple-icon.tsx`/
`app/opengraph-image.tsx` all use `next/og`'s `ImageResponse` to render the same "초"
initial-in-an-accent-circle idea already used for the `/about` avatar fallback and the career
logo fallback, so there's one visual identity instead of three ad-hoc ones.
`app/posts/[slug]/opengraph-image.tsx` / `app/projects/[slug]/opengraph-image.tsx` render the
actual post/project title dynamically per request (reusing `getPostBySlug`/`getProjectBySlug`,
the same `cache()`-wrapped functions `generateMetadata` already calls for that route, and the
same `params`/`decodeURIComponent(slug)` shape as the page component). **Satori (what
`ImageResponse` renders through) ships with zero Korean glyphs** in its default font — any
Korean text in one of these silently renders blank unless a font covering those glyphs is
passed via the `fonts` option. `lib/ogFont.ts` loads `public/fonts/Pretendard-Bold.otf` from
disk for this (not fetched from a CDN per-request — no network dependency, and Satori only
understands ttf/otf/woff, not woff2, which needs Brotli decompression Satori doesn't
implement, so the CDN's default woff2 distribution wouldn't have worked anyway).
**That disk read is invisible to Next's file tracer, and `public/` is not bundled into
serverless functions** — so every per-slug OG route 500'd in production for two weeks with
`ENOENT: /var/task/public/fonts/Pretendard-Bold.otf` while nothing looked wrong locally or in
the build. The root `/opengraph-image` masked it: it has no dynamic params, so it's
pre-rendered at build time on a machine where `public/` really does exist, and only the
`[slug]` routes actually run in a Lambda. `next.config.ts`'s `outputFileTracingIncludes` names
the font explicitly for those two routes — there is no way for the tracer to infer a
`readFile(path.join(process.cwd(), ...))`, so any future runtime read of a `public/` asset
needs the same treatment. `loadOgFont()` also returns `null` instead of throwing now: a blank
Korean title is bad, but a 500 here is worse, because link scrapers fall back to the page's
first `<img>` — on a post detail page that's the author's own profile photo.

**Setting a route's own `openGraph` object silently drops every field the parent set** — the
default OG image included, but also `type`/`siteName`/`locale`. Next merges metadata
parent→child per top-level key, not deep-per-field — a child route that sets
`openGraph: { title, description }` (needed so shared links show that route's own title
instead of the root layout's, since `title` and `openGraph.title` are tracked separately and
don't sync) **replaces** the entire inherited `openGraph` object, including the `images` entry
that `app/opengraph-image.tsx` would otherwise contribute automatically via Next's file-
convention inheritance (walks up the route tree to the nearest `opengraph-image` file for any
segment that doesn't define its own). Confirmed by `curl`-ing rendered HTML before/after: the
`<meta property="og:image">` tag disappeared entirely on `/about`, `/posts`, `/projects`,
`/series`, `/series/[slug]` — every route that overrides `openGraph` but has no
`opengraph-image.tsx` of its own — the moment `openGraph.title`/`description` were added,
until `images: ["/opengraph-image"]` was added back explicitly alongside them. Routes with
their own per-segment `opengraph-image.tsx` (`/posts/[slug]`, `/projects/[slug]`) are
unaffected since the image and the metadata override live at the same segment. Any new route
that both overrides `openGraph` and relies on the inherited default image needs this same
explicit `images: ["/opengraph-image"]` restated, or it'll silently lose its preview image.

**This is why `lib/siteMeta.ts` exists.** The same replacement rule that ate `images` had also
been quietly eating `type`/`siteName`/`locale` site-wide — confirmed by curling the live HTML,
not one page emitted those three. Rather than restating literals in seven routes, they live in
`SITE_OG_BASE` and get spread into each route's own `openGraph`. `SITE_OG_BASE` deliberately
omits `type` (post detail needs `"article"`, and a baked-in `"website"` makes TypeScript widen
the union awkwardly) and `images` (a segment with its own `opengraph-image.tsx` would have its
per-slug image overridden by the generic one). `canonicalPath()` is there too, because a
canonical URL built from a Korean slug needs the same `encodeURIComponent` treatment as
`app/sitemap.ts` and `permanentRedirect`'s `Location` header. **Canonical is set per route and
deliberately NOT in the root layout** — inheritance is per top-level key, so a root
`canonical: "/"` would be claimed by every child route that doesn't override it, which is worse
than having none. Structured data goes through `components/JsonLd.tsx`, which escapes `<` as
`\u003c`: `JSON.stringify` alone won't, and post summaries are raw excerpts of migrated forum
content that really does contain HTML fragments. The site-wide `WebSite`+`Person` `@graph` in
`app/layout.tsx` gives `Person` a stable `@id` (`PERSON_ID`) so per-post `BlogPosting` nodes
reference it instead of re-inlining the author on every page.

**Tech-name tags with icons** (`/about`'s skills + career tags) go through
`components/SkillTag.tsx`, which looks up an icon from `lib/skillIcons.ts#SKILL_ICON_SLUGS`
(name → Simple Icons `cdn.simpleicons.org` slug) and falls back to a plain text tag if the
name isn't in the map. To add icon support for a new technology, add an entry to
`SKILL_ICON_SLUGS` once — every list that renders that name via `<SkillTag>` picks it up
automatically, no per-page changes needed. **Simple Icons slugs aren't permanent** — Simple
Icons dropped every Amazon/AWS icon at some point (likely trademark enforcement; confirmed by
checking their full ~3450-icon dataset for anything AWS/Amazon-related — nothing), which is why
there's no `aws` entry despite `"AWS S3"`/`"AWS EC2"` tags existing in real data (they render
text-only, same as any unlisted name — this is intentional, don't re-add a slug without
`curl`-ing it first) — and separately renamed `css3` → `css` (old slug 404s). If an icon stops
showing, check the slug still resolves before assuming the code broke: `curl -s -o /dev/null -w
"%{http_code}" https://cdn.simpleicons.org/<slug>`. `SkillTag` also has an `onError` handler
that hides a failed `<img>` rather than leaving a broken-image gap, as a safety net for the
next slug that goes stale.

**Some Simple Icons brand colors are near-black by default, which vanishes on
`.tag-outline`'s transparent background in dark mode.** `.tag-outline` (what every `SkillTag`
renders as) has no fill — the page background shows through — so an icon whose brand hex is
`#000000`-ish (GitHub, Notion, Next.js, Vercel, Expo, Express, Socket.io, OpenJDK — checked
each one's actual hex against simple-icons' data) reads fine against light mode's `--color-bg`
but is nearly invisible against dark mode's near-black `--color-bg`. `lib/skillIcons.ts`'s
`MONOCHROME_ICON_SLUGS` set lists exactly these slugs; `SkillTag` requests them from Simple
Icons with an explicit color override (`cdn.simpleicons.org/<slug>/<hex>`) matching the current
theme's `--color-text` instead of their default brand color, while every other (already
sufficiently-contrasty) slug keeps its real brand color. This is why `SkillTag` is a Client
Component reading `components/useTheme.ts` — but naively branching the `<img src>` on
`useTheme()`'s value directly would hydration-mismatch: the server has no `localStorage` to
read and always renders as if light, while the client's very first render already sees the
correct (possibly dark) theme via `layout.tsx`'s pre-hydration inline script. `SkillTag` works
around this the same way `ScrollReveal` avoids a similar mismatch — defers the theme-based
recolor to a post-mount `useEffect`-set `mounted` flag, so the first client render matches the
server's plain-default-color output exactly, then swaps a frame later.

**`/posts` (list) filters/paginates client-side, not via `?tag=`/`?page=` server round-trips.**
`components/PostsListClient.tsx` fetches every published post once via TanStack Query
(`useQuery(["posts"], ...)` hitting `app/api/posts/route.ts`) and does tag filtering +
pagination in local state — measured this as meaningfully snappier than the original
server-paginated version (every click was a fresh Mongo round trip: ~140-250ms even in a
production build, worse in dev). `lib/posts.ts#listPosts`/`getAllTags`/`countPublishedPosts`
(server-paginated versions) are kept around unused for when post volume outgrows shipping the
full list to the client — see CHANGELOG 0.5.0 for the reasoning, don't delete them as dead code.

**Data flow for `/posts`**: `lib/posts.ts#getCachedPosts` (an `unstable_cache`-wrapped
`listAllPosts`, `revalidate: 300`) is the single source both `app/posts/page.tsx` (server-side
`prefetchQuery` + `dehydrate`/`HydrationBoundary`, so first paint has data with no loading
spinner) and `app/api/posts/route.ts` (what the client's `useQuery` actually fetches) read
from — so a client-triggered refetch never bypasses the cache and hits Mongo directly.
`app/posts/page.tsx` no longer reads `searchParams` (that forced the whole route into dynamic
SSR); it's `export const revalidate = 300` (ISR) instead. TanStack Query's `QueryClientProvider`
lives in `components/QueryProvider.tsx`, mounted once in `app/layout.tsx` so any page can use
`useQuery`.

**`/posts`' client-side pagination needs a crawlable counterpart, and that's what
`app/posts/page/[n]/page.tsx` is.** Because `PostsListClient` renders one 5-item slice and the
page-number controls were plain `<button>`s, the raw HTML of `/posts` only ever contained five
post links — and a JS-executing Googlebot renders a page but does not *click* buttons, so it
never reached page 2 either. Measured against the real site: of 19 published posts, only 14 were
linked from anywhere on the site at all (mostly via `/series/[slug]` and `/about`'s "최근 글"),
and 5 were pure orphans discoverable only through the sitemap — exactly what Search Console
reports as "Discovered – currently not indexed" (22 URLs, see CHANGELOG 0.7.75). The fix has two
halves that must stay together: (1) the page-number controls in `PostsListClient` are now real
`<a href={postsPageHref(n)}>` anchors whose `onClick` calls `preventDefault()` and paginates in
local state exactly as before (so nothing changes for a visitor with JS — except a
modifier/middle click, which is deliberately left alone so open-in-new-tab still works), and
(2) `/posts/page/[n]` server-renders that slice so those five links actually exist in HTML.
That route stays **static** (`revalidate = 300` + `generateStaticParams()` for pages 2..N) by
taking the page number as a **path segment, not a searchParam** — reading `?page=` on `/posts`
would force the whole route dynamic, the exact thing CHANGELOG 0.5.0 removed. Page 1 lives at
`/posts` and `/posts/page/1` `permanentRedirect`s there; out-of-range and non-numeric `n`
`notFound()`. Its canonical is **self**, not `/posts` — these pages hold different posts, so
canonicalising them to page 1 would declare them duplicates and undo the whole point.
`POSTS_PAGE_SIZE`/`postsPageHref()` live in `lib/postsPagination.ts` rather than `lib/posts.ts`
because that module is `"server-only"` and the client component has to import them too.

The current tag/page is still mirrored into `?tag=`/`?page=`, but via a raw
`window.history.replaceState()` call (see `syncUrl` in `PostsListClient.tsx`), never
`next/navigation`'s router — going through the router would re-trigger a fetch this whole
approach exists to avoid. This mirroring matters for more than deep-linking: without it,
clicking into `/posts/[slug]` and hitting the browser back button remounts `PostsListClient`
with fresh `useState` and always lands back on page 1 (see CHANGELOG 0.5.3). The fix is a
mount-time `useEffect` that reads `window.location.search` and restores state from whatever the
address bar actually says — which is correct after a back-navigation because `replaceState`
already wrote the right query string before the user ever left. Keep this restore logic in a
`useEffect` (not a lazy `useState` initializer or render-time check) so SSR and first client
render still agree and don't hydration-mismatch. Since `PostsListClient` no longer receives
`initialTag`/`initialPage` props from the server (there's no `searchParams` to derive them
from), `activeTag`/`page` always start at `null`/`1` and rely entirely on that mount effect —
a direct deep link like `/posts?tag=React` shows "전체" for one render before the effect
corrects it, not perceptible in practice.

**`/posts/[slug]` and `/projects/[slug]` are both ISR** (`export const revalidate = 300` +
`generateStaticParams()`, via `lib/posts.ts#listPostSlugs()` / `lib/projects.ts#listProjectSlugs()`)
— they used to be fully dynamic (fresh Mongo query + markdown/Shiki recompile on every single
visit), which was the dominant cause of slow list→detail navigation (diagnosed and fixed in
CHANGELOG 0.7.29). `/posts/[slug]` couldn't be ISR before because it called `auth()` (cookies)
just to decide whether to show the owner-only "수정"/"삭제" buttons — moved into
`components/PostOwnerActions.tsx` (client, `useSession()`), the same `FooterAuthLink.tsx`/
`WritePostLink.tsx` workaround used elsewhere for this exact static-vs-dynamic tradeoff.
`lib/posts.ts#getPostBySlug` and `lib/projects.ts#getProjectBySlug` are also wrapped in React's
`cache()` so `generateMetadata()` and the page body (which both call these with the same slug
during the same request) share one Mongo round-trip instead of two — plain async functions
are NOT deduped by Next.js automatically, only `cache()`-wrapped ones are, within a single
request/render pass. Any new detail-page-shaped route that needs both `generateMetadata` and a
page body should follow this same `cache()` pattern from the start.

**`/series/[slug]` follows the exact same ISR + `cache()` pattern** (`lib/series.ts#listSeriesSlugs()`
for `generateStaticParams()`, `getSeriesWithPosts` wrapped in `cache()`) — it was left fully
dynamic with no `loading.tsx` for longer than the other two detail routes, which was the actual
cause of a reported "list→series navigation feels slow" complaint: no ISR meant a fresh
`SeriesModel.findOne` + `PostModel.find` + a per-post `estimateReadTime()` recompute on every
single visit, and no `loading.tsx` meant zero visual feedback while that happened (same root
cause CHANGELOG 0.7.29 diagnosed for `/posts/[slug]`/`/projects/[slug]`, just not yet applied
here). `listSeriesSlugs()` mirrors `listSeriesWithCounts()`'s published-post-count filter so a
series with zero published posts is never pre-rendered (it would 404 via `getSeriesWithPosts`
anyway). `app/series/[slug]/loading.tsx` follows the same skeleton convention as
`app/posts/[slug]/loading.tsx`/`app/projects/[slug]/loading.tsx` (the shared `.skeleton` class
in `app/globals.css`), shaped to match this page's actual list-of-posts layout.

## What exists vs. doesn't

Implemented: `/posts/[slug]`, `/posts` (list), `/posts/page/[n]` (crawlable pagination),
`/series`, `/series/[slug]`, `/about`,
`/projects`, `/projects/[slug]`, `/api/search`, `/detail/[id]` (old forum URL → 308 redirect),
Header (nav + Cmd+K search + theme toggle), Footer, PostCard, ProjectCard, TOC (desktop
scrollspy + mobile accordion), reading progress bar, share button, code-block copy buttons,
giscus comments, `scripts/migrate-from-forum.ts` (real forum post data migration, already run
once).

`/about` is real code, mostly real content now (`CAREER` edited by the user; "최근 프로젝트"/
"최근 글" pull live from MongoDB via `listProjects()`/`getCachedPosts()`) — `PROFILE`
(`lib/profile.ts`, shared with `components/PostAuthorCard.tsx` — see below) and `SKILLS` (local
to `app/about/page.tsx`) are **no longer placeholders** — `SKILLS` holds real data (CHANGELOG
0.7.9), regrouped in 0.7.82 by proficiency (`{ level, note?, items }`, 주력/실무에서 사용/경험
있음/도구) instead of Frontend/Backend/DevOps. Treat both as factual about the site owner.
0.7.82 also reworked the hero for a job-hunting audience: `PROFILE.intro` is deliberately
number-free (identity + the verification habit) while the NEW `PROFILE.highlights` (three
scannable `label — detail` lines; the page splits on the spaced em dash, keep it intact) carries
the figures, and `PROFILE.lookingFor` renders as a status pill only while non-empty — clear that
one string when the job hunt ends. Contact values live in `lib/profile.ts#CONTACT`
(github/email), consumed by the /about contact card, `components/Footer.tsx`, and the JSON-LD
`Person` in `app/layout.tsx` (which since 0.7.82 also declares email/sameAs/knowsAbout/worksFor)
— the old page-local `CONTACT_GITHUB_URL`/`CONTACT_EMAIL` constants are gone. `PROFILE.shortIntro`
feeds four consumers (/about metadata + og description, author card, JSON-LD Person.description);
keep it short and don't churn it.

**Post detail's bottom section order is body → author card → comments → related posts**
(`app/posts/[slug]/page.tsx`) — `components/PostAuthorCard.tsx` renders `lib/profile.ts`'s
`PROFILE.avatar`/`handle`/`shortIntro` (a one-line variant distinct from `intro`, which is
`/about`'s longer hero paragraph and too long for this compact card), photo and name both
linking to `/about`. `lib/profile.ts` exists so editing the profile once updates both `/about`
and every post detail page — don't duplicate `PROFILE` back into `about/page.tsx`.

`models/Project.ts`/`lib/projects.ts` follow the same shape as Post/Series (`status`
draft/published, `publishedAt` for sort order, `overviewMd` rendered through the same
`compileMarkdown()` used for post bodies — no separate markdown parser). `coverImage` values are
root-relative paths into `/public/projects/...` (not external URLs — an earlier session assumed
otherwise and deferred `next/image` adoption over it; corrected in CHANGELOG 0.7.31 once actually
checked against `scripts/seed-projects.ts`), so `components/ProjectCard.tsx` and
`app/projects/[slug]/page.tsx` render them with `next/image` — no `next.config.ts` `remotePatterns`
needed since nothing here is actually remote. Only the first list card and the detail page's
cover image get `priority` (both are that page's actual LCP element); everything else defaults
to lazy. `coverImageFit`
`appStoreUrl` are all optional and independently rendered as sidebar buttons on
`app/projects/[slug]/page.tsx` only when present. Seeded via `scripts/seed-projects.ts`
(`npm run seed:projects`) — the `projects` array in that file is the **single source of
truth** for the `Project` collection: the script upserts each array entry by `slug`, then runs
`ProjectModel.deleteMany({ slug: { $nin: currentSlugs } })` so anything removed from the array
gets removed from the DB too. This delete is scoped to slugs derived from the array (not a
blanket `deleteMany({})` like `scripts/seed.ts` uses for Post/Series) — the DB already holds
real posts migrated from forum, so a destructive reseed script would wipe them; Project has no
such cross-contamination risk since it's a separate collection edited only through this one
script. The real projects currently seeded (and `SKILLS` in `app/about/page.tsx`) were migrated
from the user's previous portfolio at
`/Users/chorock/desktop/coding/portfolio/portfolio-website` (React+Vite) — that repo is the
source of truth for project descriptions/tech stack wording if it ever needs re-syncing, not
something to treat as placeholder.

**Auth is GitHub OAuth via Auth.js v5 (`next-auth@beta`), gating a single hardcoded owner —
not a multi-user system.** `auth.ts` (project root) is the single config/entry point
(`{ handlers, auth, signIn, signOut }`), JWT session strategy (no DB adapter, no User/Session
collection in Mongo — nothing to store since there's only ever one valid identity). The
`signIn` callback rejects every GitHub account except `profile.login ===
process.env.AUTH_OWNER_GITHUB_LOGIN`, so **a session existing at all already means "this is the
owner"** — code that gates a feature just needs `if (!(await auth())) ...`, never a role/permission
check. `middleware.ts` protects `/posts/write` and `/posts/:slug/edit` via the `authorized`
callback in `auth.ts` (returns `!!auth`), redirecting signed-out requests to the Auth.js sign-in
page. `app/posts/[slug]/page.tsx` conditionally renders "수정"/"삭제" buttons based on the same
`auth()` check — "수정" links to `/posts/[slug]/edit` (`app/posts/[slug]/edit/page.tsx`, a Server
Component that 404s via `notFound()` if `getPostForEditing(slug)` finds nothing, otherwise
renders `<WritePostForm mode="edit" .../>` — the same form component `/posts/write` uses);
"삭제" is wired to `components/DeletePostButton.tsx` (client), which calls
`app/posts/[slug]/actions.ts#deletePost` after a `window.confirm()` prompt. That action re-checks
`auth()` itself (never trust the button having been gated correctly client-side) and, like
`saveDraft`/`publishPost` in `app/posts/write/actions.ts`, calls `revalidateTag("posts")` +
`revalidatePath("/posts")` after the delete — otherwise the deleted post keeps showing on
`/posts` until the `unstable_cache` 300s window lapses (see CHANGELOG 0.7.26/0.7.27).

The login/logout control lives in `components/Footer.tsx` (small text link, not prominent by
design) but is implemented as a **client** component (`components/FooterAuthLink.tsx` using
`next-auth/react`'s `useSession`/`signIn`/`signOut`), not a server-side `auth()` call in
`Footer` itself. This matters: `Footer` renders in the root layout on every page, so a
server-side `auth()` call there (which reads cookies) would force the *entire app* into dynamic
rendering — undoing the static/ISR setup on `/posts`, `/projects`, `/about`, `/series` (hit this
as a real regression while building this feature; caught it by noticing every route in the
build output flip from `○` back to `ƒ`). `useSession()` instead fetches `/api/auth/session`
client-side after mount, so it can't affect a route's server-rendering mode. This is why
`components/AuthSessionProvider.tsx` (wraps `next-auth/react`'s `SessionProvider`) exists as its
own client boundary in `app/layout.tsx`, alongside (but separate from) `QueryProvider`.
`app/posts/[slug]/page.tsx`'s `isOwner` check is fine as a server-side `auth()` call, though —
that route was already fully dynamic (`ƒ`, per-slug DB fetch, no static generation) before auth
existed, so there's no static mode to lose there.

Setup (not automatable, the user does this): register a GitHub OAuth App per environment
(callback URL is fixed per app, so dev `http://localhost:3000/api/auth/callback/github` and
prod `https://chorock.page/api/auth/callback/github` need separate apps), generate `AUTH_SECRET`
with `openssl rand -base64 33` (**not** `npx auth secret` — that resolves to an unrelated npm
package also named `auth` and prints a bogus `BETTER_AUTH_SECRET`, confirmed by actually running
it), fill `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`/`AUTH_OWNER_GITHUB_LOGIN` in `.env.local` (see
that file's comments).

**`/posts/write` (new-post editor) reuses the real markdown pipeline for its live preview
instead of a client-side toy parser.** `lib/markdown.ts#compileMarkdown` is `"server-only"`, so
`components/WritePostForm.tsx` (client) can't call it directly — it calls the
`app/posts/write/actions.ts#previewMarkdown` Server Action instead (debounced ~400ms on body
changes), which runs `compileMarkdown` server-side and **returns the resulting JSX directly**
(React/Next.js supports Server Actions returning React elements, including ones built from
Client Components like `CodeBlock` — confirmed working end-to-end, not just theoretical). This
guarantees the editor's preview pane always matches what the published post will actually
render (same code path, same `CodeBlock`/`MDXImage`/`MDXBlockquote` component mapping), instead
of maintaining a second parser that could drift. The same action also returns
`estimateReadTime()`'s result so the "예상 읽는 시간" hint uses the real CJK-aware estimator, not
a naive word-count.

Saving works as create-or-update-by-slug, not two separate flows: `saveDraft`/`publishPost` in
`actions.ts` take an optional `slug` — `null` means "create new" (slug generated via
`lib/slug.ts#slugify(title)`, with a `-2`/`-3`... suffix appended on collision so the owner never
hits a raw duplicate-key error), a present `slug` means "update that document in place". After
the first save, the client rewrites the URL to `/posts/write?slug=<slug>` via
`history.replaceState` (same pattern as `PostsListClient`'s `syncUrl`) so refreshing the page
resumes the same draft — `getPostForEditing()` in `lib/posts.ts` is the no-status-filter
counterpart to `getPostBySlug()` that makes this possible (drafts aren't visible through the
normal published-only lookups). `publishedAt` only gets stamped at the actual draft→published
transition (checked via `existing.status !== "published"`, not via `publishedAt` presence — the
schema requires `publishedAt` to always have *some* value, so it can't double as a "never
published" signal the way a nullable field could).

**`components/DraftsPopup.tsx` is the "my drafts" list** (a "임시글 목록" button + modal on
`/posts/write`, write mode only) — before this, resuming a draft only worked if you still had/
remembered its `?slug=` URL, since there was no other way back into one. It calls
`app/posts/write/actions.ts#listDrafts()` (`status: "draft"`, sorted by mongoose's own
`updatedAt` — `models/Post.ts` has `{ timestamps: true }`, so this is free and always accurate,
no separate "last edited" bookkeeping needed) and filters out whichever draft is currently open
(`currentSlug` prop, `WritePostForm`'s own `slug` state) since resuming the draft you're already
on is meaningless. Reuses the exact `.dialog-backdrop`/`.dialog`/`backdropIn`/`modalPop`
conventions `Header.tsx`'s search modal already established (including the same
Escape-to-close/backdrop-click-to-close behavior), so this didn't need any new CSS. Picking a
draft is a real `<a href="/posts/write?slug=...">` navigation, not a client-side route change —
`/posts/write` has no `[slug]` dynamic segment (the slug lives in a searchParam, read by
`app/posts/write/page.tsx` and passed down as the `initial` prop), and `WritePostForm`'s
title/body state is seeded from `initial` via a `useState` initializer, which only runs on a
component's first mount. A searchParams-only client-side navigation would very likely just
re-render the same `WritePostForm` instance with a new `initial` prop instead of remounting it,
leaving the form showing whatever was being edited before instead of the picked draft — a real
navigation sidesteps this entirely by forcing everything to load fresh from scratch.

**`beforeunload` does NOT fire on browser back within the app** — it only fires when the
document actually unloads (refresh, tab close, address-bar navigation, a real `<a href>`).
App Router back/forward is a client-side navigation with no unload, so an unsaved-changes guard
built on `beforeunload` alone silently misses the single most common way to lose work (this was
the actual reported loss: "실수로 뒤로가기 눌러서 날려먹은 데이터가 한 두개가 아냐").
`components/WritePostForm.tsx` covers all three exits separately: `beforeunload` for real
unloads (this also catches `DraftsPopup`'s draft picker, which is a full `<a href>` navigation
by design), a **history sentinel** for back/forward, and an `onClick` guard on the "← 나가기"
`next/link` (a client navigation, so neither of the other two sees it). The sentinel: push one
dummy `history.pushState(null, "", location.href)` entry the moment the form first becomes
dirty, then intercept `popstate` when back consumes it — leave → sets a `leavingRef`
and calls `history.back()` (the resulting second `popstate` is ignored via that flag, which is
what stops the recursion), stay → re-pushes the dummy so the user stays put. **The non-obvious part
is the not-dirty branch**: once the form is saved there's nothing to guard, but the dummy entry
is still sitting in history, so a plain early-return would eat the user's first back press and
require a second one. It has to `back()` again to pass the navigation through. The dirty
baseline is a snapshot of title/summary/body/tags/series taken at the last *successful* save,
and it's set to **the value that was sent, not the current value** — text typed while the save
round-trip was in flight must stay marked unsaved.

**The prompt is `components/LeaveConfirmDialog.tsx`, not `window.confirm` — and that swap is
why the guard stopped "freezing" the page.** A native `confirm()` blocks the main thread for as
long as it is open: the page cannot paint or respond, and everything queued behind it flushes at
once on dismissal (on `/posts/write` the heaviest item is the ~400ms-debounced `previewMarkdown`
Server Action plus a re-render of the Shiki-highlighted preview, so the stall scales with body
length). This was reported as "취소를 누르면 화면이 잠깐 멈췄다 정상화된다" and was measured, not
guessed: a production-built throwaway route carrying the identical guard logic showed the whole
`popstate` → prompt → stay → re-push path completing in ~5ms with **zero** remounts, zero
`loading.tsx` fallbacks, zero RSC/network requests and zero long tasks — even when the main thread
was deliberately blocked for 2s to imitate the dialog, nothing extra happened after it returned.
So the guard never risked losing the draft; the freeze was purely the dialog. Two things that
must not regress: (1) **the URL to restore comes from `restoreUrlRef`, captured at the moment the
modal opens, not from `pageUrlRef`** — `pageUrlRef` is refreshed on every commit and opening the
modal *is* a commit, so it would be overwritten with the already-reverted URL and silently undo
the 0.7.95 fix (`popstate` runs after the browser has already reverted the address, so
`location.href` is the wrong answer there too — restoring it drops the `?slug=` a draft save had
added, and a refresh then opens a blank new post). (2) The dialog's default focus is the *safe*
button ("계속 작성"), and Escape/backdrop click both mean stay — a stray Enter must never discard
the draft.

**The write screen is a tool, not an article — don't cap it at the reading width.** `<main>` in
`WritePostForm` used `maxWidth: 960` (the same measure the post body uses), which left each half
of the editor/preview split at ~440px. It's `1320` now (1680 was tried first and read as too wide). The split itself is `.wp-split`
(`app/globals.css`), not an inline style, because it needs a media query: below 900px it stacks
to one column — `1fr 1fr` used to apply unconditionally, so a phone got two ~160px columns.
`min-width: 0` lives on `.wp-split > *` so both halves are covered (see the grid/flex + code-block
rule above for why it's mandatory).

**A `catch {}` on a clipboard write is not just missing feedback — with optional chaining it
reports success.** `components/CodeBlock.tsx`/`components/ShareButton.tsx` both had
`await navigator.clipboard?.writeText(text)` inside a `try` with an empty `catch`. Where
`navigator.clipboard` is undefined (non-secure context, older browsers) the optional chain
short-circuits to `undefined` instead of throwing, so the `await` resolves, the `catch` never
runs, and the button cheerfully renders "링크 복사됨" having copied nothing. Both now throw
explicitly on a missing `clipboard` and surface a "복사 실패" state. Treat `?.` on a
side-effecting async API as a correctness bug, not a convenience.

**Any route behind `middleware.ts`'s auth gate needs its own `loading.tsx`** — `/posts/write`
and `/posts/[slug]/edit` are `ƒ` (dynamic, cookie-reading) and had none, so clicking
"새 글 작성"/"수정" left the screen completely unchanged until the new page painted. The three
`[slug]` detail routes already had skeletons; these two were the gap. Same `.skeleton`
convention (`app/globals.css`), shaped to the editor's own layout.

**`app/globals.css`'s `.spinner` is the shared "this is actually running" indicator.**
`.btn:disabled`'s `opacity: 0.45` alone can't distinguish "locked" from "working". It
deliberately keeps animating under `prefers-reduced-motion: reduce` (slowed to 1.8s rather than
`animation: none`) — unlike every other motion override in this file, the rotation *is* the
information, so removing it removes the feedback. When a component has two async buttons, track
*which* one is running (`WritePostForm`'s `savingKind`), not just a shared boolean — otherwise
both dim identically and the user still can't tell what they pressed. On a success path that
navigates away, do **not** re-enable the button in a `finally` (`handlePublish` used to): the
button stays live during `router.push` and can be pressed again, double-publishing.

**Server Actions must `return { error }`, never `throw`, for any message meant to reach the
user.** Next.js redacts every thrown Server Action error into a generic "An error occurred in
the Server Components render..." message in production, *regardless of whether the throw was a
genuine bug or a deliberate, safe validation message* — hit this for real: a plain
`throw new Error("요약을 입력해주세요.")` for an empty summary field showed up to the user as
that scary generic crash text instead, confirmed by reading the actual Vercel function log
(`Error: 요약을 입력해주세요.` was right there — the message was never wrong, just discarded
before reaching the client). `app/posts/write/actions.ts`'s `ActionResult<T> = T | { error:
string }` return-value pattern (used by `saveDraft`/`publishPost`/`uploadImage`, and mirrored in
`app/posts/[slug]/actions.ts#deletePost`) is the actual fix Next.js supports — returning a plain
object isn't "error handling" from Next's perspective at all, just a normal serializable return
value, so it always reaches the client verbatim. Reserve `throw` for genuinely unexpected
failures (DB down, etc.) where the generic masked message is the correct, safe behavior — every
caller (`WritePostForm.tsx`, `DeletePostButton.tsx`) checks `"error" in result` first and only
falls through to its `catch` block for the truly-unexpected case. Any new Server Action with a
user-facing validation message needs this same pattern from the start, not a `throw`.

**`app/posts/[slug]/edit/page.tsx` reuses `WritePostForm` via a `mode: "write" | "edit"` prop**
rather than being a separate form. The two modes differ only where reusing `/posts/write`'s
draft-vs-publish framing would be actively wrong for editing an already-published post: edit mode
is only ever reached from a published post's "수정" button (drafts have no public detail page to
put that button on — they're resumed through `/posts/write?slug=` instead), so there's no
"draft" state to offer. Edit mode hides the "임시 저장" button entirely and relabels "발행하기" to
"저장", which still calls the same `publishPost` action — safe to reuse as-is because
`upsertPost()` in `actions.ts` only stamps `publishedAt` on an actual draft→published transition,
so re-saving an already-published post through `publishPost` just updates the fields and leaves
its status/`publishedAt` alone. (`saveDraft` is deliberately *not* reachable from edit mode: since
`upsertPost` always sets `existing.status` to whatever the caller passes, calling it with
`status: "draft"` on a live post would silently unpublish it — the missing "임시 저장" button
in edit mode isn't an oversight, it's what prevents that footgun.) Unlike `/posts/write`, edit
mode never rewrites the URL after saving — the slug is fixed (editing never regenerates it) and
the URL already matches, so there's nothing for a `syncSlugToUrl`-style call to fix up.

**The "새 글 작성" button on `/posts` is gated by `components/WritePostLink.tsx`, a client
component using `useSession()`** — not a server-side `auth()` check in `app/posts/page.tsx`,
for the identical reason `FooterAuthLink` is a client component (see above): `/posts/page.tsx`
is ISR (`export const revalidate = 300`), and a server-side `auth()` call there would read
cookies and force the whole page dynamic, undoing that. The route itself doesn't need the
gating to be secure — `middleware.ts` already blocks unauthenticated `/posts/write` — this is
purely so a non-owner visitor doesn't see a write button that would just redirect them to sign-in.

There is no standalone home page, but `/` is not a 404 either — `app/page.tsx` is a bare
`permanentRedirect("/about")`, i.e. a **308**. It used to be `redirect()` (307), and `/` used to
be listed in `app/sitemap.ts`; together those put `/` in Search Console's "Page with redirect"
bucket, since a *temporary* redirect tells Google the destination might change back, so it keeps
the redirecting URL queued as its own contentless URL. Both were changed in 0.7.75 — don't
re-add `/` to the sitemap. Because `/` never returns content, the JSON-LD breadcrumbs on
post/project detail pages deliberately start at `/posts`/`/projects` rather than the site root.
`/posts/[slug]/edit` and delete (the "삭제" button) are both implemented (see above).
