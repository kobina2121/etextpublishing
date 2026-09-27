import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site-meta";
import { getArticleSlugs, getAuthorSlugs, getPublicationSlugs } from "@/server/queries";

/**
 * Sitemap, built from what is actually published.
 *
 * The slug queries already filter to `status: published`, so drafts cannot leak
 * in here — which matters, because a sitemap entry is an explicit invitation to
 * crawl. If the database is unreachable the static pages are still emitted
 * rather than failing the whole route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/publications"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/authors"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/services"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/news"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/submit"), changeFrequency: "yearly", priority: 0.6 },
  ];

  try {
    const [publications, authors, articles] = await Promise.all([
      getPublicationSlugs(),
      getAuthorSlugs(),
      getArticleSlugs(),
    ]);

    return [
      ...staticPages,
      ...publications.map((slug) => ({
        url: absoluteUrl(`/publications/${slug}`),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...authors.map((slug) => ({
        url: absoluteUrl(`/authors/${slug}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...articles.map((slug) => ({
        url: absoluteUrl(`/news/${slug}`),
        changeFrequency: "yearly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticPages;
  }
}
