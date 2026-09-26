import { siteConfig } from "@/lib/site-config";

/**
 * Plain, inline-styled HTML with a text alternative.
 *
 * Mail clients strip <style> blocks and external CSS, so everything is inline;
 * and every message ships a text part, because some clients show it and spam
 * filters expect it.
 */
export function magicLinkEmail({ url, expiresMinutes }: { url: string; expiresMinutes: number }) {
  const subject = `Sign in to ${siteConfig.name}`;

  const text = [
    `Sign in to ${siteConfig.name}`,
    "",
    "Use the link below to sign in. It works once and expires in",
    `${expiresMinutes} minutes.`,
    "",
    url,
    "",
    "If you did not request this, you can ignore this email — nobody can",
    "sign in without the link.",
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
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">Sign in</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            Use the button below to sign in. It works once and expires in ${expiresMinutes} minutes.
          </p>
          <a href="${escapeHtml(url)}"
             style="display:inline-block;padding:12px 22px;background:#0a7e3a;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;">
            Sign in
          </a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
            If the button does not work, paste this into your browser:<br />
            <span style="word-break:break-all;color:#0a7e3a;">${escapeHtml(url)}</span>
          </p>
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.6;color:#6b7280;">
            If you did not request this, ignore this email. Nobody can sign in without the link.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return { subject, html, text };
}

/** The URL is ours, but it is still interpolated into HTML — escape regardless. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
