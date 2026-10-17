import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getAdminSession } from "@/lib/auth/guards";
import { isBlobConfigured } from "@/lib/storage/blob";
import { softcopyStore } from "@/lib/storage/softcopy-files";
import { SOFTCOPY_BLOB_MAX_BYTES } from "@/lib/validations/publication";

/**
 * Issues the short-lived token an admin's browser needs to upload a softcopy
 * (PDF or EPUB) straight to Vercel Blob. Admins only; one private file, in the
 * softcopies folder, up to 50 MB, under a randomised name.
 *
 * The upload alone attaches nothing: the form then sends the pathname to
 * /api/admin/softcopies/file, which checks the file really is a PDF or EPUB.
 */
export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Bad request." }, { status: 400 });

  // Vercel's completion callback is signed and verified by handleUpload; only
  // token requests come from a browser, and those need an admin.
  if (body.type === "blob.generate-client-token" && !(await getAdminSession())) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!softcopyStore.isAllowedPathname(pathname)) throw new Error("PDF or EPUB only.");
        return {
          allowedContentTypes: softcopyStore.contentTypes,
          maximumSizeInBytes: SOFTCOPY_BLOB_MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (error) {
    console.error("[softcopy-upload]", error);
    return Response.json({ error: "The upload could not be started." }, { status: 400 });
  }
}
