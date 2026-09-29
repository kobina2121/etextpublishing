import "server-only";

import { connectToDatabase } from "@/lib/db";
import { verifyTransaction } from "@/lib/payments/paystack";
import { Order, Publication } from "@/models";

/**
 * Settles an order against what Paystack actually recorded.
 *
 * Called from both the webhook and the browser callback, because neither can be
 * relied on alone: a buyer may close the tab before returning, and a webhook may
 * be delayed, retried or delivered twice. Both routes land here, and the result
 * is the same however many times it runs.
 *
 * Nothing the caller says about payment is trusted. The amount, currency and
 * status are read back from Paystack and checked against the stored order, so a
 * tampered callback URL or a replayed webhook body cannot mark an order paid.
 */

export type SettleResult =
  | { ok: true; status: "paid" | "already-paid" | "unpaid"; orderReference: string }
  | { ok: false; error: string };

export async function settleOrder(reference: string): Promise<SettleResult> {
  await connectToDatabase();

  const order = await Order.findOne({ reference });
  if (!order) return { ok: false, error: "No such order." };

  if (order.status === "paid" && order.fulfilledAt) {
    return { ok: true, status: "already-paid", orderReference: order.reference };
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok) return { ok: false, error: verified.error };

  if (!verified.paid) {
    if (order.status === "pending") {
      await Order.updateOne({ _id: order._id, status: "pending" }, { $set: { status: "failed" } });
    }
    return { ok: true, status: "unpaid", orderReference: order.reference };
  }

  // Underpayment or a currency mismatch means this is not the payment we asked
  // for, whatever Paystack calls it.
  if (verified.amount < order.total || verified.currency !== order.currency) {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "failed",
          adminNotes: `Amount or currency mismatch: expected ${order.total} ${order.currency}, received ${verified.amount} ${verified.currency}.`,
        },
      },
    );
    return { ok: false, error: "The payment did not match the order total." };
  }

  // The conditional update is the idempotency guard: only the first caller
  // matches an unset fulfilledAt, so concurrent webhook retries cannot both
  // decrement stock.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, fulfilledAt: { $exists: false } },
    {
      $set: {
        status: "paid",
        paidAt: verified.paidAt ?? new Date(),
        paystackReference: verified.reference,
        fulfilledAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) {
    return { ok: true, status: "already-paid", orderReference: order.reference };
  }

  // Stock comes down only for shipped formats, and only once, guarded by that
  // single claim.
  for (const item of claimed.items) {
    if (!item.requiresShipping) continue;
    await Publication.updateOne(
      { _id: item.publication, stockQuantity: { $gte: item.quantity } },
      { $inc: { stockQuantity: -item.quantity } },
    );
  }

  return { ok: true, status: "paid", orderReference: claimed.reference };
}
