import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { deleteManuscript, storeManuscript } from "@/lib/storage/manuscripts";
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

  const file = form.get("file");
  if (!(file instanceof File)) {
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

  const stored = await storeManuscript(file);
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
