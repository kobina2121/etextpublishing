import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/public/page-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { HeadingText } from "@/components/ui/heading-text";
import { toParagraphs } from "@/lib/about-defaults";
import { getAboutPage } from "@/server/about";

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutPage();
  return buildMetadata({
    title: "About",
    description: about.heroDescription,
    path: "/about",
    ...(about.heroImage ? { image: about.heroImage } : {}),
  });
}

/**
 * The About page. Its words are edited from /admin/about; until they are first
 * saved, it shows the copy it shipped with (lib/about-defaults.ts).
 *
 * The intro is plain text — a blank line starts a paragraph — rendered as text
 * nodes, never as HTML, so nothing typed in the admin can inject markup.
 *
 * Every paragraph is the same size on purpose: the site's pattern is a larger
 * intro above the prose block (the banner description here) and a flat 16px
 * inside it.
 */
export default async function AboutPage() {
  const about = await getAboutPage();

  return (
    <>
      <PageHero
        title={about.heroTitle}
        description={about.heroDescription}
        {...(about.heroImage ? { image: about.heroImage } : {})}
      />

      <Section>
        <Container width="prose">
          <FadeIn>
            <div className="prose max-w-none dark:prose-invert">
              {toParagraphs(about.intro).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </FadeIn>
        </Container>
      </Section>

      {about.pillars.length > 0 ? (
        <Section className="bg-muted/40">
          <Container>
            <SectionHeading
              title={about.sectionTitle}
              {...(about.sectionSubtitle ? { subtitle: about.sectionSubtitle } : {})}
            />
            <Stagger
              className={`mt-14 grid gap-8 ${about.pillars.length % 3 === 0 || about.pillars.length > 4 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
            >
              {about.pillars.map((pillar, index) => (
                <StaggerItem key={index}>
                  <div className="border-t border-border pt-6">
                    <h3 className="text-xl">
                      <HeadingText>{pillar.title}</HeadingText>
                    </h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{pillar.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
