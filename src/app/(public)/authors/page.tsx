import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { AuthorCard } from "@/components/public/author-card";
import { EmptyResults } from "@/components/public/empty-results";
import { ListPagination } from "@/components/public/list-pagination";
import { PageHero } from "@/components/public/page-hero";
import { SearchFilters } from "@/components/public/search-filters";
import { listAuthors } from "@/server/queries";

export const metadata: Metadata = {
  title: "Authors",
  description: "The writers we publish.",
};

export default async function AuthorsPage({ searchParams }: PageProps<"/authors">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const { items, total, pageCount, page: current } = await listAuthors({ q, page });

  return (
    <>
      <PageHero
        title="Our authors"
        description="The writers we publish, across every list. Search by name or specialism."
      />

      <Section>
        <Container width="wide">
          <SearchFilters placeholder="Search authors…" />

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "author" : "authors"}
          </p>

          {items.length === 0 ? (
            <div className="mt-8">
              <EmptyResults
                title="No authors match"
                description="No author on our list matches that search."
                resetHref="/authors"
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          )}

          <ListPagination page={current} pageCount={pageCount} basePath="/authors" params={{ q }} />
        </Container>
      </Section>
    </>
  );
}
