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

/**
 * Reads a setting, dropping one pair of surrounding quotes.
 *
 * `.env.local` needs quotes around a value with spaces, and dotenv removes
 * them; Vercel's dashboard keeps them as typed. A value copied from one into
 * the other then reaches Resend as `"Name <address>"`, quotes and all, and it
 * refuses to send.
 */
function setting(key: string): string | undefined {
  const value = process.env[key]
    ?.trim()
    // Pasted with its own name, as in `EMAIL_FROM=…`.
    .replace(new RegExp(`^${key}\\s*=\\s*`), "")
    // Straight or curly quotes around the whole value.
    .replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, "")
    .trim();
  return value || undefined;
}

const ADDRESS =
  /[^\s<>"'\u201C\u201D\u2018\u2019,;]+@[^\s<>"'\u201C\u201D\u2018\u2019,;]+\.[a-z]{2,}/i;

/**
 * Rebuilds a sender as `Name <address>` or a bare `address`, the only two
 * forms Resend accepts.
 *
 * A dashboard value can arrive damaged — angle brackets lost, quotes doubled
 * or curly, stray spacing — and Resend then refuses every email with "Invalid
 * `from` field", which is how password reset broke on the live site. Rather
 * than pass on whatever was typed, find the address in it and rebuild the
 * rest. Returns undefined when there is no address at all.
 */
export function normaliseSender(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const address = ADDRESS.exec(raw)?.[0];
  if (!address) return undefined;

  const name = raw
    .replace(address, "")
    .replace(/[<>"'\u201C\u201D\u2018\u2019]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return name ? `${name} <${address}>` : address;
}

function transport(): { resend: Resend; from: string; replyTo?: string } | null {
  const apiKey = setting("RESEND_API_KEY");
  const from = normaliseSender(setting("EMAIL_FROM"));
  if (!apiKey || !from) {
    if (apiKey && setting("EMAIL_FROM")) {
      console.error("[email] EMAIL_FROM has no email address in it; nothing can be sent");
    }
    return null;
  }
  // Mail is sent from an address on our domain, which has no inbox, so a reply
  // would bounce. Reply-To sends it somewhere a person reads instead.
  const replyTo = setting("EMAIL_REPLY_TO");
  return { resend: new Resend(apiKey), from, ...(replyTo ? { replyTo } : {}) };
}

export function isEmailConfigured(): boolean {
  return transport() !== null;
}

/**
 * Domains reserved for documentation and testing (RFC 2606 and 6761). Nobody
 * can receive mail there, so a send can only bounce — and bounces count
 * against the sending domain's reputation. Tests sign up with these.
 */
export function isReservedTestAddress(address: string): boolean {
  const domain = address.trim().toLowerCase().split("@").pop() ?? "";
  return (
    /^(example\.(com|net|org)|localhost)$/.test(domain) ||
    /\.(test|invalid|example|localhost)$/.test(domain)
  );
}

function printInsteadOfSending(message: MailMessage, reason: string): void {
  console.info(
    [
      "",
      "──────────────────────────────────────────────────────────────",
      ` ${reason} — printing message instead of sending`,
      `  To      : ${message.to}`,
      `  Subject : ${message.subject}`,
      "",
      message.text,
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (isReservedTestAddress(message.to)) {
    printInsteadOfSending(message, "TEST ADDRESS");
    return { ok: true, delivered: false };
  }

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
    printInsteadOfSending(message, "EMAIL NOT CONFIGURED");
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
