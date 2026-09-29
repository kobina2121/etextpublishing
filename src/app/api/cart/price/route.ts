import { cartPayloadSchema } from "@/lib/validations/checkout";
import { priceCart } from "@/server/cart";

/**
 * Prices a basket.
 *
 * The basket lives in the browser, so the cart page has to ask the server what
 * it actually costs. Public by design — it exposes nothing that is not already
 * on the publication pages — and it only ever reads.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = cartPayloadSchema.safeParse(body);

  if (!parsed.success) {
    // Safe to refuse outright, but say so: a silently empty basket reads as
    // "everything sold out" rather than "that request was malformed".
    return Response.json({
      lines: [],
      total: 0,
      currency: "GHS",
      requiresShipping: false,
      problems: ["We could not read your basket. Please clear it and add the titles again."],
    });
  }

  const priced = await priceCart(parsed.data);
  return Response.json(priced);
}
