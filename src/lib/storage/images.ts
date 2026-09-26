import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { Image } from "@/models";
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, sniffImageType } from "@/lib/validations/upload";

/**
 * Image storage.
 *
 * Backed by MongoDB so uploads work today, before object storage exists. The
 * surface here is deliberately narrow — store, resolve a URL, delete — so
 * Phase 7 can swap the body for presigned S3 without touching a form.
 *
 * Images live in their own collection rather than as fields on content
 * documents: a 16MB document limit is not something to spend on binaries, and
 * a listing query should never drag image bytes along with it.
 */

export type StoredImage = { id: string; url: string; contentType: string; size: number };

export type StoreResult = { ok: true; image: StoredImage } | { ok: false; error: string };

/** Public URL for a stored image. Same-origin, so next/image can optimise it. */
export function imageUrl(id: string): string {
  return `/api/images/${id}`;
}

export function isStoredImageUrl(value: string): boolean {
  return /^\/api\/images\/[a-f\d]{24}$/i.test(value);
}

export function idFromImageUrl(value: string): string | null {
  const match = /^\/api\/images\/([a-f\d]{24})$/i.exec(value);
  return match?.[1] ?? null;
}

export async function storeImage(file: File): Promise<StoreResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: `Images must be ${IMAGE_MAX_BYTES / 1024 / 1024} MB or smaller.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Re-checked against the bytes, not the browser's Content-Type: a client can
  // claim any type it likes, and a mislabelled file served back from our origin
  // is how a stored XSS gets in.
  const actual = sniffImageType(bytes);
  if (!actual || !(IMAGE_MIME_TYPES as readonly string[]).includes(actual)) {
    return { ok: false, error: "That file is not a PNG, JPEG, WebP or AVIF image." };
  }

  // Trust the sniffed length, not the reported one.
  if (bytes.byteLength > IMAGE_MAX_BYTES) {
    return { ok: false, error: "That image is too large." };
  }

  await connectToDatabase();
  const created = await Image.create({
    data: Buffer.from(bytes),
    contentType: actual,
    size: bytes.byteLength,
    // Never used as a path — display only, and stripped of directory parts.
    filename: file.name.split(/[/\\]/).pop()?.slice(0, 200) || "image",
  });

  const id = created._id.toString();
  return {
    ok: true,
    image: { id, url: imageUrl(id), contentType: actual, size: bytes.byteLength },
  };
}

/**
 * Normalises a stored binary to a Node Buffer.
 *
 * `.lean()` returns a BSON `Binary`, not a Buffer. Passing one straight to a
 * Response yields a 200 with correct headers and a zero-byte body, because
 * `Uint8Array.from(binary)` produces nothing — a failure that looks entirely
 * healthy from the outside. Both shapes are handled so neither can regress.
 */
function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;

  const binary = value as { buffer?: unknown; value?: () => unknown; sub_type?: number } | null;
  if (binary?.buffer instanceof Uint8Array) return Buffer.from(binary.buffer);
  if (typeof binary?.value === "function") {
    const raw = binary.value();
    if (raw instanceof Uint8Array) return Buffer.from(raw);
  }
  return null;
}

export async function getImage(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  const doc = await Image.findById(id).lean<{ data: unknown; contentType: string } | null>();
  if (!doc) return null;

  const data = toBuffer(doc.data);
  if (!data || data.byteLength === 0) return null;

  return { data, contentType: doc.contentType };
}

/**
 * Removes an image that is no longer referenced.
 *
 * Silent when the value is not one of ours: content may legitimately point at
 * an external URL, and deleting is best-effort cleanup, never a hard failure
 * that blocks saving the record.
 */
export async function deleteImageByUrl(url: string | undefined | null): Promise<void> {
  if (!url) return;
  const id = idFromImageUrl(url);
  if (!id) return;
  await connectToDatabase();
  await Image.findByIdAndDelete(id).catch(() => undefined);
}
