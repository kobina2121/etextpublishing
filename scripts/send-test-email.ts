/**
 * Sends one test email through Resend, to check the key and the domain.
 *
 *   npm run email:test -- you@example.com
 *
 * Talks to Resend directly rather than through src/lib/email, which is
 * server-only and refuses to load outside Next. It sends the real
 * password-reset template, pointing at a link that does nothing, so what
 * arrives is exactly what a reader would see.
 */
import { Resend } from "resend";

import { passwordResetEmail } from "@/lib/email/templates";

async function main() {
  const to = process.argv
    .slice(2)
    .find((a) => !a.startsWith("--"))
    ?.trim();
  if (!to || !to.includes("@")) {
    console.error("Usage: npm run email:test -- you@example.com");
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set in .env.local.");
    process.exit(1);
  }
  if (!from) {
    console.error("EMAIL_FROM is not set in .env.local.");
    process.exit(1);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const message = passwordResetEmail({
    name: "",
    url: `${site}/reset-password?token=this-is-a-test-email`,
    expiresMinutes: 30,
  });

  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;

  const { data, error } = await new Resend(apiKey).emails.send({
    from,
    ...(replyTo ? { replyTo } : {}),
    to,
    subject: `[Test] ${message.subject}`,
    html: message.html,
    text: message.text,
  });

  if (error) {
    console.error(`Resend refused it: ${error.message}`);
    if (/domain/i.test(error.message)) {
      console.error("Check the domain shows as Verified in Resend → Domains.");
    }
    process.exit(1);
  }

  console.log(`Sent to ${to} from ${from}. Resend id: ${data?.id}`);
  console.log(
    replyTo ? `Replies go to ${replyTo}.` : "No EMAIL_REPLY_TO set: replies will bounce.",
  );
  console.log("Not in the inbox within a minute or two? Check spam, then Resend → Emails.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
