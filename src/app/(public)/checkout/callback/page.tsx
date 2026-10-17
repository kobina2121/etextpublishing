import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, ClockIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";

import { buildMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { DownloadList } from "@/components/shop/download-list";
import { getOrderDownloads } from "@/server/downloads";
import { settleOrder } from "@/server/payments/fulfil";

import { ClearCart } from "./clear-cart";
import { RefreshWhileProcessing } from "./refresh-while-processing";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Order", path: "/checkout/callback", noIndex: true });
}

/**
 * Where Paystack sends the buyer back to.
 *
 * This settles the order as well as the webhook does, because the two cover
 * different failures: a buyer may close the tab before returning, and a webhook
 * may be delayed. Both call the same function, which asks Paystack what really
 * happened and is safe to run twice.
 *
 * The reference in the URL is attacker-controlled, so nothing here trusts it
 * beyond using it to look an order up — the payment itself is confirmed with
 * Paystack.
 */
export default async function CheckoutCallbackPage({
  searchParams,
}: PageProps<"/checkout/callback">) {
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : "";

  const settled = reference ? await settleOrder(reference) : null;
  const paid =
    settled?.ok === true && (settled.status === "paid" || settled.status === "already-paid");
  const unpaid = settled?.ok === true && settled.status === "unpaid";
  const processing = settled?.ok === true && settled.status === "processing";
  // The reference came back from Paystack and the order is now confirmed paid,
  // so its softcopies can be offered straight away.
  const downloads = paid ? await getOrderDownloads(reference) : null;

  return (
    <Section className="pt-36">
      <Container width="prose">
        {paid ? (
          <div className="flex flex-col items-start gap-5">
            <ClearCart />
            <CheckCircle2Icon className="size-12 text-primary" aria-hidden />
            <h1 className="text-4xl">Thank you — your order is confirmed</h1>
            <p className="text-lg text-muted-foreground">
              We have your payment and a confirmation is on its way by email. Anything printed will
              be posted to the address you gave.
            </p>
            <p className="font-mono text-xs text-muted-foreground">Reference: {reference}</p>
            {downloads && downloads.length > 0 ? (
              <div className="w-full">
                <h2 className="mb-3 text-sm font-semibold tracking-[0.14em] uppercase">
                  Your downloads
                </h2>
                <DownloadList items={downloads} />
                <p className="mt-3 text-sm text-muted-foreground">
                  We have also emailed you a link, so you can download them again later.
                </p>
              </div>
            ) : null}
            <Button asChild size="xl" className="font-semibold tracking-[0.1em] uppercase">
              <Link href="/publications">Continue browsing</Link>
            </Button>
          </div>
        ) : processing ? (
          <div className="flex flex-col items-start gap-5" role="status">
            <RefreshWhileProcessing />
            <LoaderCircleIcon className="size-12 animate-spin text-primary" aria-hidden />
            <h1 className="text-4xl">We are confirming your payment</h1>
            <p className="text-lg text-muted-foreground">
              If you paid with mobile money, approve the prompt on your phone. This page updates by
              itself as soon as the payment goes through.
            </p>
            <p className="text-sm font-medium">
              Please do not pay again — your order is saved, and you will not be charged twice.
            </p>
            <p className="font-mono text-xs text-muted-foreground">Reference: {reference}</p>
          </div>
        ) : unpaid ? (
          <div className="flex flex-col items-start gap-5">
            <ClockIcon className="size-12 text-muted-foreground" aria-hidden />
            <h1 className="text-4xl">That payment did not complete</h1>
            <p className="text-lg text-muted-foreground">
              Nothing has been charged and your basket is untouched, so you can try again whenever
              you are ready.
            </p>
            <Button asChild size="xl" className="font-semibold tracking-[0.1em] uppercase">
              <Link href="/cart">Back to your basket</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-5">
            <TriangleAlertIcon className="size-12 text-destructive" aria-hidden />
            <h1 className="text-4xl">We could not confirm that order</h1>
            <p className="text-lg text-muted-foreground">
              {settled && !settled.ok
                ? settled.error
                : "No payment reference was supplied, so there is nothing to look up."}
            </p>
            <p className="text-sm text-muted-foreground">
              If you were charged, do not pay again — contact us with the reference and we will sort
              it out.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="xl" className="font-semibold tracking-[0.1em] uppercase">
                <Link href="/contact">Contact us</Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="font-semibold tracking-[0.1em] uppercase"
              >
                <Link href="/cart">Back to your basket</Link>
              </Button>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
