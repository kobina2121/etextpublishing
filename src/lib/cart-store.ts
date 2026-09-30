"use client";

import { useSyncExternalStore } from "react";

/**
 * The basket, kept in localStorage.
 *
 * Only publication ids, the chosen edition and quantities are stored. Prices
 * are never held here and never sent — the server reprices the whole basket
 * from the database at checkout, so a tampered basket buys nothing but a
 * corrected total.
 *
 * A line is identified by title *and* edition, so the same book can sit in the
 * basket as both a hardcopy and a download.
 *
 * `useSyncExternalStore` rather than state plus an effect: it takes a separate
 * server snapshot, so the first render matches the server and there is no
 * hydration mismatch and no mounted flag.
 */

// v2: entries gained an `edition`. A v1 entry has no edition and cannot be
// priced, so the old key is abandoned rather than migrated — a stale basket is
// not worth guessing a binding for.
const KEY = "etx.cart.v2";
const EVENT = "etx:cart";

export type EditionKind = "hardcopy" | "softcopy";
export type CartEntry = { publicationId: string; edition: EditionKind; quantity: number };

function isEditionKind(value: unknown): value is EditionKind {
  return value === "hardcopy" || value === "softcopy";
}

/** Stable identity for a basket line. Mirrors the server's key. */
export function lineKey(publicationId: string, edition: EditionKind): string {
  return `${publicationId}:${edition}`;
}

const EMPTY: CartEntry[] = [];

/**
 * getSnapshot must return a stable reference for unchanged data, or React
 * re-renders forever. The parsed value is cached against the raw string.
 */
let cachedRaw: string | null = null;
let cachedValue: CartEntry[] = EMPTY;

function read(): CartEntry[] {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private browsing, or storage disabled. An empty basket is the safe answer.
    return EMPTY;
  }

  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = EMPTY;
    return cachedValue;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedValue = Array.isArray(parsed)
      ? parsed.filter(
          (e): e is CartEntry =>
            typeof e === "object" &&
            e !== null &&
            typeof (e as CartEntry).publicationId === "string" &&
            isEditionKind((e as CartEntry).edition) &&
            Number.isFinite((e as CartEntry).quantity),
        )
      : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function write(entries: CartEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Nothing useful to do; the basket simply will not persist.
  }
  // Same-tab listeners: the storage event only fires in *other* tabs.
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useCart(): CartEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  const cart = useCart();
  return cart.reduce((sum, entry) => sum + entry.quantity, 0);
}

export function addToCart(publicationId: string, edition: EditionKind, quantity = 1) {
  const current = read();
  const key = lineKey(publicationId, edition);
  const existing = current.find((e) => lineKey(e.publicationId, e.edition) === key);
  const next = existing
    ? current.map((e) =>
        lineKey(e.publicationId, e.edition) === key
          ? { ...e, quantity: Math.min(20, e.quantity + quantity) }
          : e,
      )
    : [...current, { publicationId, edition, quantity: Math.min(20, quantity) }];
  write(next);
}

export function setQuantity(publicationId: string, edition: EditionKind, quantity: number) {
  const key = lineKey(publicationId, edition);
  const next = read()
    .map((e) => (lineKey(e.publicationId, e.edition) === key ? { ...e, quantity } : e))
    .filter((e) => e.quantity > 0);
  write(next);
}

export function removeFromCart(publicationId: string, edition: EditionKind) {
  const key = lineKey(publicationId, edition);
  write(read().filter((e) => lineKey(e.publicationId, e.edition) !== key));
}

export function clearCart() {
  write([]);
}
