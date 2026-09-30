import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { DEFAULT_CURRENCY, editionRequiresShipping } from "@/lib/money";
import { Publication } from "@/models";
import type { EditionKindValue } from "@/models/types";

/**
 * Turns a client cart into priced lines.
 *
 * The browser only ever sends publication ids, an edition kind and quantities.
 * Prices, availability and the total are read from the database here, every
 * time. Anything the client claims about cost is ignored, because a cart is
 * trivially editable and a total posted from a browser is not evidence of
 * anything.
 *
 * A line is keyed by title *and* edition: the same book bought as a hardcopy
 * and as a download is two lines, at two prices, with two fulfilment paths.
 */

export type CartRequestItem = { publicationId: string; edition: string; quantity: number };

export type PricedLine = {
  publicationId: string;
  edition: EditionKindValue;
  title: string;
  slug: string;
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

function isEditionKind(value: unknown): value is EditionKindValue {
  return value === "hardcopy" || value === "softcopy";
}

/** Stable key for one basket line. */
export function cartLineKey(publicationId: string, edition: string): string {
  return `${publicationId}:${edition}`;
}

export async function priceCart(items: CartRequestItem[]): Promise<PricedCart> {
  await connectToDatabase();

  const problems: string[] = [];
  const lines: PricedLine[] = [];

  // Collapse duplicates and drop anything implausible before it reaches the
  // database. Two entries for the same title in different editions are not
  // duplicates, so the key carries the edition.
  const wanted = new Map<string, { publicationId: string; edition: EditionKindValue; quantity: number }>();
  for (const item of items) {
    if (!Types.ObjectId.isValid(item.publicationId)) continue;
    if (!isEditionKind(item.edition)) continue;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) continue;

    const key = cartLineKey(item.publicationId, item.edition);
    const existing = wanted.get(key);
    if (existing) existing.quantity += qty;
    else
      wanted.set(key, {
        publicationId: item.publicationId,
        edition: item.edition,
        quantity: qty,
      });
  }

  if (wanted.size === 0) {
    return { lines: [], total: 0, currency: DEFAULT_CURRENCY, requiresShipping: false, problems };
  }

  const ids = [...new Set([...wanted.values()].map((entry) => entry.publicationId))];
  const docs = await Publication.find({ _id: { $in: ids }, status: "published" }).lean();

  for (const { publicationId, edition, quantity: requested } of wanted.values()) {
    const doc = docs.find((d) => d._id.toString() === publicationId);

    if (!doc) {
      problems.push("A title in your basket is no longer available and has been removed.");
      continue;
    }

    const kindLabel = edition === "hardcopy" ? "hardcopy" : "softcopy";
    const offered = doc.editions?.[edition];

    if (!offered?.available || !offered.price || offered.price <= 0) {
      problems.push(`The ${kindLabel} of “${doc.title}” is not for sale and has been removed.`);
      continue;
    }

    const requiresShipping = editionRequiresShipping(edition);

    let quantity = Math.min(requested, MAX_QUANTITY_PER_LINE);
    if (requiresShipping) {
      if (offered.stockQuantity <= 0) {
        problems.push(`The ${kindLabel} of “${doc.title}” is out of stock and has been removed.`);
        continue;
      }
      if (quantity > offered.stockQuantity) {
        quantity = offered.stockQuantity;
        problems.push(
          `Only ${offered.stockQuantity} ${kindLabel} of “${doc.title}” left; the quantity was reduced.`,
        );
      }
    } else {
      // A download is bought once; more than one of the same file is meaningless.
      quantity = 1;
    }

    lines.push({
      publicationId,
      edition,
      title: doc.title,
      slug: doc.slug,
      ...(doc.coverImage ? { coverImage: doc.coverImage } : {}),
      unitPrice: offered.price,
      quantity,
      lineTotal: offered.price * quantity,
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
