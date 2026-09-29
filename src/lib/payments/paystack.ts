import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack client.
 *
 * Plain fetch rather than an SDK: three endpoints are used, the REST shape is
 * stable, and a payment integration is not where an extra dependency earns its
 * place.
 *
 * Amounts are always integer subunits — pesewas for GHS. The secret key never
 * leaves the server; only the public key may reach the browser.
 */

const API = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

/** Guards against pointing live keys at a test run, or the reverse. */
export function paystackMode(): "live" | "test" | "unconfigured" {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) return "unconfigured";
  return key.startsWith("sk_live_") ? "live" : "test";
}

export type InitializeResult =
  { ok: true; authorizationUrl: string; reference: string } | { ok: false; error: string };

export async function initializeTransaction(input: {
  email: string;
  /** Integer subunits. */
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  try {
    const response = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata ?? {},
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      return { ok: false, error: payload.message ?? "Paystack rejected the transaction." };
    }

    return {
      ok: true,
      authorizationUrl: payload.data.authorization_url,
      reference: payload.data.reference ?? input.reference,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Payment setup failed." };
  }
}

export type VerifyResult =
  | {
      ok: true;
      paid: boolean;
      /** Integer subunits, as Paystack recorded it. */
      amount: number;
      currency: string;
      reference: string;
      paidAt: Date | null;
    }
  | { ok: false; error: string };

/**
 * Asks Paystack what actually happened.
 *
 * This is the only thing that may mark an order paid. The browser returning
 * from checkout proves nothing — the URL can be visited directly — and a
 * webhook body proves nothing until its signature is checked.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  try {
    const response = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        reference?: string;
        paid_at?: string;
      };
    };

    if (!response.ok || !payload.status || !payload.data) {
      return { ok: false, error: payload.message ?? "Could not verify the transaction." };
    }

    return {
      ok: true,
      paid: payload.data.status === "success",
      amount: payload.data.amount ?? 0,
      currency: (payload.data.currency ?? "").toUpperCase(),
      reference: payload.data.reference ?? reference,
      paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Verification failed." };
  }
}

/**
 * Validates a webhook signature.
 *
 * Paystack signs the RAW request body with HMAC-SHA512 keyed on the secret.
 * The body must be hashed exactly as received — parsing and re-serialising it
 * changes the bytes and the signature will never match.
 *
 * Compared in constant time so the comparison cannot be used as an oracle.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;

  const expected = createHmac("sha512", secretKey()).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
