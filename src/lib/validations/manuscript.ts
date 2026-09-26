import { z } from "zod";

import { PUBLICATION_FORMATS } from "@/types/content";

export const MANUSCRIPT_MAX_BYTES = 10 * 1024 * 1024;

export const MANUSCRIPT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MANUSCRIPT_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const GENRES = [
  "Fiction",
  "Non-fiction",
  "Academic",
  "Children's",
  "Poetry",
  "Other",
] as const;

/**
 * Fields for a manuscript submission.
 *
 * File validation is kept separate: the browser checks a `File`, while the
 * server will only ever see the uploaded object key. Both use the same limits
 * above, and the server re-checks them in Phase 7 — the client check is a
 * courtesy, never a control.
 */
export const manuscriptSchema = z.object({
  authorName: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  title: z.string().trim().min(2, "Please enter your manuscript's title.").max(200),
  genre: z.enum(GENRES, { message: "Please choose a genre." }),
  preferredFormat: z.enum(PUBLICATION_FORMATS).optional(),
  wordCount: z
    .number({ message: "Please enter an approximate word count." })
    .int("Word count must be a whole number.")
    .min(500, "That seems too short — please check the word count.")
    .max(5_000_000),
  synopsis: z
    .string()
    .trim()
    .min(50, "Please give us at least 50 characters of synopsis.")
    .max(5000),
  /** Honeypot: real users never see this, so any value means a bot. */
  website: z.string().max(0).optional(),
});

export type ManuscriptInput = z.infer<typeof manuscriptSchema>;

export function validateManuscriptFile(file: File | undefined | null): string | null {
  if (!file) return "Please attach your manuscript.";
  if (file.size > MANUSCRIPT_MAX_BYTES) return "That file is larger than 10 MB.";

  const hasAllowedType = (MANUSCRIPT_MIME_TYPES as readonly string[]).includes(file.type);
  const hasAllowedExtension = MANUSCRIPT_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );

  // Some browsers report an empty or generic MIME type for .doc/.docx, so the
  // extension is accepted as a fallback. The server check in Phase 7 is what
  // actually protects the bucket.
  if (!hasAllowedType && !hasAllowedExtension) {
    return "Please upload a PDF, DOC or DOCX file.";
  }

  return null;
}
