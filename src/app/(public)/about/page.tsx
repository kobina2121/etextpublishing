import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "About",
    description:
      "A publishing house established to build the capacity of existing publishing houses in Ghana, bridging the gap between academia and industry.",
    path: "/about",
  });
}

/**
 * Drawn from the supplied description — nothing here is invented.
 *
 * "Capacity building" and "bridging academia and industry" are the mandate as
 * stated; the third is the stated means of delivering it. The wording is
 * condensed, not embellished: no claims about scale, history or results have
 * been added.
 */
const PILLARS = [
  {
    title: "Capacity building",
    body: "Building the capacity of publishing houses already working in Ghana, rather than competing with them.",
  },
  {
    title: "Academia and industry",
    body: "Bridging the gap between the two, so that what is researched reaches the people who can use it.",
  },
  {
    title: "Applied research",
    body: "Research findings put to work against real industry problems through seminars, workshops and training.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title={`About ${siteConfig.name}`}
        description="Building the capacity of Ghana's publishing houses, and bridging academia and industry."
      />

      <Section>
        <Container width="prose">
          <FadeIn>
            {/*
              Supplied copy. Punctuation has been added to the list of
              adjectives and the company name capitalised to match the logo;
              the wording is otherwise untouched.

              Every paragraph is the same size on purpose. The opening one used
              a `lead` at 20px against 16px for the rest, which put a visible
              step in the middle of one continuous passage. The site's pattern
              is a larger intro *above* the prose block — the banner
              description here, the excerpt on an article — and a flat 16px
              inside it.
            */}
            <div className="prose max-w-none dark:prose-invert">
              <p>
                {siteConfig.name} is a young, vibrant, evolving, unprecedented publishing house,
                established to build the capacity of existing publishing houses in Ghana.
              </p>
              <p>Our mandate is to bridge the gap between academia and industry.</p>
              <p>
                Research findings are used to solve industry problems by way of seminars, workshops
                and training.
              </p>
            </div>
          </FadeIn>
        </Container>
      </Section>

      <Section className="bg-muted/40">
        <Container>
          <SectionHeading title="What we do" subtitle="Three commitments" />
          <Stagger className="mt-14 grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div className="border-t border-border pt-6">
                  <h3 className="text-xl">{pillar.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{pillar.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
    </>
  );
}
