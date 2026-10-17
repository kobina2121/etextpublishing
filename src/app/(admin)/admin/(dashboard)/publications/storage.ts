import "server-only";

import { isBlobConfigured } from "@/lib/storage/blob";
import { SOFTCOPY_BLOB_MAX_BYTES, SOFTCOPY_DB_MAX_BYTES } from "@/lib/validations/publication";

/** Where the publication form sends softcopy files, decided where the key is visible. */
export function softcopyStorage(): { storage: "blob" | "server"; maxBytes: number } {
  return isBlobConfigured()
    ? { storage: "blob", maxBytes: SOFTCOPY_BLOB_MAX_BYTES }
    : { storage: "server", maxBytes: SOFTCOPY_DB_MAX_BYTES };
}
