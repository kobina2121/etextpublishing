import { Types } from "mongoose";

import { getAdminSession } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db";
import { getManuscript } from "@/lib/storage/manuscripts";
import { ManuscriptSubmission } from "@/models";

/**
 * Admin download of a submitted manuscript.
 *
 * Addressed by submission id, not file id, so the only files reachable are
 * ones attached to a submission. Checked against the session here, not just
 * in the proxy: a Route Handler is reachable without rendering a gated page.
 *
 * Always an attachment, never inline. These files come from the public, and a
 * PDF rendered on our own origin would run with our origin's privileges.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/manuscripts/[id]/file">,
) {
  const admin = await getAdminSession();
  if (!admin) return new Response("Not authorised", { status: 401 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return new Response("Not found", { status: 404 });

  await connectToDatabase();
  const submission = await ManuscriptSubmission.findById(id)
    .select("fileKey")
    .lean<{ fileKey?: string } | null>();
  const file = await getManuscript(submission?.fileKey);
  if (!file) return new Response("Not found", { status: 404 });

  // An ASCII fallback for old clients, and the real name in RFC 5987 form.
  const asciiName = file.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const disposition = `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`;

  return new Response(new Blob([Uint8Array.from(file.data)], { type: file.contentType }), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": disposition,
      "X-Content-Type-Options": "nosniff",
      // Private, and may be withdrawn: never cache in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
