import { z } from "zod";

import { PUBLICATION_FORMATS } from "@/types/content";

/**
 * 4 MB while manuscripts are stored in MongoDB.
 *
 * The upload goes through our own server, and Vercel refuses any request body
 * over 4.5 MB before it reaches the code. Raise this to 10 MB when uploads move
 * to presigned S3, where the file goes straight to the bucket.
 */
export const MANUSCRIPT_MAX_BYTES = 4 * 1024 * 1024;

export const MANUSCRIPT_MAX_MB = MANUSCRIPT_MAX_BYTES / 1024 / 1024;

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
 * above, and the server re-checks them against the file's bytes — the client
 * check is a courtesy, never a control.
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
  if (file.size > MANUSCRIPT_MAX_BYTES) return `That file is larger than ${MANUSCRIPT_MAX_MB} MB.`;

  const hasAllowedType = (MANUSCRIPT_MIME_TYPES as readonly string[]).includes(file.type);
  const hasAllowedExtension = MANUSCRIPT_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );

  // Some browsers report an empty or generic MIME type for .doc/.docx, so the
  // extension is accepted as a fallback. `sniffManuscriptType` on the server is
  // what actually decides.
  if (!hasAllowedType && !hasAllowedExtension) {
    return "Please upload a PDF, DOC or DOCX file.";
  }

  return null;
}

export type ManuscriptMimeType = (typeof MANUSCRIPT_MIME_TYPES)[number];

/**
 * Magic-number check: the declared MIME type and the extension are both
 * whatever the uploader says they are.
 *
 * A DOCX is a zip archive, and the bytes alone cannot tell it from any other
 * zip without unpacking it. So a zip is only accepted under a .docx name, and
 * it is only ever served back as a download, never rendered.
 */
export function sniffManuscriptType(
  bytes: Uint8Array,
  filename: string,
): ManuscriptMimeType | null {
  const startsWith = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);

  // %PDF-
  if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";

  // OLE2 compound document: the legacy .doc container.
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return "application/msword";

  // PK\x03\x04
  if (startsWith(0x50, 0x4b, 0x03, 0x04) && filename.toLowerCase().endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return null;
}
