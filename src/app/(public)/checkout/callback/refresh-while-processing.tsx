"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-checks the order every few seconds while a payment is still in flight,
 * so the page turns into the confirmation by itself once the buyer approves a
 * mobile money prompt — rather than leaving them to wonder, and pay again.
 *
 * Gives up after a few minutes; by then the webhook will settle the order and
 * it appears on their account either way.
 */
export function RefreshWhileProcessing({ intervalMs = 5000, maxTries = 36 }) {
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > maxTries) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs, maxTries]);

  return null;
}
