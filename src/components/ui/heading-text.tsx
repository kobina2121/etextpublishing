import { Fragment } from "react";

/**
 * Heading text that keeps deliberate casing.
 *
 * Headings are capitalised word by word in CSS (see globals.css). Two kinds of
 * word opt out and are shown exactly as written:
 *
 * - The brand, "etext", which is always lowercase, as on the logo.
 * - Any word with a capital after a lowercase letter, such as "iPhone". It was
 *   typed that way on purpose, and capitalising it would give "IPhone".
 */
const BRAND = /^etext\b/i;
const MIXED_CASE = /[a-z][A-Z]/;

function keepsCase(word: string): boolean {
  return BRAND.test(word) || MIXED_CASE.test(word);
}

export function HeadingText({ children }: { children: string }) {
  const parts = children.split(/(\s+)/);
  if (!parts.some(keepsCase)) return children;

  return parts.map((part, index) =>
    keepsCase(part) ? (
      <span key={index} className="normal-case">
        {BRAND.test(part) ? part.replace(BRAND, "etext") : part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
