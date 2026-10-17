import "server-only";

import { connectToDatabase } from "@/lib/db";
import { downloadsPageUrl } from "@/lib/downloads";
import { sendMail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { formatMoney } from "@/lib/money";
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

/**
 * Paystack statuses that are final and mean no money moved. Anything else that
 * is not "success" — "ongoing", "pending", "processing", "queued" and the like —
 * is still in flight. Mobile money sits there until the buyer approves the
 * charge on their phone, which can be after they are back on our site.
 */
const FAILED_STATUSES = new Set(["failed", "abandoned", "reversed"]);

export type SettleResult =
  | {
      ok: true;
      /** `processing`: not decided yet. The order stays pending; do not ask them to pay again. */
      status: "paid" | "already-paid" | "unpaid" | "processing";
      orderReference: string;
    }
  /**
   * `retryable`: we could not reach a decision this time (Paystack unreachable,
   * say) and asking again later may succeed. A webhook should then fail, so
   * Paystack redelivers it, rather than acknowledge an event we never acted on.
   */
  | { ok: false; error: string; retryable: boolean };

export async function settleOrder(reference: string): Promise<SettleResult> {
  await connectToDatabase();

  const order = await Order.findOne({ reference });
  if (!order) return { ok: false, error: "No such order.", retryable: false };

  if (order.status === "paid" && order.fulfilledAt) {
    return { ok: true, status: "already-paid", orderReference: order.reference };
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok) {
    return { ok: false, error: verified.error, retryable: verified.retryable };
  }

  if (!verified.paid) {
    if (!FAILED_STATUSES.has(verified.status)) {
      return { ok: true, status: "processing", orderReference: order.reference };
    }
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
    return { ok: false, error: "The payment did not match the order total.", retryable: false };
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

  // Stock comes down only for shipped editions, and only once, guarded by that
  // single claim. The decrement targets the hardcopy's own stock, so buying a
  // download can never reduce the printed count.
  //
  // Stock is not held while the buyer pays, so the last copy can sell twice.
  // The money has moved by now and cannot be refused, so a shortfall is
  // recorded on the order for an admin to act on — never silently skipped.
  const shortfalls: string[] = [];
  for (const item of claimed.items) {
    if (!item.requiresShipping) continue;
    const updated = await Publication.updateOne(
      {
        _id: item.publication,
        [`editions.${item.edition}.stockQuantity`]: { $gte: item.quantity },
      },
      { $inc: { [`editions.${item.edition}.stockQuantity`]: -item.quantity } },
    );
    if (updated.modifiedCount === 0) {
      shortfalls.push(`${item.title} (${item.edition}) × ${item.quantity}`);
    }
  }

  if (shortfalls.length > 0) {
    const shortfall = `Paid, but not enough stock for: ${shortfalls.join("; ")}. Restock or refund.`;
    await Order.updateOne({ _id: claimed._id }, { $set: { stockShortfall: shortfall } });
    console.error("[paystack] stock shortfall", claimed.reference, shortfall);
  }

  // Once only: this runs for the single caller that claimed the order.
  await sendConfirmation(claimed);

  return { ok: true, status: "paid", orderReference: claimed.reference };
}

/**
 * The buyer's confirmation, with their download link when they bought a
 * softcopy. Best effort: the payment is settled whatever happens here, so a
 * mail failure is logged, never thrown.
 */
async function sendConfirmation(order: {
  reference: string;
  email: string;
  customerName: string;
  currency: string;
  total: number;
  requiresShipping: boolean;
  items: { title: string; edition: string; quantity: number; unitPrice: number }[];
}): Promise<void> {
  try {
    const hasSoftcopy = order.items.some((item) => item.edition === "softcopy");
    const message = orderConfirmationEmail({
      name: order.customerName,
      reference: order.reference,
      lines: order.items.map(
        (item) =>
          `${item.title} — ${item.edition === "softcopy" ? "Softcopy" : "Hardcopy"} × ${item.quantity} — ${formatMoney(item.unitPrice * item.quantity, order.currency)}`,
      ),
      total: formatMoney(order.total, order.currency),
      requiresShipping: order.requiresShipping,
      ...(hasSoftcopy ? { downloadsUrl: downloadsPageUrl(order.reference, true) } : {}),
    });
    const sent = await sendMail({ to: order.email, ...message });
    if (!sent.ok) console.error("[order-confirmation] not sent", order.reference, sent.error);
  } catch (error) {
    console.error("[order-confirmation] failed", order.reference, error);
  }
}
