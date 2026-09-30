"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCart, type EditionKind } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type EditionOption = {
  kind: EditionKind;
  label: string;
  /** Integer minor units. */
  price: number;
  /** Printed copies left. Omitted for a download, which cannot run out. */
  stockQuantity?: number;
};

/**
 * Choose an edition, then add it to the basket.
 *
 * Native radios behind styled labels rather than a hand-rolled listbox: arrow
 * keys, focus order and the "one of a group" announcement all come free, and
 * a bespoke `role="radio"` widget would have to reimplement each of them.
 *
 * The picker disappears when only one edition is for sale — a choice of one is
 * not a choice, and showing it implies the other exists.
 *
 * Nothing here is trusted. The chosen edition is a hint stored beside the id;
 * the server reprices the basket from the database and decides for itself what
 * each line costs and whether it ships.
 */
export function EditionChoice({
  publicationId,
  title,
  currency,
  options,
  size = "default",
  className,
}: {
  publicationId: string;
  title: string;
  currency: string;
  /** Only editions that can actually be bought right now. */
  options: EditionOption[];
  size?: "default" | "xl";
  className?: string;
}) {
  const router = useRouter();
  const groupName = useId();
  const [selected, setSelected] = useState<EditionKind | null>(options[0]?.kind ?? null);
  const [added, setAdded] = useState(false);

  if (options.length === 0) {
    return (
      <Button type="button" size={size} disabled className={cn("w-full", className)}>
        Not currently for sale
      </Button>
    );
  }

  const chosen = options.find((option) => option.kind === selected) ?? options[0]!;
  const lowStock =
    chosen.stockQuantity !== undefined && chosen.stockQuantity > 0 && chosen.stockQuantity <= 5;

  return (
    <div className={cn("space-y-3", className)}>
      {options.length > 1 ? (
        <fieldset>
          <legend className="sr-only">Choose an edition of {title}</legend>
          <div className="flex gap-2">
            {options.map((option) => {
              const isSelected = option.kind === chosen.kind;
              return (
                <label
                  key={option.kind}
                  className={cn(
                    "flex-1 cursor-pointer border px-3 py-2 text-left transition-colors",
                    "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40",
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={option.kind}
                    checked={isSelected}
                    onChange={() => setSelected(option.kind)}
                    className="sr-only"
                  />
                  <span className="block text-[0.7rem] font-semibold tracking-[0.08em] uppercase">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-sm tabular-nums",
                      isSelected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(option.price, currency)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {lowStock ? (
        <p className="text-xs text-muted-foreground">
          Only {chosen.stockQuantity} left in print.
        </p>
      ) : null}

      <Button
        type="button"
        size={size}
        className="w-full font-semibold tracking-[0.08em] uppercase"
        onClick={() => {
          addToCart(publicationId, chosen.kind);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1800);
          toast.success(`“${title}” (${chosen.label.toLowerCase()}) added to your basket.`, {
            action: { label: "View basket", onClick: () => router.push("/cart") },
          });
        }}
      >
        {added ? <CheckIcon aria-hidden /> : <ShoppingBagIcon aria-hidden />}
        {added ? "Added" : "Add to basket"}
      </Button>
    </div>
  );
}
