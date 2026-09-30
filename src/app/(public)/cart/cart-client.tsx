"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { BookCover } from "@/components/public/book-cover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart, removeFromCart, setQuantity, lineKey } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import type { PricedCart } from "@/server/cart";

/**
 * The basket.
 *
 * Every price shown here is returned by the server for the current basket, not
 * computed in the browser. If a title is repriced, withdrawn or runs out
 * between adding and viewing, the buyer is told here rather than at the payment
 * screen.
 */
export function CartClient() {
  const cart = useCart();
  const [priced, setPriced] = useState<PricedCart | null>(null);

  // Derived rather than stored: setting a loading flag synchronously inside the
  // effect is the pattern the React compiler lint rejects, and the only thing
  // it would tell us is "no prices yet", which `priced === null` already says.
  const loading = priced === null;

  useEffect(() => {
    // The render returns the empty view before it reads `loading`, so an empty
    // basket needs no state change here at all.
    if (cart.length === 0) return;

    let cancelled = false;

    void fetch("/api/cart/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cart),
    })
      .then((r) => r.json() as Promise<PricedCart>)
      .then((data) => {
        if (!cancelled) setPriced(data);
      })
      .catch(() => {
        if (!cancelled)
          setPriced({
            lines: [],
            total: 0,
            currency: "GHS",
            requiresShipping: false,
            problems: [],
          });
      });

    return () => {
      cancelled = true;
    };
  }, [cart]);

  if (cart.length === 0) {
    return (
      <Empty className="border border-dashed border-border py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trash2Icon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Your basket is empty</EmptyTitle>
          <EmptyDescription>Titles you add will appear here.</EmptyDescription>
        </EmptyHeader>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/publications">Browse publications</Link>
        </Button>
      </Empty>
    );
  }

  if (loading && !priced) {
    return (
      <div className="space-y-4">
        {cart.map((entry) => (
          <Skeleton key={lineKey(entry.publicationId, entry.edition)} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!priced || priced.lines.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Nothing in your basket is currently available to buy.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {priced.problems.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-inside list-disc space-y-1">
                {priced.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <ul className="divide-y divide-border">
          {priced.lines.map((line) => (
            <li key={lineKey(line.publicationId, line.edition)} className="flex gap-4 py-5">
              <Link href={`/publications/${line.slug}`} className="w-16 shrink-0">
                <BookCover title={line.title} src={line.coverImage} sizes="64px" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/publications/${line.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {line.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {line.edition === "hardcopy" ? "Hardcopy · posted" : "Softcopy · download"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(line.unitPrice, priced.currency)} each
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {line.requiresShipping ? (
                    <div className="flex items-center border border-border">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Reduce quantity"
                        onClick={() =>
                          setQuantity(line.publicationId, line.edition, line.quantity - 1)
                        }
                      >
                        <MinusIcon aria-hidden />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(line.publicationId, line.edition, line.quantity + 1)
                        }
                      >
                        <PlusIcon aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Single download</span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(line.publicationId, line.edition)}
                  >
                    <Trash2Icon aria-hidden />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="shrink-0 text-right font-medium">
                {formatMoney(line.lineTotal, priced.currency)}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit border border-border p-6">
        <h2 className="font-semibold tracking-[0.14em] uppercase">Summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items</dt>
            <dd>{priced.lines.reduce((n, l) => n + l.quantity, 0)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(priced.total, priced.currency)}</dd>
          </div>
        </dl>

        {priced.requiresShipping ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Your basket includes printed titles, so a delivery address is needed at checkout.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Downloads only — no delivery address needed.
          </p>
        )}

        <Button asChild size="xl" className="mt-6 w-full font-semibold tracking-[0.1em] uppercase">
          <Link href="/checkout">Checkout</Link>
        </Button>
      </aside>
    </div>
  );
}
