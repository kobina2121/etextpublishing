import "server-only";

import { createDocumentStore } from "@/lib/storage/document-store";
import { JOURNAL_PDF_BLOB_MAX_BYTES, JOURNAL_PDF_DB_MAX_BYTES } from "@/lib/validations/journal";
import { ArticleFile } from "@/models";

/**
 * Article PDFs: a private document store (see ./document-store), with the same
 * limits as journal PDFs. Read through /news/[slug]/pdf, which serves
 * published articles only.
 */
const store = createDocumentStore({
  folder: "articles",
  kinds: ["pdf"],
  blobMaxBytes: JOURNAL_PDF_BLOB_MAX_BYTES,
  databaseMaxBytes: JOURNAL_PDF_DB_MAX_BYTES,
  model: ArticleFile,
  noun: "PDF",
});

export const isAllowedArticlePathname = store.isAllowedPathname;
export const storeArticlePdfInDatabase = store.storeInDatabase;
export const verifyUploadedArticlePdf = store.verifyUploaded;
export const openArticlePdf = store.open;
export const deleteArticlePdf = store.remove;
