import "server-only";

import { articles, authors, categories, publications, services } from "@/lib/fixtures";
import type {
  Article,
  ArticleWithRelations,
  Author,
  Category,
  Paginated,
  Publication,
  PublicationFormat,
  PublicationWithRelations,
  Service,
} from "@/types/content";

/**
 * Read layer for the public site.
 *
 * Backed by fixtures for now. Every function is async and returns the shape the
 * database will return, so Phase 4 replaces the bodies with Mongoose queries
 * without changing a single call site. Filtering and pagination are modelled on
 * what the equivalent Mongo query will do, including the same defaults.
 */

export const DEFAULT_PAGE_SIZE = 9;

function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: current,
    pageCount,
    pageSize,
  };
}

function matches(haystack: string[], needle: string): boolean {
  const term = needle.trim().toLowerCase();
  if (!term) return true;
  return haystack.some((value) => value.toLowerCase().includes(term));
}

/** Drops anything an admin has not published. Mirrors the status filter in Mongo. */
function published<T extends { status: string }>(items: T[]): T[] {
  return items.filter((item) => item.status === "published");
}

function withRelations(publication: Publication): PublicationWithRelations | null {
  const author = byId(authors, publication.authorId);
  const category = byId(categories, publication.categoryId);
  if (!author || !category) return null;
  return { ...publication, author, category };
}

function articleWithRelations(article: Article): ArticleWithRelations | null {
  const category = byId(categories, article.categoryId);
  if (!category) return null;
  return { ...article, category };
}

// --- Categories -------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

// --- Publications -----------------------------------------------------------

export type PublicationFilters = {
  q?: string;
  category?: string;
  format?: string;
  page?: number;
  pageSize?: number;
};

export async function listPublications(
  filters: PublicationFilters = {},
): Promise<Paginated<PublicationWithRelations>> {
  const { q = "", category, format, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const resolved = published(publications)
    .map(withRelations)
    .filter((item): item is PublicationWithRelations => item !== null)
    .filter((item) => (category ? item.category.slug === category : true))
    .filter((item) => (format ? item.format === format : true))
    .filter((item) => matches([item.title, item.author.name, item.excerpt, item.isbn], q))
    .sort((a, b) => b.publicationDate.getTime() - a.publicationDate.getTime());

  return paginate(resolved, page, pageSize);
}

export async function getFeaturedPublications(limit = 4): Promise<PublicationWithRelations[]> {
  return published(publications)
    .filter((item) => item.featured)
    .map(withRelations)
    .filter((item): item is PublicationWithRelations => item !== null)
    .sort((a, b) => b.publicationDate.getTime() - a.publicationDate.getTime())
    .slice(0, limit);
}

export async function getPublicationBySlug(slug: string): Promise<PublicationWithRelations | null> {
  const found = published(publications).find((item) => item.slug === slug);
  return found ? withRelations(found) : null;
}

export async function getRelatedPublications(
  publication: PublicationWithRelations,
  limit = 3,
): Promise<PublicationWithRelations[]> {
  return published(publications)
    .filter((item) => item.id !== publication.id && item.categoryId === publication.categoryId)
    .map(withRelations)
    .filter((item): item is PublicationWithRelations => item !== null)
    .slice(0, limit);
}

export async function getPublicationSlugs(): Promise<string[]> {
  return published(publications).map((item) => item.slug);
}

// --- Authors ----------------------------------------------------------------

export async function listAuthors(
  filters: { q?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<Author>> {
  const { q = "", page = 1, pageSize = 12 } = filters;

  const resolved = authors
    .filter((author) => matches([author.name, author.role ?? "", author.bio], q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return paginate(resolved, page, pageSize);
}

export async function getFeaturedAuthors(limit = 4): Promise<Author[]> {
  return authors.filter((author) => author.featured).slice(0, limit);
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  return authors.find((author) => author.slug === slug) ?? null;
}

export async function getPublicationsByAuthor(
  authorId: string,
): Promise<PublicationWithRelations[]> {
  return published(publications)
    .filter((item) => item.authorId === authorId)
    .map(withRelations)
    .filter((item): item is PublicationWithRelations => item !== null)
    .sort((a, b) => b.publicationDate.getTime() - a.publicationDate.getTime());
}

export async function getAuthorSlugs(): Promise<string[]> {
  return authors.map((author) => author.slug);
}

// --- Articles ---------------------------------------------------------------

export async function listArticles(
  filters: { q?: string; category?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<ArticleWithRelations>> {
  const { q = "", category, page = 1, pageSize = 6 } = filters;

  const resolved = published(articles)
    .map(articleWithRelations)
    .filter((item): item is ArticleWithRelations => item !== null)
    .filter((item) => (category ? item.category.slug === category : true))
    .filter((item) => matches([item.title, item.excerpt, ...item.tags], q))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return paginate(resolved, page, pageSize);
}

export async function getLatestArticles(limit = 3): Promise<ArticleWithRelations[]> {
  const { items } = await listArticles({ pageSize: limit });
  return items;
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithRelations | null> {
  const found = published(articles).find((item) => item.slug === slug);
  return found ? articleWithRelations(found) : null;
}

export async function getArticleSlugs(): Promise<string[]> {
  return published(articles).map((item) => item.slug);
}

// --- Services ---------------------------------------------------------------

export async function listServices(): Promise<Service[]> {
  return published(services).sort((a, b) => a.order - b.order);
}

// --- Filter option helpers --------------------------------------------------

export async function getPublicationFormats(): Promise<PublicationFormat[]> {
  const used = new Set(published(publications).map((item) => item.format));
  return [...used].sort();
}
