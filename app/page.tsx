import { permanentRedirect } from "next/navigation";

// 308, not `redirect()`'s 307. There is no standalone home page — `/` has always sent visitors
// to /about — but a *temporary* redirect tells Google the destination might change back, so it
// keeps `/` in the index as its own (contentless) URL and reports it under "Page with redirect"
// in Search Console. 308 says the move is permanent, which is what it actually is; `/` is also
// no longer listed in app/sitemap.ts for the same reason.
export default function HomePage() {
  permanentRedirect("/about");
}
