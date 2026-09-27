import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { EmptyResults } from "@/components/public/empty-results";
import { ListPagination } from "@/components/public/list-pagination";
import { PageHero } from "@/components/public/page-hero";
import { PublicationCard } from "@/components/public/publication-card";
import { SearchFilters } from "@/components/public/search-filters";
import { getCategories, getPublicationFormats, listPublications } from "@/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Publications",
    description: "Browse every title we publish, across fiction, non-fiction and academic lists.",
    path: "/publications",
  });
}

const FORMAT_LABELS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "E-book",
  audiobook: "Audiobook",
};

export default async function PublicationsPage({ searchParams }: PageProps<"/publications">) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const format = typeof params.format === "string" ? params.format : undefined;
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const [{ items, total, pageCount, page: current }, categories, formats] = await Promise.all([
    listPublications({ q, category, format, page }),
    getCategories(),
    getPublicationFormats(),
  ]);

  return (
    <>
      <PageHero
        title="Publications"
        description="Every title on our list, newest first. Filter by category or format, or search by title, author or ISBN."
      />

      <Section>
        <Container width="wide">
          <SearchFilters
            placeholder="Search by title, author or ISBN…"
            groups={[
              {
                name: "category",
                label: "Categories",
                options: categories.map((c) => ({ label: c.name, value: c.slug })),
              },
              {
                name: "format",
                label: "Formats",
                options: formats.map((f) => ({ label: FORMAT_LABELS[f] ?? f, value: f })),
              },
            ]}
          />

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "title" : "titles"}
          </p>

          {items.length === 0 ? (
            <div className="mt-8">
              <EmptyResults
                title="No publications match"
                description="Nothing on our list matches those filters yet."
                resetHref="/publications"
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((publication, index) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  priority={index < 3}
                />
              ))}
            </div>
          )}

          <ListPagination
            page={current}
            pageCount={pageCount}
            basePath="/publications"
            params={{ q, category, format }}
          />
        </Container>
      </Section>
    </>
  );
}
