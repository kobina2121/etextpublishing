import "server-only";

import { Resend } from "resend";

/**
 * Outbound email.
 *
 * Resend when it is configured. When it is not, development logs the message to
 * the server console so flows can be exercised without credentials — but
 * production throws instead, because a sign-in link that silently goes nowhere
 * is worse than an obvious failure.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult = { ok: true; delivered: boolean } | { ok: false; error: string };

function transport(): { resend: Resend; from: string; replyTo?: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  // Mail is sent from an address on our domain, which has no inbox, so a reply
  // would bounce. Reply-To sends it somewhere a person reads instead.
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  return { resend: new Resend(apiKey), from, ...(replyTo ? { replyTo } : {}) };
}

export function isEmailConfigured(): boolean {
  return transport() !== null;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const configured = transport();

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
      };
    }

    // Development fallback. The body is printed so a message can be checked
    // without a mail provider; this branch is unreachable in production.
    console.info(
      [
        "",
        "──────────────────────────────────────────────────────────────",
        " EMAIL NOT CONFIGURED — printing message instead of sending",
        `  To      : ${message.to}`,
        `  Subject : ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, delivered: false };
  }

  try {
    const { error } = await configured.resend.emails.send({
      from: configured.from,
      ...(configured.replyTo ? { replyTo: configured.replyTo } : {}),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, delivered: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email failed to send." };
  }
}
