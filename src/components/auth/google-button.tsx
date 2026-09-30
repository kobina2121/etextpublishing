"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Google's mark, inline.
 *
 * Their brand guidelines require the four-colour G, so it cannot be tinted to
 * the site palette or swapped for a generic icon.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Starts the Google OAuth redirect.
 *
 * A client component because the flow begins with a browser navigation that
 * Auth.js builds. `callbackUrl` is passed straight through so a reader who was
 * sent here from a page returns to it.
 */
export function GoogleButton({
  callbackUrl = "/account",
  label = "Continue with Google",
  className,
}: {
  callbackUrl?: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="xl"
      disabled={pending}
      className={cn("w-full gap-3 font-semibold", className)}
      onClick={() => {
        setPending(true);
        // No await: this navigates away, and resetting state afterwards would
        // only ever run if the redirect failed.
        void signIn("google", { callbackUrl });
      }}
    >
      {pending ? <Spinner /> : <GoogleMark />}
      {pending ? "Redirecting…" : label}
    </Button>
  );
}
