"use server";

import { headers } from "next/headers";

import { issueMagicLink, MAGIC_LINK_TTL_MINUTES } from "@/lib/auth/magic-link";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { magicLinkEmail } from "@/lib/email/templates";
import { connectToDatabase } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { loginSchema } from "@/lib/validations/auth";
import { z } from "zod";

const requestSchema = z.object({ email: loginSchema.shape.email });

export type MagicLinkRequestResult = {
  /** Always true for any well-formed address — see the note below. */
  ok: boolean;
  message: string;
  /** Development only: the link, when there is no mail provider configured. */
  devUrl?: string;
};

/**
 * Requests a sign-in link.
 *
 * Answers identically whether or not the address belongs to an admin, and
 * whether or not it was rate limited. Saying "no such account" would turn this
 * into a way to test which addresses have access.
 *
 * Not a Route Handler because nothing here needs progress or streaming, and a
 * Server Action keeps the token off the client entirely.
 */
export async function requestMagicLink(raw: unknown): Promise<MagicLinkRequestResult> {
  const generic: MagicLinkRequestResult = {
    ok: true,
    message: "If that address has access, a sign-in link is on its way.",
  };

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  await connectToDatabase();

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    undefined;

  const issued = await issueMagicLink(parsed.data.email, ip);
  if (!issued.ok) return generic;

  const url = `${publicEnv.siteUrl}/admin/verify?token=${encodeURIComponent(issued.token)}`;
  const message = magicLinkEmail({ url, expiresMinutes: MAGIC_LINK_TTL_MINUTES });

  const sent = await sendMail({ to: parsed.data.email, ...message });
  if (!sent.ok) {
    // A real delivery failure is worth surfacing: the alternative is an admin
    // waiting for an email that was never going to arrive.
    return {
      ok: false,
      message: "The sign-in email could not be sent. Try your password instead.",
    };
  }

  // Returned only when there is no mail provider, and never in production —
  // sendMail refuses to fall back there.
  if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
    return { ...generic, devUrl: url };
  }

  return generic;
}
