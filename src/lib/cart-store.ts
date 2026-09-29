"use client";

import { useSyncExternalStore } from "react";

/**
 * The basket, kept in localStorage.
 *
 * Only publication ids and quantities are stored. Prices are never held here
 * and never sent — the server reprices the whole basket from the database at
 * checkout, so a tampered basket buys nothing but a corrected total.
 *
 * `useSyncExternalStore` rather than state plus an effect: it takes a separate
 * server snapshot, so the first render matches the server and there is no
 * hydration mismatch and no mounted flag.
 */

const KEY = "etx.cart.v1";
const EVENT = "etx:cart";

export type CartEntry = { publicationId: string; quantity: number };

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

export function addToCart(publicationId: string, quantity = 1) {
  const current = read();
  const existing = current.find((e) => e.publicationId === publicationId);
  const next = existing
    ? current.map((e) =>
        e.publicationId === publicationId
          ? { ...e, quantity: Math.min(20, e.quantity + quantity) }
          : e,
      )
    : [...current, { publicationId, quantity: Math.min(20, quantity) }];
  write(next);
}

export function setQuantity(publicationId: string, quantity: number) {
  const next = read()
    .map((e) => (e.publicationId === publicationId ? { ...e, quantity } : e))
    .filter((e) => e.quantity > 0);
  write(next);
}

export function removeFromCart(publicationId: string) {
  write(read().filter((e) => e.publicationId !== publicationId));
}

export function clearCart() {
  write([]);
}
