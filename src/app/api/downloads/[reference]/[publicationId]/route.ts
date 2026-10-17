import { verifyDownload } from "@/lib/downloads";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { softcopyStore } from "@/lib/storage/softcopy-files";
import { getDownloadFile } from "@/server/downloads";

/**
 * Serves a paid softcopy.
 *
 * Three checks, all required: the link's signature is genuine for this order;
 * the order is paid; and it includes this title's softcopy. Downloads per
 * order are capped per hour, which is plenty for one buyer and makes a link
 * posted publicly much less useful.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/downloads/[reference]/[publicationId]">,
) {
  const { reference, publicationId } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!verifyDownload(reference, token)) return new Response("Not found", { status: 404 });

  const limit = await checkRateLimit({
    key: rateLimitKey("download", reference),
    limit: 20,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return new Response("Too many downloads for this order. Please try again later.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const entry = await getDownloadFile(reference, publicationId);
  if (!entry) return new Response("Not found", { status: 404 });
  const file = await softcopyStore.open(entry.key);
  if (!file) return new Response("Not found", { status: 404 });

  // Always with the right extension, so the buyer's device knows how to open it.
  const extension = file.contentType === "application/epub+zip" ? ".epub" : ".pdf";
  const fileName = /\.(pdf|epub)$/i.test(entry.fileName)
    ? entry.fileName
    : `${entry.fileName}${extension}`;
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "X-Content-Type-Options": "nosniff",
      // Paid content: never stored by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
