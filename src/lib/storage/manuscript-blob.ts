import "server-only";

import { del, head } from "@vercel/blob";

import {
  BLOB_KEY_PREFIX,
  isBlobConfigured,
  isBlobKey,
  openPrivateBlob,
  pathnameFromBlobKey,
  readOpeningBytes,
} from "@/lib/storage/blob";

import {
  MANUSCRIPT_BLOB_MAX_BYTES,
  megabytes,
  sniffManuscriptType,
} from "@/lib/validations/manuscript";

/**
 * Manuscripts in Vercel Blob, as private files.
 *
 * The browser uploads straight to Blob with a short-lived token from
 * /api/submissions/manuscript/upload, so a file never passes through our
 * server and Vercel's 4.5 MB request limit does not apply. Nothing here is
 * public: a private blob has no readable URL, and the only route that reads
 * one is behind the admin check.
 *
 * Active when BLOB_READ_WRITE_TOKEN is set — Vercel adds it when a Blob store
 * is connected to the project. Without it, manuscripts are kept in MongoDB as
 * before (see ./manuscripts).
 */

/** Every manuscript lives under this folder; nothing outside it is accepted. */
export const BLOB_FOLDER = "manuscripts/";

/** A pathname the upload route will issue a token for: our folder, one level, a document. */
export function isAllowedManuscriptPathname(pathname: string): boolean {
  return /^manuscripts\/[^/\\]+\.(pdf|docx?)$/i.test(pathname);
}

export type VerifiedManuscript =
  { ok: true; key: string; fileName: string; size: number } | { ok: false; error: string };

/**
 * Checks an uploaded blob before a submission may point at it.
 *
 * The browser only tells us where it put the file, so none of that is
 * trusted: the blob must be in our folder, exist in our store, be within the
 * size limit, and start with the bytes of a real PDF, DOC or DOCX. A blob that
 * fails is deleted, so a rejected upload does not linger in storage.
 */
export async function verifyUploadedManuscript(
  pathname: string,
  fileName: string,
): Promise<VerifiedManuscript> {
  if (!isAllowedManuscriptPathname(pathname)) {
    return { ok: false, error: "The uploaded file could not be found. Please attach it again." };
  }

  const meta = await head(pathname).catch(() => null);
  if (!meta) {
    return { ok: false, error: "The uploaded file could not be found. Please attach it again." };
  }

  const reject = async (error: string): Promise<VerifiedManuscript> => {
    await del(meta.url).catch(() => undefined);
    return { ok: false, error };
  };

  if (meta.size === 0) return reject("That file is empty.");
  if (meta.size > MANUSCRIPT_BLOB_MAX_BYTES) {
    return reject(`Manuscripts must be ${megabytes(MANUSCRIPT_BLOB_MAX_BYTES)} MB or smaller.`);
  }

  // Read just the opening bytes: enough for the type check, without
  // downloading the whole manuscript.
  const head8 = await readOpeningBytes(pathname);
  if (!head8 || !sniffManuscriptType(head8, fileName)) {
    return reject("That file is not a PDF, DOC or DOCX document.");
  }

  return {
    ok: true,
    key: `${BLOB_KEY_PREFIX}${pathname}`,
    fileName: fileName.split(/[/\\]/).pop()?.slice(0, 200) || "manuscript",
    size: meta.size,
  };
}

/** Streams a stored manuscript. Callers must have checked for an admin session. */
export const openBlobManuscript = openPrivateBlob;

/** Best-effort cleanup: a missing file must never block deleting a submission. */
export async function deleteBlobManuscript(key: string): Promise<void> {
  await del(pathnameFromBlobKey(key)).catch(() => undefined);
}

export { BLOB_KEY_PREFIX, isBlobConfigured, isBlobKey };
