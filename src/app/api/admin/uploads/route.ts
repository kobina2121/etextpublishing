import { getAdminSession } from "@/lib/auth/guards";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { storeImage } from "@/lib/storage/images";

/**
 * Admin image upload.
 *
 * A Route Handler rather than a Server Action because the browser needs upload
 * progress, which means XHR against a real endpoint.
 *
 * Returns 401 rather than redirecting: this is called by fetch, and a redirect
 * to the login page would arrive as an opaque HTML body.
 */
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ ok: false, error: "Not authorised." }, { status: 401 });
  }

  // Authenticated, but still capped: a compromised or careless session should
  // not be able to fill the database with binaries.
  const limit = await checkRateLimit({
    key: rateLimitKey("upload", admin.id),
    limit: 30,
    windowSeconds: 300,
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Too many uploads. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file was received." }, { status: 400 });
  }

  const result = await storeImage(file);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, ...result.image });
}
