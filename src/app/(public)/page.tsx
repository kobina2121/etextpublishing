import { Hero } from "@/components/public/hero";
import { SectionHeading } from "@/components/public/section-heading";
import { Steps, type Step } from "@/components/public/steps";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { siteConfig } from "@/lib/site-config";

/**
 * PLACEHOLDER COPY. Every string below is scaffolding that describes a generic
 * publishing workflow. None of it is supplied company information and all of it
 * is expected to be replaced, either by the client or from SiteSettings once
 * Phase 4 lands.
 */
const STEPS: Step[] = [
  {
    title: "Book a consultation",
    description:
      "Submitting a complete copy of your manuscript to a personal publishing consultant is the first step in the process.",
  },
  {
    title: "Editing and production",
    description:
      "Your book is edited, a cover is designed, and the interior pages are typeset and prepared for print.",
  },
  {
    title: "Promotion",
    description:
      "Each title receives a promotion campaign built around its audience, format and publication date.",
  },
  {
    title: "Distribution and shipping",
    description:
      "Our distribution team makes each title available to buy online and in store, and handles order fulfilment.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero
        title="Publish & Sell Your Book"
        titleAccent={`with ${siteConfig.name}`}
        subtitle={siteConfig.tagline}
        actions={[
          { label: "View services", href: "/services", variant: "outline" },
          { label: "Our publications", href: "/publications" },
        ]}
      />

      <Section size="lg">
        <Container>
          <SectionHeading
            title={`Become a published author with ${siteConfig.name}`}
            subtitle="A few straightforward steps"
          />
          <div className="mt-16">
            <Steps steps={STEPS} />
          </div>
        </Container>
      </Section>
    </>
  );
}
