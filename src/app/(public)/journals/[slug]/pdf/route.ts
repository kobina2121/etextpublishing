import { openJournalPdf } from "@/lib/storage/journal-files";
import { getPublishedJournalPdf } from "@/server/journals";

/**
 * A journal's full text, free to read.
 *
 * Opens in the browser's own PDF viewer; `?download=1` saves it instead.
 * Published entries only, so a draft's PDF is not reachable by guessing its
 * slug. Not cached for long: an admin may replace the file.
 */
export async function GET(request: Request, { params }: RouteContext<"/journals/[slug]/pdf">) {
  const { slug } = await params;
  const entry = await getPublishedJournalPdf(slug);
  if (!entry) return new Response("Not found", { status: 404 });

  const file = await openJournalPdf(entry.key);
  if (!file) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const asciiName = entry.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

  return new Response(file.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(entry.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      // No hand-set Content-Length: on these routes it broke the response
      // framing (see /api/images/[id]); the runtime sets it where it can.
      "Cache-Control": "public, max-age=300",
    },
  });
}
