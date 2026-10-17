import "server-only";

import { get } from "@vercel/blob";

/**
 * Shared Vercel Blob helpers.
 *
 * Blob is active when BLOB_READ_WRITE_TOKEN is set — Vercel adds it when a
 * Blob store is connected to the project. Files kept there are private and
 * read back through our own routes; keys stored on records are prefixed
 * `blob:` to tell them apart from files kept in MongoDB (`db:`).
 */

export const BLOB_KEY_PREFIX = "blob:";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isBlobKey(key: string | undefined | null): key is `blob:${string}` {
  return Boolean(key?.startsWith(BLOB_KEY_PREFIX));
}

export function pathnameFromBlobKey(key: string): string {
  return key.slice(BLOB_KEY_PREFIX.length);
}

/** Reads a private blob's first bytes — enough for a type check, without downloading it all. */
export async function readOpeningBytes(pathname: string, count = 16): Promise<Uint8Array | null> {
  const result = await get(pathname, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) return null;

  const reader = result.stream.getReader();
  const bytes = new Uint8Array(count);
  let filled = 0;
  try {
    while (filled < count) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const take = Math.min(value.byteLength, count - filled);
      bytes.set(value.subarray(0, take), filled);
      filled += take;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return filled > 0 ? bytes.subarray(0, filled) : null;
}

/** Streams a private blob. Callers decide who may read it. */
export async function openPrivateBlob(
  key: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; size: number } | null> {
  const result = await get(pathnameFromBlobKey(key), { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return {
    stream: result.stream,
    contentType: result.blob.contentType ?? "application/octet-stream",
    size: result.blob.size ?? 0,
  };
}
