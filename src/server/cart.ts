import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { DEFAULT_CURRENCY, formatRequiresShipping } from "@/lib/money";
import { Publication } from "@/models";

/**
 * Turns a client cart into priced lines.
 *
 * The browser only ever sends publication ids and quantities. Prices,
 * availability and the total are read from the database here, every time.
 * Anything the client claims about cost is ignored, because a cart is trivially
 * editable and a total posted from a browser is not evidence of anything.
 */

export type CartRequestItem = { publicationId: string; quantity: number };

export type PricedLine = {
  publicationId: string;
  title: string;
  slug: string;
  format: string;
  coverImage?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  requiresShipping: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  total: number;
  currency: string;
  requiresShipping: boolean;
  /** Lines dropped or reduced, so the buyer is told rather than silently charged. */
  problems: string[];
};

const MAX_QUANTITY_PER_LINE = 20;

export async function priceCart(items: CartRequestItem[]): Promise<PricedCart> {
  await connectToDatabase();

  const problems: string[] = [];
  const lines: PricedLine[] = [];

  // Collapse duplicates and drop anything that is not a plausible id before
  // it reaches the database.
  const wanted = new Map<string, number>();
  for (const item of items) {
    if (!Types.ObjectId.isValid(item.publicationId)) continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;
    wanted.set(item.publicationId, (wanted.get(item.publicationId) ?? 0) + qty);
  }

  if (wanted.size === 0) {
    return { lines: [], total: 0, currency: DEFAULT_CURRENCY, requiresShipping: false, problems };
  }

  const docs = await Publication.find({
    _id: { $in: [...wanted.keys()] },
    status: "published",
  }).lean();

  for (const [id, requested] of wanted) {
    const doc = docs.find((d) => d._id.toString() === id);

    if (!doc) {
      problems.push("A title in your basket is no longer available and has been removed.");
      continue;
    }
    if (!doc.price || doc.price <= 0) {
      problems.push(`“${doc.title}” is not currently for sale and has been removed.`);
      continue;
    }

    const requiresShipping = formatRequiresShipping(doc.format);

    let quantity = Math.min(requested, MAX_QUANTITY_PER_LINE);
    if (requiresShipping) {
      if (doc.stockQuantity <= 0) {
        problems.push(`“${doc.title}” is out of stock and has been removed.`);
        continue;
      }
      if (quantity > doc.stockQuantity) {
        quantity = doc.stockQuantity;
        problems.push(
          `Only ${doc.stockQuantity} of “${doc.title}” left; the quantity was reduced.`,
        );
      }
    } else {
      // A download is bought once; more than one of the same file is meaningless.
      quantity = 1;
    }

    lines.push({
      publicationId: id,
      title: doc.title,
      slug: doc.slug,
      format: doc.format,
      ...(doc.coverImage ? { coverImage: doc.coverImage } : {}),
      unitPrice: doc.price,
      quantity,
      lineTotal: doc.price * quantity,
      requiresShipping,
    });
  }

  // Mixing currencies in one order cannot be charged correctly, so the first
  // line's currency governs and anything else is refused.
  const currency = (docs[0]?.currency ?? DEFAULT_CURRENCY).toUpperCase();
  const mixed = docs.some((d) => (d.currency ?? DEFAULT_CURRENCY).toUpperCase() !== currency);
  if (mixed) problems.push("Your basket mixes currencies. Please order them separately.");

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    currency,
    requiresShipping: lines.some((line) => line.requiresShipping),
    problems,
  };
}
