"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type State = "working" | "ok" | "failed";

/**
 * Exchanges a sign-in token for a session.
 *
 * Done from the client because `signIn` must set the session cookie in the
 * browser. The token arrives in the URL, so it is consumed immediately and the
 * query string is stripped from history — a sign-in link sitting in the address
 * bar can leak through the Referer header or a shared screen.
 */
export function VerifyClient({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const started = useRef(false);

  useEffect(() => {
    // Guards against React running effects twice in development, which would
    // spend the single-use token on the first pass and fail on the second.
    if (started.current) return;
    started.current = true;

    void (async () => {
      const result = await signIn("magic-link", { token, redirect: false });

      window.history.replaceState(null, "", "/admin/verify");

      if (result?.error || !result?.ok) {
        setState("failed");
        return;
      }

      setState("ok");
      router.replace("/admin");
      router.refresh();
    })();
  }, [token, router]);

  if (state === "working") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner className="size-6" />
        <p className="text-sm">Signing you in…</p>
      </div>
    );
  }

  if (state === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckIcon className="size-8 text-primary" aria-hidden />
        <p className="text-sm">Signed in. Taking you to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <TriangleAlertIcon className="size-8 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">That link did not work</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-in links work once and expire after 15 minutes. Request a new one.
        </p>
      </div>
      <Button asChild>
        <Link href="/admin/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
