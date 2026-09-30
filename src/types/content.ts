/**
 * Content types shared by the public site.
 *
 * These mirror the Mongoose schemas landing in Phase 4 deliberately: pages and
 * components are typed against these, so swapping the fixture-backed query
 * layer for real database reads should not touch a single component.
 */

export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/**
 * Binding and media, as an author describes the book they are pitching. This
 * is manuscript-submission vocabulary only — it says nothing about what is for
 * sale, which is `EDITION_KINDS` below.
 */
export const PUBLICATION_FORMATS = ["paperback", "hardcover", "ebook", "audiobook"] as const;
export type PublicationFormat = (typeof PUBLICATION_FORMATS)[number];

/**
 * What a buyer actually chooses. A title is offered as a printed copy, a
 * download, or both, and each is priced separately.
 *
 * This replaced a single `format` per title (paperback/hardcover/ebook/
 * audiobook), which could not express a book sold in more than one form —
 * every edition needed its own record, so the same book appeared twice in the
 * catalogue and twice in search.
 */
export const EDITION_KINDS = ["hardcopy", "softcopy"] as const;
export type EditionKind = (typeof EDITION_KINDS)[number];

export const EDITION_LABELS: Record<EditionKind, string> = {
  hardcopy: "Hardcopy",
  softcopy: "Softcopy",
};

export type Edition = {
  /** Offered for sale. An admin turns each kind on or off per title. */
  available: boolean;
  /** Integer minor units. 0 means not for sale, whatever `available` says. */
  price: number;
  /** Printed copies on hand. A download cannot run out, so it stays 0. */
  stockQuantity: number;
};

/** Printed copies are posted and consume stock; downloads do neither. */
export function editionRequiresShipping(kind: EditionKind): boolean {
  return kind === "hardcopy";
}

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
  pages: number;
  featured: boolean;
  status: PublicationStatus;
  /** One entry per kind, always both present. Availability is a field, not a key. */
  editions: Record<EditionKind, Edition>;
  currency: string;
};

/** The kinds a buyer can actually put in a basket right now. */
export function purchasableEditions(publication: Publication): EditionKind[] {
  return EDITION_KINDS.filter((kind) => {
    const edition = publication.editions[kind];
    if (!edition.available || edition.price <= 0) return false;
    // A printed copy with nothing on the shelf is not purchasable; a download
    // never runs out.
    return !editionRequiresShipping(kind) || edition.stockQuantity > 0;
  });
}

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
