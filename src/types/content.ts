/**
 * Content types shared by the public site.
 *
 * These mirror the Mongoose schemas landing in Phase 4 deliberately: pages and
 * components are typed against these, so swapping the fixture-backed query
 * layer for real database reads should not touch a single component.
 */

export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_FORMATS = ["paperback", "hardcover", "ebook", "audiobook"] as const;
export type PublicationFormat = (typeof PUBLICATION_FORMATS)[number];

export const SUBMISSION_STATUSES = [
  "new",
  "under_review",
  "accepted",
  "rejected",
  "archived",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type Author = {
  id: string;
  name: string;
  slug: string;
  role?: string;
  bio: string;
  photo?: string;
  featured: boolean;
  socials?: { label: string; href: string }[];
};

export type Publication = {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  categoryId: string;
  isbn: string;
  coverImage?: string;
  description: string;
  excerpt: string;
  publicationDate: Date;
  format: PublicationFormat;
  pages: number;
  featured: boolean;
  status: PublicationStatus;
};

/** A publication with its author and category resolved, as pages consume it. */
export type PublicationWithRelations = Publication & {
  author: Author;
  category: Category;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: string;
  authorName: string;
  categoryId: string;
  tags: string[];
  publishedAt: Date;
  status: PublicationStatus;
  featured: boolean;
};

export type ArticleWithRelations = Article & {
  category: Category;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  /** Lucide icon name, resolved at render time. */
  icon: string;
  order: number;
  status: PublicationStatus;
};

/** Standard shape returned by every paginated listing query. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};
