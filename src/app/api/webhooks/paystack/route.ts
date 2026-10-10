import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { settleOrder } from "@/server/payments/fulfil";

/**
 * Paystack webhook.
 *
 * The raw body is read as text before anything parses it, because the
 * signature is an HMAC over the exact bytes received — parsing and
 * re-serialising changes them and the check would never pass.
 *
 * An unsigned or wrongly signed request is refused before its contents are
 * looked at: the body is attacker-controlled until the signature says
 * otherwise, and anyone can POST here.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Malformed payload", { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event !== "charge.success" || !reference) {
    // Acknowledged so Paystack stops retrying an event we do not act on.
    return new Response("Ignored", { status: 200 });
  }

  const settled = await settleOrder(reference);

  if (!settled.ok) {
    console.error("[paystack] settle failed", reference, settled.error);
    // A fault on our side or Paystack's (unreachable, timed out) gets a 500 so
    // Paystack redelivers the event. Acknowledging it would leave a paid order
    // pending forever if the buyer also never came back to the callback page.
    if (settled.retryable) return new Response("Try again", { status: 500 });
  }

  // Everything else is a final answer — a mismatched amount, an unknown order
  // — and retrying will not change it, so it is acknowledged.
  return new Response("OK", { status: 200 });
}
