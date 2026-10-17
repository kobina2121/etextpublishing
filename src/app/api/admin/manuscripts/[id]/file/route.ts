import { Types } from "mongoose";

import { getAdminSession } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db";
import { isBlobKey, openBlobManuscript } from "@/lib/storage/manuscript-blob";
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
    .select("fileKey fileName")
    .lean<{ fileKey?: string; fileName?: string } | null>();
  const key = submission?.fileKey;

  // Stored in Vercel Blob: streamed through, never loaded whole into memory,
  // and never by a public URL — private blobs have none.
  if (isBlobKey(key)) {
    const file = await openBlobManuscript(key);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(file.stream, {
      headers: downloadHeaders(file.contentType, submission?.fileName || "manuscript"),
    });
  }

  const file = await getManuscript(key);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Blob([Uint8Array.from(file.data)], { type: file.contentType }), {
    headers: downloadHeaders(file.contentType, file.fileName),
  });
}

function downloadHeaders(contentType: string, fileName: string): HeadersInit {
  // An ASCII fallback for old clients, and the real name in RFC 5987 form.
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "X-Content-Type-Options": "nosniff",
    // Private, and may be withdrawn: never cache in a shared cache.
    "Cache-Control": "private, no-store",
  };
}
