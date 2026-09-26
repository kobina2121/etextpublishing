/**
 * Upload constraints.
 *
 * Shared by the client picker and the route handler, but the server check is
 * the one that counts: the client's reported type and size are attacker
 * controlled.
 *
 * SVG is deliberately excluded. It is an XML document that can carry script,
 * so serving user-supplied SVG from our own origin would be a stored XSS.
 */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");

export function describeImageLimits(): string {
  return `PNG, JPEG, WebP or AVIF, up to ${IMAGE_MAX_BYTES / 1024 / 1024} MB.`;
}

/** Magic-number check: the declared MIME type is not evidence of anything. */
export function sniffImageType(bytes: Uint8Array): ImageMimeType | null {
  const startsWith = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";

  // RIFF....WEBP
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)
  ) {
    return "image/webp";
  }

  // ISO-BMFF box: ....ftyp, with an AVIF brand.
  if ([0x66, 0x74, 0x79, 0x70].every((b, i) => bytes[4 + i] === b)) {
    const brand = String.fromCharCode(...Array.from(bytes.slice(8, 12)));
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
}
