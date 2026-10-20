import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ArticleCard } from "@/components/public/article-card";
import { EmptyResults } from "@/components/public/empty-results";
import { PageHero } from "@/components/public/page-hero";
import { SearchFilters } from "@/components/public/search-filters";
import { buildMetadata } from "@/lib/seo/metadata";
import { listJournals } from "@/server/journals";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Articles",
    description: "Academic articles and papers from our network, free for anyone to read.",
    path: "/articles",
  });
}

/** Free to read: every entry links to its full text, with no account and no payment. */
export default async function ArticlesPage({ searchParams }: PageProps<"/articles">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const articles = await listJournals({ q });

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
            {articles.length} {articles.length === 1 ? "article" : "articles"}
          </p>

          {articles.length === 0 ? (
            <div className="mt-8">
              <EmptyResults
                title={q ? "No articles match" : "No articles yet"}
                description={
                  q
                    ? "Nothing matches that search. Try an author's name or a keyword."
                    : "Articles will appear here as they are published."
                }
                resetHref="/articles"
              />
            </div>
          ) : (
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {articles.map((article) => (
                <li key={article.id} className="py-8">
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
