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
    path: "/about",
  });
}

/** PLACEHOLDER COPY throughout — no company history has been supplied. */
const VALUES = [
  {
    title: "Authors first",
    body: "Placeholder copy. A statement of how the house works with its writers would sit here, covering rights, royalties and editorial independence.",
  },
  {
    title: "Careful editing",
    body: "Placeholder copy. A description of the editorial standard applied to every manuscript, and the people who apply it.",
  },
  {
    title: "Built to last",
    body: "Placeholder copy. A note on production values — paper, binding and design — and why they matter to a finished book.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero title={`About ${siteConfig.name}`} description={siteConfig.description} />

      <Section>
        <Container width="prose">
          <FadeIn>
            <div className="prose max-w-none dark:prose-invert">
              <p className="lead text-xl">
                Placeholder introduction. Two or three paragraphs of company history and editorial
                position would open this page.
              </p>
              <p>
                This copy exists so the page can be reviewed at a realistic length. It will be
                replaced with real material, either supplied directly or entered through the admin
                once site settings land.
              </p>
              <p>
                Nothing on this page should be read as a statement of fact about the company: no
                founding date, staff count or history has been invented.
              </p>
            </div>
          </FadeIn>
        </Container>
      </Section>

      <Section className="bg-muted/40">
        <Container>
          <SectionHeading title="How we work" subtitle="Three commitments" />
          <Stagger className="mt-14 grid gap-8 md:grid-cols-3">
            {VALUES.map((value) => (
              <StaggerItem key={value.title}>
                <div className="border-t border-border pt-6">
                  <h3 className="text-xl">{value.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{value.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
    </>
  );
}
