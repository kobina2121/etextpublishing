import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ArticleCard } from "@/components/public/article-card";
import { AuthorCard } from "@/components/public/author-card";
import { Hero } from "@/components/public/hero";
import { PublicationCard } from "@/components/public/publication-card";
import { SectionHeading } from "@/components/public/section-heading";
import { ServiceCard } from "@/components/public/service-card";
import { Steps, type Step } from "@/components/public/steps";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSiteMeta } from "@/lib/seo/site-meta";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import {
  getFeaturedAuthors,
  getFeaturedPublications,
  getLatestArticles,
  listServices,
} from "@/server/queries";

/**
 * PLACEHOLDER COPY. Every string below is scaffolding describing a generic
 * publishing workflow. None of it is supplied company information, and all of
 * it is expected to be replaced from SiteSettings once Phase 4 lands.
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

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/" });
}

export default async function HomePage() {
  const [publications, authors, articles, services, site] = await Promise.all([
    getFeaturedPublications(4),
    getFeaturedAuthors(3),
    getLatestArticles(2),
    listServices(),
    getSiteMeta(),
  ]);

  return (
    <>
      {/* Emitted once, on the home page: every other page's structured data
          references these two by @id rather than repeating them. */}
      <JsonLd data={organizationJsonLd(site)} />
      <JsonLd data={websiteJsonLd(site)} />

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

      <Section size="lg" className="bg-muted/40">
        <Container width="wide">
          <SectionHeading title="Featured titles" subtitle="Recently published" />
          <div className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {publications.map((publication, index) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                priority={index < 2}
              />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button
              asChild
              size="xl"
              variant="outline"
              className="font-semibold tracking-[0.1em] uppercase"
            >
              <Link href="/publications">Browse all publications</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <Section size="lg">
        <Container width="wide">
          <SectionHeading title="What we do" subtitle="Textbooks and story books" />
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service) => (
              <StaggerItem key={service.id}>
                <ServiceCard service={service} />
              </StaggerItem>
            ))}
          </Stagger>
          {/* The grid is capped at six so the rows stay even; without this link
              any service beyond the sixth would be unreachable from here. */}
          <div className="mt-12 text-center">
            <Button
              asChild
              size="xl"
              variant="outline"
              className="font-semibold tracking-[0.1em] uppercase"
            >
              <Link href="/services">All services</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <Section size="lg" className="bg-muted/40">
        <Container width="wide">
          <SectionHeading title="Our authors" subtitle="The writers we publish" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        </Container>
      </Section>

      <Section size="lg">
        <Container>
          <SectionHeading title="Latest news" subtitle="From the editorial desk" />
          <div className="mt-14 space-y-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button
              asChild
              size="xl"
              variant="outline"
              className="font-semibold tracking-[0.1em] uppercase"
            >
              <Link href="/news">All news</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <Section size="lg" className="bg-foreground text-background">
        <Container>
          <div className="flex flex-col items-start gap-6 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl">Ready to send us your manuscript?</h2>
              <p className="mt-3 text-lg text-background/75">
                Submissions are read by a publishing consultant, not a queue.
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
