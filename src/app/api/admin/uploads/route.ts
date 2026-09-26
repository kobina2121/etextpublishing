import { getAdminSession } from "@/lib/auth/guards";
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
