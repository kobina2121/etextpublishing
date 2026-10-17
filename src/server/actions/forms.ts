"use server";

import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { contactNotificationEmail } from "@/lib/email/templates";
import { publicEnv } from "@/lib/env";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { contactSchema } from "@/lib/validations/contact";
import { ContactMessage, SiteSettings } from "@/models";
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
  const saved = await ContactMessage.create({ ...fields, phone: fields.phone || undefined });

  revalidatePath("/admin");
  revalidatePath("/admin/messages");

  await notifyTeam({
    ...fields,
    phone: fields.phone || undefined,
    adminUrl: `${publicEnv.siteUrl}/admin/messages/${saved._id.toString()}`,
  });

  return { ok: true };
}

/**
 * Emails a new message to the team, with Reply-To set to the visitor.
 *
 * Goes to EMAIL_TO_CONTACT, or failing that to the contact email saved at
 * /admin/settings. Best effort: the message is already saved and visible in
 * the dashboard, so a mail failure is logged and the visitor still sees
 * success.
 */
async function notifyTeam(message: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  adminUrl: string;
}): Promise<void> {
  try {
    const recipient = await contactRecipient();
    if (!recipient) {
      console.error("[contact] no recipient: set EMAIL_TO_CONTACT");
      return;
    }
    const sent = await sendMail({
      to: recipient,
      replyTo: message.email,
      ...contactNotificationEmail(message),
    });
    if (!sent.ok) console.error("[contact] notification not sent", sent.error);
  } catch (error) {
    console.error("[contact] notification failed", error);
  }
}

async function contactRecipient(): Promise<string | undefined> {
  const configured = process.env.EMAIL_TO_CONTACT?.trim();
  if (configured) return configured;
  const settings = await SiteSettings.findOne({ key: "site" })
    .select("contact.email")
    .lean<{ contact?: { email?: string } } | null>();
  return settings?.contact?.email || undefined;
}
