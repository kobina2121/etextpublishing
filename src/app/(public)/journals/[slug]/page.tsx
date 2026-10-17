import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, BookOpenTextIcon, DownloadIcon } from "lucide-react";

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
}: PageProps<"/journals/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const journal = await getJournalBySlug(slug);
  // Before the shell flushes, so an unknown slug gets a real 404.
  if (!journal) notFound();
  return buildMetadata({
    title: journal.title,
    description: journal.abstract.slice(0, 160),
    path: `/journals/${journal.slug}`,
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
export default async function JournalPage({ params }: PageProps<"/journals/[slug]">) {
  const { slug } = await params;
  const journal = await getJournalBySlug(slug);
  if (!journal) notFound();

  const pdf = `/journals/${journal.slug}/pdf`;
  const meta = [volumeIssue(journal), format(journal.publishedAt, "d MMMM yyyy")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section className="pt-32 sm:pt-36">
      <JsonLd data={scholarlyArticleJsonLd(journal)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Journals", path: "/journals" },
          { name: journal.title, path: `/journals/${journal.slug}` },
        ])}
      />
      <Container width="prose">
        <Link
          href="/journals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          All journals
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

        {journal.keywords.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-sm font-semibold tracking-[0.14em] uppercase">Keywords</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {journal.keywords.map((keyword) => (
                <li key={keyword}>
                  <Link href={`/journals?q=${encodeURIComponent(keyword)}`}>
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
