/**
 * Shared between components/PostsListClient.tsx (client) and app/posts/page/[n]/page.tsx
 * (server), so the slice the crawlable `/posts/page/[n]` route renders always lines up with
 * the one the client-side pagination shows. Deliberately NOT in lib/posts.ts — that module is
 * "server-only" and importing it from the client component would fail the build.
 */
export const POSTS_PAGE_SIZE = 5;

/**
 * The crawlable URL for a given page of /posts.
 *
 * The page-number controls used to be bare `<button>`s, which meant Googlebot rendering /posts
 * only ever saw page 1's five post links and had no way to reach the rest — five posts ended up
 * with no inbound link anywhere on the site at all, reachable only via the sitemap, which is
 * what "Discovered – currently not indexed" in Search Console was actually reporting. The
 * controls are now real anchors pointing here; the click handler still paginates client-side,
 * so nothing about the interaction changed for a visitor with JS.
 */
export function postsPageHref(page: number): string {
  return page <= 1 ? "/posts" : `/posts/page/${page}`;
}
