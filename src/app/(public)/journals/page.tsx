import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { BookOpenTextIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { EmptyResults } from "@/components/public/empty-results";
import { PageHero } from "@/components/public/page-hero";
import { SearchFilters } from "@/components/public/search-filters";
import { Badge } from "@/components/ui/badge";
import { HeadingText } from "@/components/ui/heading-text";
import { buildMetadata } from "@/lib/seo/metadata";
import { listJournals, volumeIssue } from "@/server/journals";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Articles",
    description: "Academic articles and papers from our network, free for anyone to read.",
    path: "/journals",
  });
}

/** Free to read: every entry links to its full text, with no account and no payment. */
export default async function JournalsPage({ searchParams }: PageProps<"/journals">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const journals = await listJournals({ q });

  return (
    <>
      <PageHero
        title="Articles"
        description="Research from our network, free for anyone to read — no account, no payment."
      />

      <Section>
        <Container width="wide">
          <SearchFilters placeholder="Search by title, author or keyword…" />

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {journals.length} {journals.length === 1 ? "entry" : "entries"}
          </p>

          {journals.length === 0 ? (
            <div className="mt-8">
              <EmptyResults
                title={q ? "No journals match" : "No journals yet"}
                description={
                  q
                    ? "Nothing matches that search. Try an author's name or a keyword."
                    : "Journal papers will appear here as they are published."
                }
                resetHref="/journals"
              />
            </div>
          ) : (
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {journals.map((journal) => (
                <li key={journal.id} className="py-8">
                  <article className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {[volumeIssue(journal), format(journal.publishedAt, "MMMM yyyy")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <h2 className="mt-2 text-2xl leading-snug">
                        <Link href={`/journals/${journal.slug}`} className="hover:text-primary">
                          <HeadingText>{journal.title}</HeadingText>
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm">{journal.authors.join(", ")}</p>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {journal.abstract}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <Badge variant="secondary" className="tracking-wide uppercase">
                        Free to read
                      </Badge>
                      <Link
                        href={`/journals/${journal.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <BookOpenTextIcon className="size-4" aria-hidden />
                        Read
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
