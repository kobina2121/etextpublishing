import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format as formatDate } from "date-fns";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { BookCover } from "@/components/public/book-cover";
import { PublicationCard } from "@/components/public/publication-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getPublicationBySlug,
  getPublicationSlugs,
  getRelatedPublications,
} from "@/server/queries";

const FORMAT_LABELS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "E-book",
  audiobook: "Audiobook",
};

/**
 * Prerendered from a build-time slug list, with unknown slugs rejected by the
 * router rather than by notFound().
 *
 * Next cannot send a 404 once a streamed response has flushed its headers, so
 * notFound() inside an async page degrades to a soft 404 with a 200 status
 * (vercel/next.js#76474, #93239). Letting dynamicParams reject the slug keeps
 * the status honest, and drops drafts and unpublished titles to a real 404.
 *
 * Trade-off: newly published content needs the slug list rebuilding. Phase 4
 * wires a publish-time revalidation hook. If instant publishing ever matters
 * more than the status code, set dynamicParams back to true.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getPublicationSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/publications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const publication = await getPublicationBySlug(slug);
  // Called here, not only in the page: generateMetadata resolves before the
  // streamed shell is flushed, so this is the last point at which Next can
  // still send a real 404 status rather than a soft 404 with a 200.
  if (!publication) notFound();

  return {
    title: publication.title,
    description: publication.excerpt,
    openGraph: {
      title: publication.title,
      description: publication.excerpt,
      type: "book",
    },
  };
}

export default async function PublicationDetailPage({ params }: PageProps<"/publications/[slug]">) {
  const { slug } = await params;
  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();

  const related = await getRelatedPublications(publication);

  const details = [
    { label: "Author", value: publication.author.name },
    { label: "Category", value: publication.category.name },
    { label: "Format", value: FORMAT_LABELS[publication.format] ?? publication.format },
    { label: "Pages", value: String(publication.pages) },
    { label: "Published", value: formatDate(publication.publicationDate, "d MMMM yyyy") },
    { label: "ISBN", value: publication.isbn },
  ];

  return (
    <Section className="pt-32 sm:pt-36">
      <Container width="wide">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/publications">Publications</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{publication.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-10 grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-16">
          <div>
            <BookCover
              title={publication.title}
              src={publication.coverImage}
              priority
              sizes="(min-width: 1024px) 22rem, 80vw"
            />
          </div>

          <div>
            <p className="font-heading text-xs tracking-[0.14em] text-primary uppercase">
              {publication.category.name}
            </p>
            <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{publication.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              by{" "}
              <Link
                href={`/authors/${publication.author.slug}`}
                className="underline underline-offset-4 hover:text-primary"
              >
                {publication.author.name}
              </Link>
            </p>

            {publication.featured ? (
              <Badge className="mt-4 tracking-[0.1em] uppercase">Featured title</Badge>
            ) : null}

            <p className="mt-8 text-lg leading-relaxed">{publication.description}</p>

            <Separator className="my-8" />

            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="font-heading text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {detail.label}
                  </dt>
                  <dd className="mt-1">{detail.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="xl" className="font-heading tracking-[0.1em] uppercase">
                <Link href="/contact">Enquire about this title</Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="font-heading tracking-[0.1em] uppercase"
              >
                <Link href={`/authors/${publication.author.slug}`}>About the author</Link>
              </Button>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <div className="mt-24">
            <h2 className="text-2xl">More in {publication.category.name}</h2>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <PublicationCard key={item.id} publication={item} />
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
