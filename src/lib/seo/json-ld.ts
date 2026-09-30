import "server-only";

import { absoluteUrl, type SiteMeta } from "@/lib/seo/site-meta";
import type { ArticleWithRelations, Author, PublicationWithRelations } from "@/types/content";

/**
 * Structured data builders.
 *
 * Each returns a plain object that `JsonLd` serialises. Only fields we actually
 * hold are emitted — inventing an aggregateRating or a price to satisfy a
 * validator is how a site earns a manual action.
 */

export function organizationJsonLd(site: SiteMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.email,
    telephone: site.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: [site.address.line1, site.address.line2].filter(Boolean).join(", "),
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    ...(site.socials.length > 0 ? { sameAs: site.socials.map((s) => s.href) } : {}),
  };
}

export function websiteJsonLd(site: SiteMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: site.name,
    url: site.url,
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/publications?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function bookJsonLd(publication: PublicationWithRelations) {
  const path = `/publications/${publication.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": absoluteUrl(`${path}#book`),
    name: publication.title,
    url: absoluteUrl(path),
    description: publication.description,
    isbn: publication.isbn,
    numberOfPages: publication.pages,
    ...(bookFormats(publication).length > 0
      ? { bookFormat: bookFormats(publication) }
      : {}),
    datePublished: publication.publicationDate.toISOString().slice(0, 10),
    inLanguage: "en",
    genre: publication.category.name,
    author: {
      "@type": "Person",
      name: publication.author.name,
      url: absoluteUrl(`/authors/${publication.author.slug}`),
    },
    publisher: { "@id": absoluteUrl("/#organization") },
    ...(publication.coverImage ? { image: absoluteUrl(publication.coverImage) } : {}),
  };
}

/**
 * schema.org BookFormatType for each edition actually on sale.
 *
 * `bookFormat` accepts a list, which is the honest representation now that one
 * record can be both a printed book and a download. A title with nothing for
 * sale omits the property rather than claiming a format it does not offer.
 */
function bookFormats(publication: PublicationWithRelations): string[] {
  const formats: string[] = [];
  if (publication.editions.hardcopy.available && publication.editions.hardcopy.price > 0) {
    formats.push("https://schema.org/Paperback");
  }
  if (publication.editions.softcopy.available && publication.editions.softcopy.price > 0) {
    formats.push("https://schema.org/EBook");
  }
  return formats;
}

export function personJsonLd(author: Author) {
  const path = `/authors/${author.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl(`${path}#person`),
    name: author.name,
    url: absoluteUrl(path),
    description: author.bio,
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.photo ? { image: absoluteUrl(author.photo) } : {}),
    ...(author.socials?.length ? { sameAs: author.socials.map((s) => s.href) } : {}),
  };
}

export function articleJsonLd(article: ArticleWithRelations) {
  const path = `/news/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": absoluteUrl(`${path}#article`),
    headline: article.title,
    url: absoluteUrl(path),
    description: article.excerpt,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.publishedAt.toISOString(),
    articleSection: article.category.name,
    inLanguage: "en",
    author: { "@type": "Organization", "@id": absoluteUrl("/#organization") },
    publisher: { "@id": absoluteUrl("/#organization") },
    ...(article.tags.length > 0 ? { keywords: article.tags.join(", ") } : {}),
    ...(article.coverImage ? { image: absoluteUrl(article.coverImage) } : {}),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
