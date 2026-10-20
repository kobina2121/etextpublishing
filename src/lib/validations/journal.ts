import { z } from "zod";

import { linkListSchema } from "@/lib/validations/content";
import { imageRefSchema, slugSchema } from "@/lib/validations/publication";

/**
 * Journal PDFs: 30 MB through Vercel Blob, where the browser uploads straight
 * to storage; 4 MB without it, when the file passes through our own server and
 * Vercel's 4.5 MB request limit applies.
 */
export const JOURNAL_PDF_BLOB_MAX_BYTES = 30 * 1024 * 1024;
export const JOURNAL_PDF_DB_MAX_BYTES = 4 * 1024 * 1024;

/** A comma-separated list as typed in the admin, as a clean array. */
export function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A stored file's key, `blob:…` or `db:…`; empty when there is none. */
export const storageKeySchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^(blob|db):\S+$/.test(value), "Upload the PDF again.")
  .optional()
  .default("");

/**
 * A journal entry as edited at /admin/articles.
 *
 * Authors and keywords are typed as comma-separated text and stored as lists.
 * The PDF is optional: an article may instead link to where it was published
 * (see `links`).
 */
export const journalSchema = z.object({
  title: z.string().trim().min(2, "Give the entry a title.").max(250),
  slug: slugSchema,
  authors: z
    .string()
    .trim()
    .min(2, "Name at least one author.")
    .max(600)
    .refine((value) => splitList(value).length > 0, "Name at least one author."),
  volume: z.string().trim().max(20).optional().or(z.literal("")),
  issue: z.string().trim().max(20).optional().or(z.literal("")),
  publishedAt: z.coerce.date({ message: "Choose a publication date." }),
  abstract: z
    .string()
    .trim()
    .min(30, "Write an abstract of at least a couple of sentences.")
    .max(6000),
  keywords: z.string().trim().max(400).optional().or(z.literal("")),
  coverImage: imageRefSchema,
  pdfKey: storageKeySchema,
  pdfName: z.string().trim().max(200).optional().or(z.literal("")),
  pdfSize: z.coerce.number().int().min(0).optional().default(0),
  /** Further reading shown under the article: label and http(s) address. */
  links: linkListSchema,
  status: z.enum(["draft", "published"]).default("draft"),
});

export type JournalInput = z.input<typeof journalSchema>;
export type JournalValues = z.output<typeof journalSchema>;
