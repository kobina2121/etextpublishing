import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ArticleCard } from "@/components/public/article-card";
import { EmptyResults } from "@/components/public/empty-results";
import { ListPagination } from "@/components/public/list-pagination";
import { PageHero } from "@/components/public/page-hero";
import { SearchFilters } from "@/components/public/search-filters";
import { getCategories, listArticles } from "@/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "News",
    description: "Announcements, interviews and notes from the editorial desk.",
    path: "/news",
  });
}

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const [{ items, total, pageCount, page: current }, categories] = await Promise.all([
    listArticles({ q, category, page }),
    getCategories(),
  ]);

  return (
    <>
      <PageHero
        title="News"
        description="Announcements, interviews and notes from the editorial desk."
      />

      <Section>
        <Container>
          <SearchFilters
            placeholder="Search articles…"
            groups={[
              {
                name: "category",
                label: "Categories",
                options: categories.map((c) => ({ label: c.name, value: c.slug })),
              },
            ]}
          />

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "article" : "articles"}
          </p>

          {items.length === 0 ? (
            <div className="mt-8">
              <EmptyResults
                title="No articles match"
                description="Nothing published matches those filters yet."
                resetHref="/news"
              />
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {items.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <ListPagination
            page={current}
            pageCount={pageCount}
            basePath="/news"
            params={{ q, category }}
          />
        </Container>
      </Section>
    </>
  );
}
