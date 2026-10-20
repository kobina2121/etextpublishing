import "server-only";

import { isBlobConfigured } from "@/lib/storage/blob";
import { JOURNAL_PDF_BLOB_MAX_BYTES, JOURNAL_PDF_DB_MAX_BYTES } from "@/lib/validations/journal";

/** Where the journal form sends PDFs, decided on the server where the key is visible. */
export function journalStorage(): { storage: "blob" | "server"; maxBytes: number } {
  return isBlobConfigured()
    ? { storage: "blob", maxBytes: JOURNAL_PDF_BLOB_MAX_BYTES }
    : { storage: "server", maxBytes: JOURNAL_PDF_DB_MAX_BYTES };
}
