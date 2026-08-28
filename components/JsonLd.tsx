/**
 * Renders a schema.org JSON-LD block. Server Component — the object is serialized at render
 * time, so the structured data is present in the initial HTML for crawlers that don't run JS.
 *
 * `<` is escaped so a title or summary containing "</script>" can't break out of the tag.
 * JSON.stringify alone doesn't escape it (it's a valid JSON string character), which is the
 * standard XSS hole in hand-rolled JSON-LD blocks — and post summaries here are raw excerpts
 * of migrated forum content that really does contain HTML fragments.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
