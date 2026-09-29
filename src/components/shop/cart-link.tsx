"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { useCartCount } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/**
 * Basket link with a count.
 *
 * The count renders as 0 on the server and on first paint, then corrects once
 * the store reads localStorage — `useSyncExternalStore` provides a separate
 * server snapshot for exactly this, so the markup matches and React does not
 * warn about hydration.
 */
export function CartLink({ inverted = false }: { inverted?: boolean }) {
  const count = useCartCount();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Basket, ${count} item${count === 1 ? "" : "s"}` : "Basket, empty"}
      className={cn(
        "relative inline-flex size-9 items-center justify-center transition-colors",
        inverted ? "text-white hover:text-primary-on-dark" : "text-foreground hover:text-primary",
      )}
    >
      <ShoppingBagIcon className="size-5" aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
