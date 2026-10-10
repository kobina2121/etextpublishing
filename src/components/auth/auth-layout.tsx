import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ShoppingBagIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { FieldSeparator } from "@/components/ui/field";

export type AuthPoint = { icon: LucideIcon; title: string; body: string };

/**
 * Shared frame for /login and /register: the form in a card on the right, a
 * short list of what an account is for on the left.
 *
 * On small screens the card comes first. Whoever opened a sign-in or sign-up
 * page has already decided why they are there; the explanation can follow.
 *
 * Without `aside`, the card stands alone and centred — for the password reset
 * pages, where there is nothing to sell.
 */
export function AuthLayout({
  title,
  description,
  cardTitle,
  cardDescription,
  aside,
  children,
}: {
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  aside?: { title: string; points: readonly AuthPoint[] };
  children: ReactNode;
}) {
  const card = (
    <div className="border border-border bg-card p-6 sm:p-8 lg:order-2">
      <h2 className="text-2xl">{cardTitle}</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{cardDescription}</p>
      {children}
    </div>
  );

  if (!aside) {
    return (
      <>
        <PageHero title={title} description={description} />
        <Section>
          <Container>
            <div className="mx-auto max-w-md">{card}</div>
          </Container>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHero title={title} description={description} />

      <Section>
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_28rem] lg:gap-16">
            {card}

            <div className="lg:order-1 lg:pt-4">
              <h2 className="text-3xl leading-tight sm:text-4xl">{aside.title}</h2>
              <ul className="mt-8 space-y-7">
                {aside.points.map(({ icon: Icon, title: pointTitle, body }) => (
                  <li key={pointTitle} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold">{pointTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Signing in is never required to buy, and both pages say so:
                  a sign-in wall in front of a basket loses sales. */}
              <div className="mt-10 flex gap-4 border-l-2 border-primary bg-muted/50 p-5">
                <ShoppingBagIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Just here to buy?</span> You can check out as a
                  guest — no account needed.{" "}
                  <Link href="/publications" className="font-medium underline underline-offset-4">
                    Browse publications
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/** The "or" between the form and Google. Its label paints over the rule, so it matches the card. */
export function AuthDivider() {
  return (
    <FieldSeparator className="my-8 *:data-[slot=field-separator-content]:bg-card">
      or
    </FieldSeparator>
  );
}

/** The line under the card that sends people to the other page. */
export function AuthSwitch({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="font-medium text-foreground underline underline-offset-4">
        {label}
      </Link>
    </p>
  );
}
