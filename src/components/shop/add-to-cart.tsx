"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/**
 * Adds a title to the basket.
 *
 * Optimistic by nature — nothing is reserved and no price is fixed until
 * checkout, where the server reprices everything. The confirmation is
 * deliberately brief so it does not read as "this is now yours".
 */
export function AddToCart({
  publicationId,
  title,
  disabled = false,
  size = "default",
  className,
}: {
  publicationId: string;
  title: string;
  disabled?: boolean;
  size?: "default" | "xl";
  className?: string;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  return (
    <Button
      type="button"
      size={size}
      disabled={disabled}
      className={cn("font-semibold tracking-[0.08em] uppercase", className)}
      onClick={() => {
        addToCart(publicationId);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
        toast.success(`“${title}” added to your basket.`, {
          action: { label: "View basket", onClick: () => router.push("/cart") },
        });
      }}
    >
      {added ? <CheckIcon aria-hidden /> : <ShoppingBagIcon aria-hidden />}
      {added ? "Added" : "Add to basket"}
    </Button>
  );
}
