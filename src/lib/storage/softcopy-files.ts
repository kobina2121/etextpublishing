import "server-only";

import { createDocumentStore } from "@/lib/storage/document-store";
import { SOFTCOPY_BLOB_MAX_BYTES, SOFTCOPY_DB_MAX_BYTES } from "@/lib/validations/publication";
import { SoftcopyFile } from "@/models";

/**
 * Softcopy files — the PDF or EPUB a buyer downloads after paying.
 *
 * Private (see ./document-store). The only way to read one is
 * /api/downloads/[reference]/[publicationId], which checks the order was paid,
 * includes this title's softcopy, and that the link's signature is genuine.
 */
export const softcopyStore = createDocumentStore({
  folder: "softcopies",
  kinds: ["pdf", "epub"],
  blobMaxBytes: SOFTCOPY_BLOB_MAX_BYTES,
  databaseMaxBytes: SOFTCOPY_DB_MAX_BYTES,
  model: SoftcopyFile,
  noun: "PDF or EPUB",
});
