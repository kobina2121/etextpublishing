"use server";

import { revalidatePath } from "next/cache";

import { Order } from "@/models";
import { withAdmin, type ActionResult } from "@/server/actions/shared";
import { FULFILMENT_STATUSES, type FulfilmentStatusValue } from "@/models/types";

/**
 * Fulfilment is the only part of an order an admin may change.
 *
 * Nothing here can mark an order paid or alter its total — that is settled
 * against Paystack and nowhere else. An admin editing an amount after the fact
 * would put the records out of step with the money.
 */
export async function setOrderFulfilment(
  id: string,
  fulfilment: FulfilmentStatusValue,
  adminNotes?: string,
): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!FULFILMENT_STATUSES.includes(fulfilment)) {
      return { ok: false, error: "That is not a valid fulfilment status." };
    }

    const order = await Order.findById(id, { status: 1 }).lean<{ status: string } | null>();
    if (!order) return { ok: false, error: "That order no longer exists." };

    if (order.status !== "paid") {
      return { ok: false, error: "Only a paid order can be moved through fulfilment." };
    }

    await Order.updateOne(
      { _id: id },
      { $set: { fulfilment, ...(adminNotes === undefined ? {} : { adminNotes }) } },
    );

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Order updated." };
  });
}
