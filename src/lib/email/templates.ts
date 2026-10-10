import { siteConfig } from "@/lib/site-config";

/**
 * Plain, inline-styled HTML with a text alternative.
 *
 * Mail clients strip <style> blocks and external CSS, so everything is inline;
 * and every message ships a text part, because some clients show it and spam
 * filters expect it.
 */
export function passwordResetEmail({
  name,
  url,
  expiresMinutes,
}: {
  name: string;
  url: string;
  expiresMinutes: number;
}) {
  const subject = `Reset your ${siteConfig.name} password`;
  const greeting = name ? `Hello ${name},` : "Hello,";

  const text = [
    greeting,
    "",
    `Someone asked to reset the password for your ${siteConfig.name} account.`,
    `Use the link below to choose a new one. It works once and expires in ${expiresMinutes} minutes.`,
    "",
    url,
    "",
    "If you did not ask for this, ignore this email — your password stays as it is.",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2f2f2f;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280;">
            ${escapeHtml(siteConfig.name)}
          </p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">Reset your password</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            Use the button below to choose a new password. It works once and expires in ${expiresMinutes} minutes.
          </p>
          <a href="${escapeHtml(url)}"
             style="display:inline-block;padding:12px 22px;background:#0a7e3a;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;">
            Choose a new password
          </a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
            If the button does not work, paste this into your browser:<br />
            <span style="word-break:break-all;color:#0a7e3a;">${escapeHtml(url)}</span>
          </p>
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.6;color:#6b7280;">
            If you did not ask for this, ignore this email. Your password stays as it is.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, html, text };
}

/** Everything interpolated into HTML is escaped, including our own URL and the account name. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
