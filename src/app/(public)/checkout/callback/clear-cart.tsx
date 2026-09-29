"use client";

import { useEffect } from "react";

import { clearCart } from "@/lib/cart-store";

/**
 * Empties the basket once an order is confirmed paid.
 *
 * Client-side because the basket lives in localStorage, and only rendered on
 * the success branch — a failed or pending payment must leave the basket alone
 * so the buyer can try again.
 */
export function ClearCart() {
  useEffect(() => {
    clearCart();
  }, []);

  return null;
}
