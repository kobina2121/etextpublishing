import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { EmptyResults } from "@/components/public/empty-results";
import { ListPagination } from "@/components/public/list-pagination";
import { PageHero } from "@/components/public/page-hero";
import { PublicationCard } from "@/components/public/publication-card";
import { SearchFilters } from "@/components/public/search-filters";
import { getCategories, getPurchasableEditionKinds, listPublications } from "@/server/queries";
import { EDITION_LABELS } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Publications",
    description: "Browse every title we publish, across fiction, non-fiction and academic lists.",
    path: "/publications",
  });
}

export default async function PublicationsPage({ searchParams }: PageProps<"/publications">) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const edition = typeof params.edition === "string" ? params.edition : undefined;
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const [{ items, total, pageCount, page: current }, categories, editionKinds] = await Promise.all([
    listPublications({ q, category, edition, page }),
    getCategories(),
    getPurchasableEditionKinds(),
  ]);

  return (
    <>
      <PageHero
        title="Publications"
        description="Every title on our list, newest first. Filter by category or edition, or search by title, author or ISBN."
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
                name: "edition",
                label: "Editions",
                options: editionKinds.map((kind) => ({ label: EDITION_LABELS[kind], value: kind })),
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
            params={{ q, category, edition }}
          />
        </Container>
      </Section>
    </>
  );
}
