import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * Wordmark. PLACEHOLDER: the icon stands in for a real logo asset, and the
 * name comes from siteConfig until the client supplies brand artwork.
 */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-3", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      <BookOpenIcon
        className={cn("size-8 shrink-0", inverted ? "text-white" : "text-primary")}
        strokeWidth={1.5}
        aria-hidden
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-xl font-medium font-semibold tracking-[0.12em] uppercase",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          {siteConfig.name}
        </span>
        <span
          className={cn(
            "mt-1 text-[0.7rem] tracking-wide",
            inverted ? "text-white/70" : "text-muted-foreground",
          )}
        >
          Publishing Company
        </span>
      </span>
    </Link>
  );
}
