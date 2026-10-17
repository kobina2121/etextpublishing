import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { DownloadList } from "@/components/shop/download-list";
import { verifyDownload } from "@/lib/downloads";
import { getOrderDownloads } from "@/server/downloads";

export const metadata: Metadata = {
  title: "Your downloads",
  // A private page reached by a signed link; nothing here is for search engines.
  robots: { index: false, follow: false },
};

/**
 * An order's softcopies, reached by the signed link on the confirmation page,
 * in the confirmation email, or on the buyer's account. A wrong or missing
 * signature is a plain 404 — it does not confirm the order exists.
 */
export default async function DownloadsPage({
  params,
  searchParams,
}: PageProps<"/downloads/[reference]">) {
  const { reference } = await params;
  const { t } = await searchParams;
  if (!verifyDownload(reference, typeof t === "string" ? t : null)) notFound();

  const items = await getOrderDownloads(reference);
  if (!items) notFound();

  return (
    <Section className="pt-32 sm:pt-36">
      <Container width="prose">
        <p className="font-mono text-xs text-muted-foreground">Order {reference}</p>
        <h1 className="mt-2 text-4xl">Your downloads</h1>
        {items.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            This order has no softcopies — anything printed is posted to you.
          </p>
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">
              Keep this page&apos;s link: it is how you download your softcopies again later.
            </p>
            <div className="mt-8">
              <DownloadList items={items} />
            </div>
          </>
        )}
        <p className="mt-10 text-sm text-muted-foreground">
          Trouble downloading?{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Contact us
          </Link>{" "}
          with your order reference.
        </p>
      </Container>
    </Section>
  );
}
