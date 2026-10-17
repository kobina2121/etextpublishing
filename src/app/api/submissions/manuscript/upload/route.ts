import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isAllowedManuscriptPathname, isBlobConfigured } from "@/lib/storage/manuscript-blob";
import { MANUSCRIPT_BLOB_MAX_BYTES, MANUSCRIPT_MIME_TYPES } from "@/lib/validations/manuscript";

/**
 * Issues the short-lived token a browser needs to upload a manuscript
 * straight to Vercel Blob.
 *
 * Public, because authors are not signed in, so the token is the control:
 * it allows one private file, in the manuscripts folder, of a document type,
 * up to 10 MB, under a name we randomise. Tokens are rate limited per
 * connection so the endpoint cannot be used to fill the store.
 *
 * The upload alone creates no submission. The form then posts the blob's
 * pathname to /api/submissions/manuscript, which re-checks the file's bytes
 * before accepting it.
 */
export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Bad request." }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedManuscriptPathname(pathname)) {
          throw new UploadRefused("Please upload a PDF, DOC or DOCX file.");
        }

        const limit = await checkRateLimit({
          key: rateLimitKey("manuscript-upload", await clientIp()),
          limit: 5,
          windowSeconds: 3600,
        });
        if (!limit.allowed) {
          throw new UploadRefused("Too many uploads from here. Please try again later.");
        }

        return {
          allowedContentTypes: [...MANUSCRIPT_MIME_TYPES],
          maximumSizeInBytes: MANUSCRIPT_BLOB_MAX_BYTES,
          // Two people uploading "manuscript.pdf" must never overwrite each other.
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
      // Nothing to do here: the submission is created when the form is sent,
      // after the file has been checked. (Vercel calls this on deployed sites
      // only; it cannot reach localhost.)
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof UploadRefused ? error.message : "The upload could not be started.";
    if (!(error instanceof UploadRefused)) console.error("[manuscript-upload]", error);
    return Response.json({ error: message }, { status: 400 });
  }
}

/** A refusal whose message is safe to show the author. */
class UploadRefused extends Error {}
