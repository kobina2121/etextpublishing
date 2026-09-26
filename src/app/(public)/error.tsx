"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the server log in development and in the platform's logs in
    // production. Replaced by real error reporting before launch.
    console.error(error);
  }, [error]);

  return (
    <Section className="pt-36">
      <Container width="prose">
        <div className="flex flex-col items-start gap-6">
          <TriangleAlertIcon className="size-10 text-primary" aria-hidden />
          <h1 className="text-4xl">Something went wrong</h1>
          <p className="text-lg text-muted-foreground">
            This page could not be loaded. Trying again often resolves it.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset} size="xl" className="font-heading tracking-[0.1em] uppercase">
              Try again
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="font-heading tracking-[0.1em] uppercase"
            >
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
