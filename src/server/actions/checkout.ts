"use server";

import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { headers } from "next/headers";

import { connectToDatabase } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { initializeTransaction, isPaystackConfigured } from "@/lib/payments/paystack";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { cartPayloadSchema, checkoutSchema } from "@/lib/validations/checkout";
import { Order } from "@/models";
import type { OrderItemDoc } from "@/models/types";
import { getSessionUser } from "@/lib/auth/guards";
import { priceCart } from "@/server/cart";

export type CheckoutResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; problems?: string[] };

/**
 * Starts a payment.
 *
 * The browser sends only publication ids, quantities and the buyer's details.
 * Every price and the order total are recomputed here from the database, and
 * the order is written as `pending` before Paystack is contacted — so there is
 * always a record to reconcile a webhook against, even if the buyer closes the
 * tab mid-payment.
 */
export async function startCheckout(raw: {
  cart: unknown;
  details: unknown;
}): Promise<CheckoutResult> {
  if (!isPaystackConfigured()) {
    return { ok: false, error: "Payments are not configured yet. Please contact us to order." };
  }

  const cart = cartPayloadSchema.safeParse(raw.cart);
  if (!cart.success) return { ok: false, error: "Your basket is empty." };

  const details = checkoutSchema.safeParse(raw.details);
  if (!details.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of details.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
  }

  // Honeypot tripped: accept silently rather than telling a bot what happened.
  if (details.data.website) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  await connectToDatabase();

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";

  const limit = await checkRateLimit({
    key: rateLimitKey("checkout", ip),
    limit: 10,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const priced = await priceCart(
    cart.data.map((i) => ({
      publicationId: i.publicationId,
      edition: i.edition,
      quantity: i.quantity,
    })),
  );

  if (priced.lines.length === 0) {
    return {
      ok: false,
      error: "Nothing in your basket is available to buy.",
      problems: priced.problems,
    };
  }
  // A basket that changed under the buyer must be shown to them before money
  // moves, not silently charged at the new total.
  if (priced.problems.length > 0) {
    return {
      ok: false,
      error: "Your basket changed. Please review it and try again.",
      problems: priced.problems,
    };
  }
  if (priced.total <= 0) {
    return { ok: false, error: "That order has no payable total." };
  }

  // Shipping is decided by what is in the basket, not by what the form claimed.
  const requiresShipping = priced.requiresShipping;
  if (requiresShipping !== details.data.requiresShipping) {
    return { ok: false, error: "Your basket changed. Please review it and try again." };
  }

  const reference = `etx_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;

  // Built as one explicit object rather than with conditional spreads: those
  // widen the literal into a union and Mongoose's create() overloads then fail
  // to resolve. Optional fields are set to undefined, which Mongoose omits.
  // Attach the order to the account when there is one, so it shows up under
  // "your orders" even if they later change the email on a future purchase.
  // Signing in is never required: a guest order simply has no owner, and is
  // matched back by verified email if they sign up afterwards.
  const sessionUser = await getSessionUser();

  const order = await Order.create({
    reference,
    user:
      sessionUser && Types.ObjectId.isValid(sessionUser.id)
        ? Types.ObjectId.createFromHexString(sessionUser.id)
        : undefined,
    email: details.data.email,
    customerName: details.data.customerName,
    phone: details.data.phone || undefined,
    items: priced.lines.map((line) => ({
      publication: Types.ObjectId.createFromHexString(line.publicationId),
      title: line.title,
      slug: line.slug,
      edition: line.edition as OrderItemDoc["edition"],
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      requiresShipping: line.requiresShipping,
    })),
    total: priced.total,
    currency: priced.currency,
    requiresShipping,
    shippingAddress: requiresShipping
      ? {
          line1: details.data.address.line1 ?? "",
          line2: details.data.address.line2 || undefined,
          city: details.data.address.city ?? "",
          region: details.data.address.region ?? "",
          postalCode: details.data.address.postalCode || undefined,
          country: details.data.address.country ?? "",
        }
      : undefined,
    status: "pending" as const,
    fulfilment: requiresShipping ? ("pending" as const) : ("not_required" as const),
  });

  const initialized = await initializeTransaction({
    email: order.email,
    amount: order.total,
    currency: order.currency,
    reference,
    callbackUrl: `${publicEnv.siteUrl}/checkout/callback`,
    metadata: { orderId: order._id.toString(), reference },
  });

  if (!initialized.ok) {
    await Order.findByIdAndUpdate(order._id, { $set: { status: "failed" } });
    return { ok: false, error: initialized.error };
  }

  return { ok: true, authorizationUrl: initialized.authorizationUrl, reference };
}
