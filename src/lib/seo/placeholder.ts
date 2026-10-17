/**
 * Sample content the site was built with says "placeholder" in its text.
 *
 * Such a record is kept out of search — noindex, and left out of the sitemap —
 * so made-up books, ISBNs and biographies are never presented to Google as
 * real. Visitors still see the page. The guard lifts itself the moment the
 * text is replaced with real copy; nothing needs switching off.
 */
const PLACEHOLDER = /\bplaceholder\b/i;

export function isPlaceholderText(...texts: (string | undefined | null)[]): boolean {
  return texts.some((text) => Boolean(text && PLACEHOLDER.test(text)));
}
