import { getAdminSession } from "@/lib/auth/guards";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isBlobConfigured } from "@/lib/storage/blob";
import { storeJournalPdfInDatabase, verifyUploadedJournalPdf } from "@/lib/storage/journal-files";

/**
 * Turns an uploaded journal PDF into a storage key the form can save.
 *
 * Two ways in. With Vercel Blob the browser has already uploaded the file and
 * sends JSON naming where it went; the bytes are checked here. Without it, the
 * file arrives in this request and is kept in MongoDB.
 *
 * Returns 401 rather than redirecting: this is called by fetch.
 */
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ ok: false, error: "Not authorised." }, { status: 401 });

  const limit = await checkRateLimit({
    key: rateLimitKey("journal-file", admin.id),
    limit: 30,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Too many uploads. Wait a moment and try again." },
      { status: 429 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    if (!isBlobConfigured()) {
      return Response.json(
        { ok: false, error: "File storage is not configured." },
        { status: 400 },
      );
    }
    const body = (await request.json().catch(() => null)) as {
      blobPathname?: unknown;
      fileName?: unknown;
    } | null;
    if (typeof body?.blobPathname !== "string") {
      return Response.json({ ok: false, error: "No file was received." }, { status: 400 });
    }
    const result = await verifyUploadedJournalPdf(
      body.blobPathname,
      typeof body.fileName === "string" ? body.fileName : "journal.pdf",
    );
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file was received." }, { status: 400 });
  }
  const result = await storeJournalPdfInDatabase(file);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
