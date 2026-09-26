import { getImage } from "@/lib/storage/images";

/**
 * Serves a stored image.
 *
 * Public by design — these are cover photos and author portraits. Immutable
 * caching is safe because the id changes whenever the bytes do: replacing an
 * image creates a new record rather than overwriting one.
 *
 * The body is a Blob, which carries its own type and length. Handing the
 * Buffer (or a Uint8Array view of it) straight to Response produced a 200 with
 * correct headers and an empty body, and setting Content-Length by hand broke
 * the response framing outright.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/images/[id]">) {
  const { id } = await params;
  const image = await getImage(id);

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  const blob = new Blob([Uint8Array.from(image.data)], { type: image.contentType });

  return new Response(blob, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      // The type was verified from the file's magic number on upload; stop the
      // browser second-guessing it and sniffing something executable.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
