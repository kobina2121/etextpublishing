import "server-only";

import { connectToDatabase } from "@/lib/db";
import { isPlaceholderText } from "@/lib/seo/placeholder";
import { Author, Journal, Publication } from "@/models";

export type SitemapEntry = { slug: string; updatedAt?: Date };

type Row = SitemapEntry & { text?: string[] };

/** Leaves out sample records — they are noindex too (see lib/seo/placeholder). */
const real = (rows: Row[]): SitemapEntry[] =>
  rows
    .filter((row) => !isPlaceholderText(...(row.text ?? [])))
    .map(({ slug, updatedAt }) => ({ slug, ...(updatedAt ? { updatedAt } : {}) }));

/**
 * Everything published, with when it last changed — Google uses that date to
 * decide what to recrawl. Drafts are filtered out here: a sitemap entry is an
 * explicit invitation to crawl.
 */
export async function getSitemapEntries(): Promise<{
  publications: SitemapEntry[];
  authors: SitemapEntry[];
  /** Journal entries, shown on the site as articles. */
  articles: SitemapEntry[];
}> {
  await connectToDatabase();
  const fields = { slug: 1, updatedAt: 1 } as const;
  const [publications, authors, articles] = await Promise.all([
    Publication.find({ status: "published" }, { ...fields, excerpt: 1, description: 1 }).lean<
      (SitemapEntry & { excerpt?: string; description?: string })[]
    >(),
    Author.find({}, { ...fields, bio: 1 }).lean<(SitemapEntry & { bio?: string })[]>(),
    Journal.find({ status: "published" }, fields).lean<SitemapEntry[]>(),
  ]);
  return {
    publications: real(
      publications.map((p) => ({ ...p, text: [p.excerpt ?? "", p.description ?? ""] })),
    ),
    authors: real(authors.map((a) => ({ ...a, text: [a.bio ?? ""] }))),
    articles,
  };
}
