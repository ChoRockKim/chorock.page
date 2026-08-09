# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Next.js + MongoDB Atlas rewrite of a personal blog (chorock.page) previously run as
Express(SSR) + MongoDB Atlas + Docker + GitHub Actions + EC2. Only the post detail
page (`/posts/[slug]`) and the shared chrome it needs (header/footer/search/TOC/comments)
are implemented — see "What exists" below before assuming a page/route is present.

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
in `app/globals.css`, ported from a Claude Design system ("Broadsheet") but trimmed to only
what chorock.page actually uses — the design system's CMYK print-separation effect and
Source Serif headline treatment were demo-only and are intentionally not ported.

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

**Comments are giscus, not a custom backend.** `components/GiscusComments.tsx` embeds the
giscus script client-side against `NEXT_PUBLIC_GISCUS_*` env vars; if they're unset it
renders a setup hint instead of erroring. There is no comment data in MongoDB.

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
survive a re-render.

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
same card's cover image/title back into place. The list page's own `<ProjectCard>` grid no longer
uses `.stagger-list` (removed only from this usage — `PostsListClient.tsx`'s is untouched, it
doesn't participate in View Transitions so there's nothing for it to conflict with there).

**View Transitions are disabled below 800px** (`app/globals.css`, same `@media (max-width: ...)`
breakpoint `.proj-grid` itself uses to collapse to one column) — the morph reads as janky rather
than delightful at phone width (explicit user call), same `animation: none !important` on the
`::view-transition-*` pseudo-elements as the `prefers-reduced-motion` block right above it, just
gated on viewport width instead of the motion preference. Both rules can apply simultaneously
with no conflict (same declaration, `!important` in both).

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

**Setting a route's own `openGraph` object silently drops the site's default OG image.** Next
merges metadata parent→child per top-level key, not deep-per-field — a child route that sets
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

## What exists vs. doesn't

Implemented: `/posts/[slug]`, `/posts` (list), `/series`, `/series/[slug]`, `/about`,
`/projects`, `/projects/[slug]`, `/api/search`, `/detail/[id]` (old forum URL → 308 redirect),
Header (nav + Cmd+K search + theme toggle), Footer, PostCard, ProjectCard, TOC (desktop
scrollspy + mobile accordion), reading progress bar, share button, code-block copy buttons,
giscus comments, `scripts/migrate-from-forum.ts` (real forum post data migration, already run
once).

`/about` is real code, mostly real content now (`CAREER`, `CONTACT_GITHUB_URL` edited by the
user; "최근 프로젝트"/"최근 글" pull live from MongoDB via `listProjects()`/`getCachedPosts()`) —
but `PROFILE` (now `lib/profile.ts`, shared with `components/PostAuthorCard.tsx` — see below) and
`SKILLS` (still local to `app/about/page.tsx`) are still `// TODO` placeholder stand-ins, not the
user's real bio/skills. Don't treat their content as factual about the site owner.

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
normal published-only lookups). There's no "my drafts" list page — resuming a draft only works
if you still have/remember its `?slug=` URL. `publishedAt` only gets stamped at the actual
draft→published transition (checked via `existing.status !== "published"`, not via
`publishedAt` presence — the schema requires `publishedAt` to always have *some* value, so it
can't double as a "never published" signal the way a nullable field could).

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

Not implemented (Header/PostsPage link to these routes but they 404): home. `/posts/[slug]/edit`
and delete (the "삭제" button) are both implemented (see above). Don't assume `home` is functional
when tracing a user flow.
