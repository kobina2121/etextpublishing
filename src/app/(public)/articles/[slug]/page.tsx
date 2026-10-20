import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, ArrowUpRightIcon, BookOpenTextIcon, DownloadIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeadingText } from "@/components/ui/heading-text";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, scholarMeta, scholarlyArticleJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSiteMeta } from "@/lib/seo/site-meta";
import { getJournalBySlug, volumeIssue } from "@/server/journals";

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const journal = await getJournalBySlug(slug);
  // Before the shell flushes, so an unknown slug gets a real 404.
  if (!journal) notFound();
  return buildMetadata({
    title: journal.title,
    description: journal.abstract.slice(0, 160),
    path: `/articles/${journal.slug}`,
    type: "article",
    publishedTime: journal.publishedAt,
    ...(journal.coverImage ? { image: journal.coverImage } : {}),
    // Google Scholar indexes papers from these tags.
    other: scholarMeta(journal, (await getSiteMeta()).name),
  });
}

/**
 * One journal entry: its abstract and keywords, and the full text free to read
 * — "Read online" opens the PDF in the browser's own viewer, "Download" saves
 * it. No account or payment, by design.
 */
export default async function JournalPage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const journal = await getJournalBySlug(slug);
  if (!journal) notFound();

  const pdf = `/articles/${journal.slug}/pdf`;
  const meta = [volumeIssue(journal), format(journal.publishedAt, "d MMMM yyyy")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section className="pt-32 sm:pt-36">
      <JsonLd data={scholarlyArticleJsonLd(journal)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Articles", path: "/articles" },
          { name: journal.title, path: `/articles/${journal.slug}` },
        ])}
      />
      <Container width="prose">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          All articles
        </Link>

        <p className="mt-8 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {meta}
        </p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
          <HeadingText>{journal.title}</HeadingText>
        </h1>
        <p className="mt-4 text-lg">{journal.authors.join(", ")}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {journal.hasPdf ? (
            <>
              <Button asChild size="xl" className="font-semibold tracking-[0.08em] uppercase">
                {/* A plain link: the browser's own PDF viewer, in a new tab. */}
                <a href={pdf} target="_blank" rel="noopener">
                  <BookOpenTextIcon aria-hidden />
                  Read online
                </a>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="font-semibold tracking-[0.08em] uppercase"
              >
                <a href={`${pdf}?download=1`} download>
                  <DownloadIcon aria-hidden />
                  Download PDF
                </a>
              </Button>
            </>
          ) : null}
          <Badge variant="secondary" className="tracking-wide uppercase">
            Free to read
          </Badge>
          {journal.pdfSize ? (
            <span className="text-sm text-muted-foreground">
              PDF, {(journal.pdfSize / 1024 / 1024).toFixed(1)} MB
            </span>
          ) : null}
        </div>

        <h2 className="mt-12 text-sm font-semibold tracking-[0.14em] uppercase">Abstract</h2>
        <div className="mt-4 space-y-4 leading-relaxed">
          {journal.abstract
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph.trim()}</p>
            ))}
        </div>

        {journal.links.length > 0 ? (
          <section aria-labelledby="article-links" className="mt-10">
            <h2 id="article-links" className="text-sm font-semibold tracking-[0.14em] uppercase">
              Links
            </h2>
            <ul className="mt-3 space-y-3">
              {journal.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1.5 text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                    <ArrowUpRightIcon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {journal.keywords.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Keywords</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {journal.keywords.map((keyword) => (
                <li key={keyword}>
                  <Link href={`/articles?q=${encodeURIComponent(keyword)}`}>
                    <Badge variant="outline" className="hover:border-primary">
                      {keyword}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
