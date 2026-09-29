import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";

import { CartClient } from "./cart-client";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Basket",
    description: "The titles you have chosen.",
    path: "/cart",
    // A personal, transient page; there is nothing here worth indexing.
    noIndex: true,
  });
}

export default function CartPage() {
  return (
    <>
      <PageHero title="Your basket" description="Review your titles before checkout." />
      <Section>
        <Container width="wide">
          <CartClient />
        </Container>
      </Section>
    </>
  );
}
