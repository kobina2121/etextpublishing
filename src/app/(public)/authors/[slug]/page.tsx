import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { PublicationCard } from "@/components/public/publication-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { getAuthorBySlug, getAuthorSlugs, getPublicationsByAuthor } from "@/server/queries";

/**
 * Known slugs are prerendered at build time; anything else renders on demand.
 *
 * Phase 6 changed this from `dynamicParams = false`. That setting gave unknown
 * slugs a true 404, but it also meant a title published from the admin stayed a
 * 404 until the next deploy — a CMS where publishing does not publish. Admin
 * writes now call revalidatePath, so new and edited content appears at once.
 *
 * The cost is that an unknown slug answers 200 with not-found content: Next
 * cannot set a 404 once a streamed response has flushed its headers
 * (vercel/next.js#76474). That affects only URLs that never existed, which is
 * the lesser problem of the two.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAuthorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/authors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  // See the note on the publication detail page: this must happen before the
  // streamed shell flushes, or the 404 degrades to a soft 404.
  if (!author) notFound();

  return buildMetadata({
    title: author.name,
    description: author.bio.slice(0, 160),
    path: `/authors/${author.slug}`,
    type: "profile",
    ...(author.photo ? { image: author.photo } : {}),
  });
}

export default async function AuthorDetailPage({ params }: PageProps<"/authors/[slug]">) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const titles = await getPublicationsByAuthor(author.id);

  const initials = author.name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Section className="pt-32 sm:pt-36">
      <JsonLd data={personJsonLd(author)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Authors", path: "/authors" },
          { name: author.name, path: `/authors/${author.slug}` },
        ])}
      />
      <Container width="wide">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/authors">Authors</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{author.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
          <div>
            {author.photo ? (
              <Image
                src={author.photo}
                alt={author.name}
                width={256}
                height={256}
                className="size-64 w-full max-w-64 object-cover"
              />
            ) : (
              <Avatar className="size-64 w-full max-w-64 rounded-none">
                <AvatarFallback className="rounded-none font-heading text-6xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div>
            {author.role ? (
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                {author.role}
              </p>
            ) : null}
            <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{author.name}</h1>
            <p className="mt-6 text-lg leading-relaxed">{author.bio}</p>

            {author.socials && author.socials.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {author.socials.map((social) => (
                  <Button key={social.href} asChild variant="outline" size="sm">
                    <a href={social.href} target="_blank" rel="noopener noreferrer">
                      {social.label}
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-2xl">
            {titles.length > 0 ? `Titles by ${author.name}` : "No published titles yet"}
          </h2>
          {titles.length > 0 ? (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {titles.map((publication) => (
                <PublicationCard key={publication.id} publication={publication} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">
              Titles by this author will appear here once published.{" "}
              <Link
                href="/publications"
                className="underline underline-offset-4 hover:text-primary"
              >
                Browse all publications
              </Link>
              .
            </p>
          )}
        </div>
      </Container>
    </Section>
  );
}
