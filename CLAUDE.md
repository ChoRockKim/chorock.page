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
    mapping still works the same way.
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
browser encodes non-ASCII in hrefs itself.

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

**Comments are giscus, not a custom backend.** `components/GiscusComments.tsx` embeds the
giscus script client-side against `NEXT_PUBLIC_GISCUS_*` env vars; if they're unset it
renders a setup hint instead of erroring. There is no comment data in MongoDB.

**Header search** (`app/api/search/route.ts` + `lib/posts.ts#searchPosts`) does a regex
match against title/summary/tags server-side — it is not a full-text/Atlas Search index.

**Tech-name tags with icons** (`/about`'s skills + career tags) go through
`components/SkillTag.tsx`, which looks up an icon from `lib/skillIcons.ts#SKILL_ICON_SLUGS`
(name → Simple Icons `cdn.simpleicons.org` slug) and falls back to a plain text tag if the
name isn't in the map. To add icon support for a new technology, add an entry to
`SKILL_ICON_SLUGS` once — every list that renders that name via `<SkillTag>` picks it up
automatically, no per-page changes needed.

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

## What exists vs. doesn't

Implemented: `/posts/[slug]`, `/posts` (list), `/series`, `/series/[slug]`, `/about`,
`/projects`, `/projects/[slug]`, `/api/search`, `/detail/[id]` (old forum URL → 308 redirect),
Header (nav + Cmd+K search + theme toggle), Footer, PostCard, ProjectCard, TOC (desktop
scrollspy + mobile accordion), reading progress bar, share button, code-block copy buttons,
giscus comments, `scripts/migrate-from-forum.ts` (real forum post data migration, already run
once).

`/about` is real code, mostly real content now (`CAREER`, `CONTACT_GITHUB_URL` edited by the
user; "최근 프로젝트"/"최근 글" pull live from MongoDB via `listProjects()`/`listAllPosts()`) —
but `PROFILE`/`SKILLS` at the top of `app/about/page.tsx` are still `// TODO` placeholder
stand-ins, not the user's real bio/skills. Don't treat their content as factual about the site
owner.

`models/Project.ts`/`lib/projects.ts` follow the same shape as Post/Series (`status`
draft/published, `publishedAt` for sort order, `overviewMd` rendered through the same
`compileMarkdown()` used for post bodies — no separate markdown parser). `coverImageFit`
(`"cover"` default or `"contain"`) lets a project's thumbnail/hero opt out of cropping — needed
for e.g. an app icon-style image with baked-in padding. `demoUrl`/`repoUrl`/`playStoreUrl`/
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
`auth()` check — "수정" links to `/posts/[slug]/edit`, which doesn't exist yet (separate task);
"삭제" has no action wired up at all yet.

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

Not implemented (Header/PostsPage link to these routes but they 404): home, `/posts/[slug]/edit`
(the "수정" button on a post links here). Delete ("삭제" button) has no action wired up at all.
Don't assume these are functional when tracing a user flow.
