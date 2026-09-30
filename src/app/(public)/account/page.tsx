import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo/metadata";
import { getOrdersForCustomer } from "@/server/queries";
import { PackageIcon } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Your account",
    description: "Your orders and downloads.",
    path: "/account",
    noIndex: true,
  });
}

const FULFILMENT_LABELS: Record<string, string> = {
  not_required: "No delivery needed",
  pending: "Being prepared",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};

/**
 * A reader's own orders.
 *
 * `requireUser` rather than `requireAdmin`: this is deliberately reachable by
 * anyone signed in. The proxy already redirected, but a page is reachable
 * without passing a matched route, so the session is re-checked here.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const orders = await getOrdersForCustomer({ userId: user.id, email: user.email });

  const downloads = orders.flatMap((order) =>
    order.items.filter((item) => !item.requiresShipping).map((item) => ({ ...item, order })),
  );

  return (
    <>
      <PageHero title="Your account" description={user.email} />

      <Section>
        <Container width="wide">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {user.role === "admin" ? (
                <Button asChild variant="outline" className="font-semibold tracking-[0.08em] uppercase">
                  <Link href="/admin">Dashboard</Link>
                </Button>
              ) : null}
              <SignOutButton />
            </div>
          </div>

          {downloads.length > 0 ? (
            <Alert className="mt-8">
              <AlertDescription>
                You have {downloads.length} purchased{" "}
                {downloads.length === 1 ? "download" : "downloads"}. File delivery is not
                switched on yet — email us and we will send {downloads.length === 1 ? "it" : "them"}{" "}
                over directly.
              </AlertDescription>
            </Alert>
          ) : null}

          <h2 className="mt-10 text-sm font-semibold tracking-[0.14em] uppercase">Orders</h2>

          {orders.length === 0 ? (
            <Empty className="mt-6 border border-dashed border-border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageIcon aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No orders yet</EmptyTitle>
                <EmptyDescription>
                  Anything you buy — signed in or as a guest with this address — appears here.
                </EmptyDescription>
              </EmptyHeader>
              <Button asChild variant="outline" className="mt-2">
                <Link href="/publications">Browse publications</Link>
              </Button>
            </Empty>
          ) : (
            <ul className="mt-6 space-y-5">
              {orders.map((order) => (
                <li key={order.reference} className="border border-border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm">{order.reference}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(order.placedAt, "d MMMM yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="tracking-wide uppercase">
                        {FULFILMENT_LABELS[order.fulfilment] ?? order.fulfilment}
                      </Badge>
                      <span className="font-semibold">
                        {formatMoney(order.total, order.currency)}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                    {order.items.map((item) => (
                      <li
                        key={item.slug + item.edition}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <span className="min-w-0">
                          <Link
                            href={`/publications/${item.slug}`}
                            className="hover:text-primary"
                          >
                            {item.title}
                          </Link>
                          <span className="text-muted-foreground">
                            {" "}
                            — {item.edition === "hardcopy" ? "Hardcopy" : "Softcopy"} ×{" "}
                            {item.quantity}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatMoney(item.unitPrice * item.quantity, order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
