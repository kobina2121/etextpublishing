import "server-only";

import { createDocumentStore, sniffDocument } from "@/lib/storage/document-store";
import { JOURNAL_PDF_BLOB_MAX_BYTES, JOURNAL_PDF_DB_MAX_BYTES } from "@/lib/validations/journal";
import { JournalFile } from "@/models";

/**
 * Journal PDFs: a private document store (see ./document-store). Read through
 * /journals/[slug]/pdf, which serves published entries only.
 */
const store = createDocumentStore({
  folder: "journals",
  kinds: ["pdf"],
  blobMaxBytes: JOURNAL_PDF_BLOB_MAX_BYTES,
  databaseMaxBytes: JOURNAL_PDF_DB_MAX_BYTES,
  model: JournalFile,
  noun: "PDF",
});

export function isPdf(bytes: Uint8Array): boolean {
  return sniffDocument(bytes) === "pdf";
}

export const isAllowedJournalPathname = store.isAllowedPathname;
export const storeJournalPdfInDatabase = store.storeInDatabase;
export const verifyUploadedJournalPdf = store.verifyUploaded;
export const openJournalPdf = store.open;
export const deleteJournalPdf = store.remove;
