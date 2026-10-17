import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isBlobConfigured, verifyUploadedManuscript } from "@/lib/storage/manuscript-blob";
import {
  deleteManuscript,
  storeManuscript,
  type StoreManuscriptResult,
} from "@/lib/storage/manuscripts";
import { manuscriptSchema } from "@/lib/validations/manuscript";
import { ManuscriptSubmission } from "@/models";

/**
 * Public manuscript submission.
 *
 * A Route Handler rather than a Server Action because it carries a file: Server
 * Actions cap the body at 1 MB unless the limit is raised for every action in
 * the app, and this is the only one that needs more.
 *
 * Order matters. The honeypot and the field validation are free, so they run
 * first; the rate limit costs a database round trip; the file is read last,
 * once the request has earned it.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return Response.json(
      { ok: false, error: "The submission could not be read." },
      { status: 400 },
    );
  }

  // Honeypot: a field people never see. A bot that fills it is told it
  // succeeded, so it has no reason to try again differently.
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return Response.json({ ok: true });
  }

  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const wordCount = Number(text("wordCount"));

  const parsed = manuscriptSchema.safeParse({
    authorName: text("authorName"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    genre: text("genre"),
    preferredFormat: text("preferredFormat") || undefined,
    wordCount: Number.isFinite(wordCount) ? wordCount : undefined,
    synopsis: text("synopsis"),
  });
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  // Two ways a file arrives. With Vercel Blob connected, the browser has
  // already uploaded it and sends only where it went; otherwise the file comes
  // in this request.
  const blobPathname = text("blobPathname");
  const blobFileName = text("fileName") ?? "manuscript";
  const file = form.get("file");
  if (!blobPathname && !(file instanceof File)) {
    return Response.json({ ok: false, error: "Please attach your manuscript." }, { status: 400 });
  }
  if (blobPathname && !isBlobConfigured()) {
    return Response.json({ ok: false, error: "Please attach your manuscript." }, { status: 400 });
  }

  const limit = await checkRateLimit({
    key: rateLimitKey("manuscript", await clientIp()),
    limit: 3,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Too many submissions from here. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const stored = blobPathname
    ? await claimUploadedManuscript(blobPathname, blobFileName)
    : await storeManuscript(file as File);
  if (!stored.ok) {
    return Response.json({ ok: false, error: stored.error }, { status: 400 });
  }

  const { website: _honeypot, ...fields } = parsed.data;

  try {
    await connectToDatabase();
    await ManuscriptSubmission.create({
      ...fields,
      phone: fields.phone || undefined,
      fileKey: stored.file.key,
      fileName: stored.file.fileName,
      fileSize: stored.file.size,
      submittedAt: new Date(),
    });
  } catch (error) {
    // Do not leave an orphaned file behind a submission that was never saved.
    await deleteManuscript(stored.file.key);
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/manuscripts");

  return Response.json({ ok: true });
}

/**
 * Accepts a file the browser already put in Vercel Blob.
 *
 * Its bytes are re-checked, and it may back one submission only: a pathname
 * already in use is refused, so one upload cannot be attached to many
 * submissions, or to someone else's.
 */
async function claimUploadedManuscript(
  pathname: string,
  fileName: string,
): Promise<StoreManuscriptResult> {
  await connectToDatabase();
  if (await ManuscriptSubmission.exists({ fileKey: `blob:${pathname}` })) {
    return { ok: false, error: "That file has already been submitted. Please attach it again." };
  }
  const verified = await verifyUploadedManuscript(pathname, fileName);
  if (!verified.ok) return verified;
  return {
    ok: true,
    file: { key: verified.key, fileName: verified.fileName, size: verified.size },
  };
}
