import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { getArticleBySlug, getArticleSlugs } from "@/server/queries";

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
  const slugs = await getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  // See the note on the publication detail page: this must happen before the
  // streamed shell flushes, or the 404 degrades to a soft 404.
  if (!article) notFound();

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <Section className="pt-32 sm:pt-36">
      <Container width="prose">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/news">News</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{article.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="mt-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {article.category.name} ·{" "}
            <time dateTime={article.publishedAt.toISOString()}>
              {format(article.publishedAt, "d MMMM yyyy")}
            </time>
          </p>

          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{article.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
          <p className="mt-6 text-sm text-muted-foreground">By {article.authorName}</p>

          {/* Fixture bodies are plain text split on blank lines. Phase 6 swaps
              this for sanitised rich text from the admin editor. */}
          <div className="prose mt-10 max-w-none dark:prose-invert">
            {article.body.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {article.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </article>
      </Container>
    </Section>
  );
}
