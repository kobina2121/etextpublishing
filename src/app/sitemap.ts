import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site-meta";
import { getSitemapEntries, type SitemapEntry } from "@/server/sitemap";

/**
 * Sitemap, built from what is actually published.
 *
 * The slug queries already filter to `status: published`, so drafts cannot leak
 * in here — which matters, because a sitemap entry is an explicit invitation to
 * crawl. If the database is unreachable the static pages are still emitted
 * rather than failing the whole route.
 *
 * Rebuilt at most hourly. It was built once per deploy, so a title or article
 * published from the dashboard did not reach it until the next deploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/publications"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/articles"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/authors"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/services"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/submit"), changeFrequency: "yearly", priority: 0.6 },
  ];

  try {
    const { publications, authors, articles } = await getSitemapEntries();
    const entries = (
      list: SitemapEntry[],
      base: string,
      changeFrequency: "monthly" | "yearly",
      priority: number,
    ): MetadataRoute.Sitemap =>
      list.map((item) => ({
        url: absoluteUrl(`${base}/${item.slug}`),
        ...(item.updatedAt ? { lastModified: new Date(item.updatedAt) } : {}),
        changeFrequency,
        priority,
      }));

    return [
      ...staticPages,
      ...entries(publications, "/publications", "monthly", 0.8),
      ...entries(articles, "/articles", "yearly", 0.7),
      ...entries(authors, "/authors", "monthly", 0.6),
    ];
  } catch {
    return staticPages;
  }
}
