import { getAdminSession } from "@/lib/auth/guards";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isBlobConfigured } from "@/lib/storage/blob";
import { softcopyStore } from "@/lib/storage/softcopy-files";

/**
 * Turns an uploaded softcopy into a storage key the publication form can save.
 *
 * With Vercel Blob the browser has already uploaded the file and sends JSON
 * naming where it went; its bytes are checked here. Without it, the file
 * arrives in this request and is kept in MongoDB.
 */
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ ok: false, error: "Not authorised." }, { status: 401 });

  const limit = await checkRateLimit({
    key: rateLimitKey("softcopy-file", admin.id),
    limit: 30,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Too many uploads. Wait a moment and try again." },
      { status: 429 },
    );
  }

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
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
    const result = await softcopyStore.verifyUploaded(
      body.blobPathname,
      typeof body.fileName === "string" ? body.fileName : "softcopy",
    );
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file was received." }, { status: 400 });
  }
  const result = await softcopyStore.storeInDatabase(file);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
