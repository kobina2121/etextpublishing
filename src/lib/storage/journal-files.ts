import "server-only";

import { del, head } from "@vercel/blob";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import {
  BLOB_KEY_PREFIX,
  isBlobKey,
  openPrivateBlob,
  pathnameFromBlobKey,
  readOpeningBytes,
} from "@/lib/storage/blob";
import { JOURNAL_PDF_BLOB_MAX_BYTES, JOURNAL_PDF_DB_MAX_BYTES } from "@/lib/validations/journal";
import { JournalFile } from "@/models";

/**
 * Journal PDFs.
 *
 * In Vercel Blob (private) when it is connected: an admin's browser uploads
 * straight there, so large PDFs never pass through our server. Otherwise in
 * MongoDB, sent through our server, which caps them at 4 MB.
 *
 * Either way they are read through /journals/[slug]/pdf, which serves only
 * published entries — a draft's PDF is not reachable by guessing.
 */

const DB_PREFIX = "db:";

export type StoredPdf = { ok: true; key: string; fileName: string; size: number };
export type StorePdfResult = StoredPdf | { ok: false; error: string };

/** %PDF- — the only check that matters; the name and browser type prove nothing. */
export function isPdf(bytes: Uint8Array): boolean {
  return [0x25, 0x50, 0x44, 0x46, 0x2d].every((byte, i) => bytes[i] === byte);
}

function cleanName(fileName: string): string {
  return fileName.split(/[/\\]/).pop()?.slice(0, 200) || "journal.pdf";
}

const mb = (bytes: number) => bytes / 1024 / 1024;

/** A pathname the admin upload route will issue a token for. */
export function isAllowedJournalPathname(pathname: string): boolean {
  return /^journals\/[^/\\]+\.pdf$/i.test(pathname);
}

/** Without Blob: the file arrives with the request and is kept in MongoDB. */
export async function storeJournalPdfInDatabase(file: File): Promise<StorePdfResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > JOURNAL_PDF_DB_MAX_BYTES) {
    return { ok: false, error: `PDFs must be ${mb(JOURNAL_PDF_DB_MAX_BYTES)} MB or smaller.` };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > JOURNAL_PDF_DB_MAX_BYTES) {
    return { ok: false, error: `PDFs must be ${mb(JOURNAL_PDF_DB_MAX_BYTES)} MB or smaller.` };
  }
  if (!isPdf(bytes)) return { ok: false, error: "That file is not a PDF." };

  await connectToDatabase();
  const fileName = cleanName(file.name);
  const created = await JournalFile.create({
    data: Buffer.from(bytes),
    size: bytes.byteLength,
    filename: fileName,
  });
  return {
    ok: true,
    key: `${DB_PREFIX}${created._id.toString()}`,
    fileName,
    size: bytes.byteLength,
  };
}

/** With Blob: the browser has uploaded the file; check it before a record may point at it. */
export async function verifyUploadedJournalPdf(
  pathname: string,
  fileName: string,
): Promise<StorePdfResult> {
  if (!isAllowedJournalPathname(pathname)) {
    return { ok: false, error: "The uploaded file could not be found. Please upload it again." };
  }
  const meta = await head(pathname).catch(() => null);
  if (!meta) {
    return { ok: false, error: "The uploaded file could not be found. Please upload it again." };
  }
  const reject = async (error: string): Promise<StorePdfResult> => {
    await del(meta.url).catch(() => undefined);
    return { ok: false, error };
  };
  if (meta.size === 0) return reject("That file is empty.");
  if (meta.size > JOURNAL_PDF_BLOB_MAX_BYTES) {
    return reject(`PDFs must be ${mb(JOURNAL_PDF_BLOB_MAX_BYTES)} MB or smaller.`);
  }
  const opening = await readOpeningBytes(pathname);
  if (!opening || !isPdf(opening)) return reject("That file is not a PDF.");

  return {
    ok: true,
    key: `${BLOB_KEY_PREFIX}${pathname}`,
    fileName: cleanName(fileName),
    size: meta.size,
  };
}

/** Opens a stored PDF for reading. Callers decide who may read it. */
export async function openJournalPdf(
  key: string | undefined | null,
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; size: number } | null> {
  if (!key) return null;
  if (isBlobKey(key)) {
    const blob = await openPrivateBlob(key);
    return blob ? { body: blob.stream, size: blob.size } : null;
  }
  if (!key.startsWith(DB_PREFIX)) return null;
  const id = key.slice(DB_PREFIX.length);
  if (!Types.ObjectId.isValid(id)) return null;

  await connectToDatabase();
  const doc = await JournalFile.findById(id);
  if (!doc?.data?.length) return null;
  return { body: Uint8Array.from(doc.data), size: doc.size };
}

/** Best-effort cleanup: a missing file must never block editing or deleting an entry. */
export async function deleteJournalPdf(key: string | undefined | null): Promise<void> {
  if (!key) return;
  if (isBlobKey(key)) {
    await del(pathnameFromBlobKey(key)).catch(() => undefined);
    return;
  }
  if (!key.startsWith(DB_PREFIX)) return;
  const id = key.slice(DB_PREFIX.length);
  if (!Types.ObjectId.isValid(id)) return;
  await connectToDatabase();
  await JournalFile.findByIdAndDelete(id).catch(() => undefined);
}
