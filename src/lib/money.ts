/**
 * Money is handled as integer minor units throughout — pesewas for GHS, kobo
 * for NGN, cents for USD. Nothing in this codebase stores a decimal amount.
 *
 * Floating point cannot represent 0.1 exactly, so a decimal subtotal drifts as
 * soon as real orders are summed. Integers cannot drift. Paystack expects
 * subunits anyway, so this also removes a conversion at the boundary.
 */

/** Currencies Paystack settles, with their subunit factor. */
const SUBUNIT_FACTOR: Record<string, number> = {
  GHS: 100,
  NGN: 100,
  ZAR: 100,
  KES: 100,
  USD: 100,
};

export const DEFAULT_CURRENCY = "GHS";

export function subunitFactor(currency: string): number {
  return SUBUNIT_FACTOR[currency.toUpperCase()] ?? 100;
}

/** Major units (what a person types) to minor units (what we store). */
export function toMinorUnits(amount: number, currency = DEFAULT_CURRENCY): number {
  return Math.round(amount * subunitFactor(currency));
}

/** Minor units back to major, for display and for prefilling an admin form. */
export function toMajorUnits(minor: number, currency = DEFAULT_CURRENCY): number {
  return minor / subunitFactor(currency);
}

/**
 * Formats an amount for display.
 *
 * Falls back to a plain prefix when the runtime has no data for the currency,
 * rather than throwing inside a product card.
 */
export function formatMoney(minor: number, currency = DEFAULT_CURRENCY, locale = "en-GH"): string {
  const major = toMajorUnits(minor, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

/** Physical formats need an address and consume stock; digital ones do not. */
export function formatRequiresShipping(format: string): boolean {
  return format === "paperback" || format === "hardcover";
}
