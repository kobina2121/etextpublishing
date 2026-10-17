import "server-only";

import { del, head } from "@vercel/blob";
import { Types, type Model } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import {
  BLOB_KEY_PREFIX,
  isBlobKey,
  openPrivateBlob,
  pathnameFromBlobKey,
  readOpeningBytes,
} from "@/lib/storage/blob";

/**
 * A private store for documents: journal PDFs, softcopies.
 *
 * In Vercel Blob when it is connected — an admin's browser uploads straight
 * there, so large files never pass through our server. Otherwise in MongoDB,
 * sent through our server and capped by Vercel's request limit.
 *
 * Keys stored on records are `blob:<pathname>` or `db:<id>`, never URLs. Files
 * are only ever read through our own routes, which decide who may read them.
 * Every file's opening bytes are checked against its claimed type: a name or a
 * browser's Content-Type proves nothing.
 */

export type DocumentKind = "pdf" | "epub";

const CONTENT_TYPES: Record<DocumentKind, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
};

/** What the bytes say the file is, or null if it is neither. */
export function sniffDocument(bytes: Uint8Array): DocumentKind | null {
  const startsWith = (offset: number, text: string) =>
    [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
  if (startsWith(0, "%PDF-")) return "pdf";
  // EPUB is a zip whose first entry must be an uncompressed file named
  // "mimetype" holding "application/epub+zip" — which puts that text at a
  // fixed offset. A plain zip renamed .epub does not pass.
  if (startsWith(0, "PK\u0003\u0004") && startsWith(30, "mimetypeapplication/epub+zip")) {
    return "epub";
  }
  return null;
}

/** Enough opening bytes for sniffDocument. */
const SNIFF_BYTES = 64;

type StoredFileDoc = { data: Buffer; size: number; filename: string; contentType?: string };

export type StoredDocument = {
  ok: true;
  key: string;
  fileName: string;
  size: number;
  contentType: string;
};
export type StoreDocumentResult = StoredDocument | { ok: false; error: string };

const mb = (bytes: number) => bytes / 1024 / 1024;

function cleanName(fileName: string, fallback: string): string {
  return fileName.split(/[/\\]/).pop()?.slice(0, 200) || fallback;
}

export function createDocumentStore<T extends StoredFileDoc>({
  folder,
  kinds,
  blobMaxBytes,
  databaseMaxBytes,
  model,
  noun,
}: {
  /** Blob folder, e.g. "softcopies". */
  folder: string;
  kinds: readonly DocumentKind[];
  blobMaxBytes: number;
  databaseMaxBytes: number;
  model: Model<T>;
  /** For messages: "PDF", "PDF or EPUB". */
  noun: string;
}) {
  // Each store's model has its own document type; all share these fields.
  const files = model as unknown as Model<StoredFileDoc>;
  const extensions = kinds.join("|");
  const pathnamePattern = new RegExp(`^${folder}/[^/\\\\]+\\.(${extensions})$`, "i");
  const notAllowed = `That file is not a ${noun}.`;

  const acceptable = (bytes: Uint8Array): DocumentKind | null => {
    const kind = sniffDocument(bytes);
    return kind && kinds.includes(kind) ? kind : null;
  };

  return {
    contentTypes: kinds.map((kind) => CONTENT_TYPES[kind]),

    /** A pathname the admin upload route will issue a Blob token for. */
    isAllowedPathname(pathname: string): boolean {
      return pathnamePattern.test(pathname);
    },

    /** Without Blob: the file arrives with the request and is kept in MongoDB. */
    async storeInDatabase(file: File): Promise<StoreDocumentResult> {
      if (file.size === 0) return { ok: false, error: "That file is empty." };
      const tooBig = `Files must be ${mb(databaseMaxBytes)} MB or smaller here.`;
      if (file.size > databaseMaxBytes) return { ok: false, error: tooBig };
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength > databaseMaxBytes) return { ok: false, error: tooBig };
      const kind = acceptable(bytes);
      if (!kind) return { ok: false, error: notAllowed };

      await connectToDatabase();
      const fileName = cleanName(file.name, `file.${kind}`);
      const created = await files.create({
        data: Buffer.from(bytes),
        size: bytes.byteLength,
        filename: fileName,
        contentType: CONTENT_TYPES[kind],
      });
      return {
        ok: true,
        key: `db:${created._id.toString()}`,
        fileName,
        size: bytes.byteLength,
        contentType: CONTENT_TYPES[kind],
      };
    },

    /** With Blob: the browser uploaded the file; check it before a record may point at it. */
    async verifyUploaded(pathname: string, fileName: string): Promise<StoreDocumentResult> {
      const missing = "The uploaded file could not be found. Please upload it again.";
      if (!pathnamePattern.test(pathname)) return { ok: false, error: missing };
      const meta = await head(pathname).catch(() => null);
      if (!meta) return { ok: false, error: missing };

      const reject = async (error: string): Promise<StoreDocumentResult> => {
        await del(meta.url).catch(() => undefined);
        return { ok: false, error };
      };
      if (meta.size === 0) return reject("That file is empty.");
      if (meta.size > blobMaxBytes) {
        return reject(`Files must be ${mb(blobMaxBytes)} MB or smaller.`);
      }
      const opening = await readOpeningBytes(pathname, SNIFF_BYTES);
      const kind = opening ? acceptable(opening) : null;
      if (!kind) return reject(notAllowed);

      return {
        ok: true,
        key: `${BLOB_KEY_PREFIX}${pathname}`,
        fileName: cleanName(fileName, `file.${kind}`),
        size: meta.size,
        contentType: CONTENT_TYPES[kind],
      };
    },

    /** Opens a stored file. Callers decide who may read it. */
    async open(key: string | undefined | null): Promise<{
      body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>;
      contentType: string;
    } | null> {
      if (!key) return null;
      if (isBlobKey(key)) {
        const blob = await openPrivateBlob(key);
        return blob ? { body: blob.stream, contentType: blob.contentType } : null;
      }
      if (!key.startsWith("db:")) return null;
      const id = key.slice(3);
      if (!Types.ObjectId.isValid(id)) return null;
      await connectToDatabase();
      const doc = await files.findById(id);
      if (!doc?.data?.length) return null;
      return {
        body: Uint8Array.from(doc.data),
        contentType: doc.contentType ?? CONTENT_TYPES[kinds[0] ?? "pdf"],
      };
    },

    /** Best-effort cleanup: a missing file must never block saving or deleting a record. */
    async remove(key: string | undefined | null): Promise<void> {
      if (!key) return;
      if (isBlobKey(key)) {
        await del(pathnameFromBlobKey(key)).catch(() => undefined);
        return;
      }
      if (!key.startsWith("db:")) return;
      const id = key.slice(3);
      if (!Types.ObjectId.isValid(id)) return;
      await connectToDatabase();
      await files.findByIdAndDelete(id).catch(() => undefined);
    },
  };
}
