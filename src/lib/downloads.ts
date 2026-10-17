import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { publicEnv } from "@/lib/env";

/**
 * Download links for paid softcopies.
 *
 * A link is the order reference plus a signature over it, made with
 * AUTH_SECRET. Nothing is stored: the signature cannot be produced without the
 * secret, so a link cannot be guessed, and changing the reference breaks it.
 * Guest buyers get the link on the confirmation page and by email; signed-in
 * readers also find it on their account.
 *
 * The link proves which order is asking. Whether that order was paid, and
 * includes the title's softcopy, is checked on every download.
 */

function secret(): string {
  const value = process.env.AUTH_SECRET?.trim();
  if (!value) throw new Error("AUTH_SECRET is not set.");
  return value;
}

export function signDownload(reference: string): string {
  return createHmac("sha256", secret()).update(`download:${reference}`).digest("base64url");
}

export function verifyDownload(reference: string, token: string | null | undefined): boolean {
  if (!token || !reference) return false;
  const expected = Buffer.from(signDownload(reference));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The page listing an order's downloads. Relative unless `absolute`, for emails. */
export function downloadsPageUrl(reference: string, absolute = false): string {
  const path = `/downloads/${encodeURIComponent(reference)}?t=${signDownload(reference)}`;
  return absolute ? `${publicEnv.siteUrl}${path}` : path;
}

/** One title's file within an order. */
export function downloadFileUrl(reference: string, publicationId: string): string {
  return `/api/downloads/${encodeURIComponent(reference)}/${publicationId}?t=${signDownload(reference)}`;
}
