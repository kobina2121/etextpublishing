import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { deleteBlobManuscript, isBlobKey } from "@/lib/storage/manuscript-blob";
import { ManuscriptFile } from "@/models";
import {
  MANUSCRIPT_MAX_BYTES,
  MANUSCRIPT_MAX_MB,
  sniffManuscriptType,
} from "@/lib/validations/manuscript";

/**
 * Manuscript storage.
 *
 * The MongoDB store, used when Vercel Blob is not connected (see
 * ./manuscript-blob, which takes over once BLOB_READ_WRITE_TOKEN is set). Unlike images,
 * nothing here is public: there is no URL helper, and the only route that
 * reads a file is behind the admin check.
 *
 * Keys are prefixed `db:` so that when S3 arrives, older submissions can still
 * be told apart from — and served alongside — ones stored in the bucket.
 */

const KEY_PREFIX = "db:";

export type StoredManuscript = { key: string; fileName: string; size: number };

export type StoreManuscriptResult =
  { ok: true; file: StoredManuscript } | { ok: false; error: string };

export async function storeManuscript(file: File): Promise<StoreManuscriptResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MANUSCRIPT_MAX_BYTES) {
    return { ok: false, error: `Manuscripts must be ${MANUSCRIPT_MAX_MB} MB or smaller.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the bytes received, not the size the browser reported.
  if (bytes.byteLength > MANUSCRIPT_MAX_BYTES) {
    return { ok: false, error: `Manuscripts must be ${MANUSCRIPT_MAX_MB} MB or smaller.` };
  }

  // Never used as a path — display only, and stripped of directory parts.
  const fileName = file.name.split(/[/\\]/).pop()?.slice(0, 200) || "manuscript";

  const contentType = sniffManuscriptType(bytes, fileName);
  if (!contentType) {
    return { ok: false, error: "That file is not a PDF, DOC or DOCX document." };
  }

  await connectToDatabase();
  const created = await ManuscriptFile.create({
    data: Buffer.from(bytes),
    contentType,
    size: bytes.byteLength,
    filename: fileName,
  });

  return {
    ok: true,
    file: { key: `${KEY_PREFIX}${created._id.toString()}`, fileName, size: bytes.byteLength },
  };
}

function idFromKey(key: string | undefined | null): string | null {
  if (!key?.startsWith(KEY_PREFIX)) return null;
  const id = key.slice(KEY_PREFIX.length);
  return Types.ObjectId.isValid(id) ? id : null;
}

/** See `toBuffer` in ./images — `.lean()` hands back a BSON Binary, not a Buffer. */
function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  const binary = value as { buffer?: unknown; value?: () => unknown } | null;
  if (binary?.buffer instanceof Uint8Array) return Buffer.from(binary.buffer);
  if (typeof binary?.value === "function") {
    const raw = binary.value();
    if (raw instanceof Uint8Array) return Buffer.from(raw);
  }
  return null;
}

/** Callers must have checked for an admin session. */
export async function getManuscript(
  key: string | undefined | null,
): Promise<{ data: Buffer; contentType: string; fileName: string } | null> {
  const id = idFromKey(key);
  if (!id) return null;

  await connectToDatabase();
  const doc = await ManuscriptFile.findById(id).lean<{
    data: unknown;
    contentType: string;
    filename: string;
  } | null>();
  if (!doc) return null;

  const data = toBuffer(doc.data);
  if (!data || data.byteLength === 0) return null;

  return { data, contentType: doc.contentType, fileName: doc.filename };
}

/** Best-effort cleanup: a missing file must never block deleting a submission. */
export async function deleteManuscript(key: string | undefined | null): Promise<void> {
  // Stored in Vercel Blob rather than here.
  if (isBlobKey(key)) return deleteBlobManuscript(key);
  const id = idFromKey(key);
  if (!id) return;
  await connectToDatabase();
  await ManuscriptFile.findByIdAndDelete(id).catch(() => undefined);
}
