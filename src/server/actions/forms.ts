"use server";

import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { contactSchema } from "@/lib/validations/contact";
import { ContactMessage } from "@/models";
import { toFieldErrors, type ActionResult } from "@/server/actions/shared";

/**
 * Public form actions: no session required, so each one is throttled per IP
 * and carries a honeypot.
 *
 * The manuscript form is not here. It carries a file, which is over the Server
 * Action body limit — see /api/submissions/manuscript.
 */

export async function submitContactMessage(raw: unknown): Promise<ActionResult> {
  // Honeypot: report success to a bot that filled the hidden field, so it has
  // no reason to try again differently.
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { ok: true };
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const limit = await checkRateLimit({
    key: rateLimitKey("contact", await clientIp()),
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return { ok: false, error: "Too many messages from here. Please try again later." };
  }

  const { website: _honeypot, ...fields } = parsed.data;

  await connectToDatabase();
  await ContactMessage.create({ ...fields, phone: fields.phone || undefined });

  revalidatePath("/admin");
  revalidatePath("/admin/messages");

  return { ok: true };
}
