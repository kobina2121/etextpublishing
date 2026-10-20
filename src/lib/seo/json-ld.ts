import "server-only";

import { toMajorUnits } from "@/lib/money";
import { absoluteUrl, type SiteMeta } from "@/lib/seo/site-meta";
import { siteConfig } from "@/lib/site-config";
import type { PublicJournal } from "@/server/journals";
import type { Author, PublicationWithRelations } from "@/types/content";

/**
 * Structured data builders.
 *
 * Each returns a plain object that `JsonLd` serialises. Only fields we actually
 * hold are emitted — inventing an aggregateRating or a price to satisfy a
 * validator is how a site earns a manual action.
 */

/**
 * The organisation, as Google's knowledge panel reads it.
 *
 * A detail still holding its invented placeholder is left out rather than
 * published: a fake street address or phone number in structured data is
 * worse than none, and Google may show it.
 */
export function organizationJsonLd(site: SiteMeta) {
  const placeholder = siteConfig.contact;
  const realPhone = site.phone !== placeholder.phone;
  const realEmail = site.email !== placeholder.email;
  const realAddress = site.address.line1 !== placeholder.address.line1;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: site.name,
    url: site.url,
    logo: absoluteUrl("/icon.png"),
    description: site.description,
    ...(realEmail ? { email: site.email } : {}),
    ...(realPhone ? { telephone: site.phone } : {}),
    ...(realAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: [site.address.line1, site.address.line2].filter(Boolean).join(", "),
            addressLocality: site.address.city,
            addressRegion: site.address.region,
            postalCode: site.address.postalCode,
            addressCountry: site.address.country,
          },
        }
      : {}),
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
    ...(bookFormats(publication).length > 0 ? { bookFormat: bookFormats(publication) } : {}),
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
    ...(bookOffers(publication).length > 0 ? { offers: bookOffers(publication) } : {}),
  };
}

/**
 * An Offer for each edition on sale, at its real price — what lets Google show
 * a price and availability beside the title. Nothing is offered for an edition
 * that is off or unpriced, and a hardcopy with no stock says so.
 */
function bookOffers(publication: PublicationWithRelations) {
  const url = absoluteUrl(`/publications/${publication.slug}`);
  const offers = [];
  for (const kind of ["hardcopy", "softcopy"] as const) {
    const edition = publication.editions[kind];
    if (!edition.available || edition.price <= 0) continue;
    const inStock = kind === "softcopy" || (edition.stockQuantity ?? 0) > 0;
    offers.push({
      "@type": "Offer",
      name: kind === "hardcopy" ? "Hardcopy" : "Softcopy (download)",
      price: toMajorUnits(edition.price, publication.currency).toFixed(2),
      priceCurrency: publication.currency,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url,
      seller: { "@id": absoluteUrl("/#organization") },
    });
  }
  return offers;
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

/**
 * A journal paper. Paired with Google Scholar's citation_* meta tags (see
 * scholarMeta), which are what Scholar itself reads.
 */
export function scholarlyArticleJsonLd(journal: PublicJournal) {
  const path = `/articles/${journal.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": absoluteUrl(`${path}#article`),
    headline: journal.title.slice(0, 110),
    name: journal.title,
    url: absoluteUrl(path),
    abstract: journal.abstract,
    datePublished: journal.publishedAt.toISOString().slice(0, 10),
    inLanguage: "en",
    isAccessibleForFree: true,
    author: journal.authors.map((name) => ({ "@type": "Person", name })),
    publisher: { "@id": absoluteUrl("/#organization") },
    ...(journal.keywords.length > 0 ? { keywords: journal.keywords.join(", ") } : {}),
    ...(journal.volume || journal.issue
      ? {
          isPartOf: {
            "@type": "PublicationIssue",
            ...(journal.issue ? { issueNumber: journal.issue } : {}),
            ...(journal.volume
              ? { isPartOf: { "@type": "PublicationVolume", volumeNumber: journal.volume } }
              : {}),
          },
        }
      : {}),
    ...(journal.hasPdf
      ? {
          encoding: {
            "@type": "MediaObject",
            contentUrl: absoluteUrl(`${path}/pdf`),
            encodingFormat: "application/pdf",
          },
        }
      : {}),
    ...(journal.coverImage ? { image: absoluteUrl(journal.coverImage) } : {}),
  };
}

/**
 * Google Scholar's citation_* meta tags, which it uses to index a paper and
 * link its full text. Scholar needs the PDF reachable without signing in —
 * these entries are free to read, so it is.
 */
export function scholarMeta(
  journal: PublicJournal,
  siteName: string,
): Record<string, string | string[]> {
  const date = journal.publishedAt.toISOString().slice(0, 10).replace(/-/g, "/");
  return {
    citation_title: journal.title,
    citation_author: journal.authors,
    citation_publication_date: date,
    citation_online_date: date,
    citation_journal_title: siteName,
    citation_publisher: siteName,
    citation_language: "en",
    citation_abstract_html_url: absoluteUrl(`/articles/${journal.slug}`),
    ...(journal.volume ? { citation_volume: journal.volume } : {}),
    ...(journal.issue ? { citation_issue: journal.issue } : {}),
    ...(journal.keywords.length > 0 ? { citation_keywords: journal.keywords.join("; ") } : {}),
    ...(journal.hasPdf ? { citation_pdf_url: absoluteUrl(`/articles/${journal.slug}/pdf`) } : {}),
  };
}
