import { notFound, permanentRedirect } from "next/navigation";
import { getPostByLegacyId } from "@/lib/posts";

// Compat route for the old forum blog's post URLs (`/detail/:id`, where :id was a
// MongoDB _id) — resolves to the migrated post's slug and 308-redirects, so old
// bookmarks/search-engine-indexed links keep working after the rewrite.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByLegacyId(id);
  if (!post) notFound();
  // Location headers must be ASCII (ByteString) — Korean slugs need explicit encoding here,
  // unlike <Link href> where the browser encodes non-ASCII automatically.
  permanentRedirect(`/posts/${encodeURIComponent(post.slug)}`);
}
