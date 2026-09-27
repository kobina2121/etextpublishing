import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { ServiceCard } from "@/components/public/service-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { listServices } from "@/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Services",
    description: "Textbook and story book publishing services.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <>
      <PageHero
        title="Services"
        description="Textbook and story book publishing, from writing and review through to layout, illustration and quality assurance."
      />

      <Section>
        <Container width="wide">
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <StaggerItem key={service.id}>
                <ServiceCard service={service} />
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-20 flex flex-col items-start gap-6 bg-foreground p-10 text-background sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl">Have a manuscript ready?</h2>
              <p className="mt-2 text-background/75">
                Send it to us and a publishing consultant will read it.
              </p>
            </div>
            <Button asChild size="xl" className="font-semibold tracking-[0.1em] uppercase">
              <Link href="/submit">Submit a manuscript</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
