import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";

import { CheckoutClient } from "./checkout-client";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Checkout",
    path: "/checkout",
    noIndex: true,
  });
}

export default function CheckoutPage() {
  return (
    <>
      <PageHero title="Checkout" description="Your details, then payment." />
      <Section>
        <Container width="wide">
          <CheckoutClient />
        </Container>
      </Section>
    </>
  );
}
