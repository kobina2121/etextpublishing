import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getAdminSession } from "@/lib/auth/guards";
import { isBlobConfigured } from "@/lib/storage/blob";
import { isAllowedArticlePathname } from "@/lib/storage/article-files";
import { JOURNAL_PDF_BLOB_MAX_BYTES } from "@/lib/validations/journal";

/**
 * Issues the short-lived token an admin's browser needs to upload an article
 * PDF straight to Vercel Blob. Admins only; one private PDF, in the articles
 * folder, up to 30 MB, under a randomised name.
 *
 * The upload alone attaches nothing: the form then sends the pathname to
 * /api/admin/articles/file, which checks the bytes are a real PDF.
 */
export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Bad request." }, { status: 400 });

  // The completion callback comes from Vercel, not a signed-in browser, and
  // handleUpload verifies its signature itself. Token requests need an admin.
  if (body.type === "blob.generate-client-token" && !(await getAdminSession())) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedArticlePathname(pathname)) throw new Error("PDF files only.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: JOURNAL_PDF_BLOB_MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (error) {
    console.error("[article-upload]", error);
    return Response.json({ error: "The upload could not be started." }, { status: 400 });
  }
}
