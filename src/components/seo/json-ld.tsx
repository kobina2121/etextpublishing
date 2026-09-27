/**
 * Renders a structured-data block.
 *
 * `JSON.stringify` is the whole defence here: it escapes the payload, and the
 * one sequence that could still break out of a script element — a literal
 * `</script>` inside a string — is neutralised by escaping `<`. Never
 * interpolate raw content into this tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Structured data has to be inline; there is no non-dangerous API for it.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
