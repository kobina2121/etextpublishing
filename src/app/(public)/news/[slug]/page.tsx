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
 * Prerendered from a build-time slug list, with unknown slugs rejected by the
 * router rather than by notFound().
 *
 * Next cannot send a 404 once a streamed response has flushed its headers, so
 * notFound() inside an async page degrades to a soft 404 with a 200 status
 * (vercel/next.js#76474, #93239). Letting dynamicParams reject the slug keeps
 * the status honest, and drops drafts and unpublished titles to a real 404.
 *
 * Trade-off: newly published content needs the slug list rebuilding. Phase 4
 * wires a publish-time revalidation hook. If instant publishing ever matters
 * more than the status code, set dynamicParams back to true.
 */
export const dynamicParams = false;

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
          <p className="font-heading text-xs tracking-[0.14em] text-primary uppercase">
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
