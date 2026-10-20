import "server-only";

import { Types, type PipelineStage } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { Author, Category, Order, Publication, Service, SiteSettings, User } from "@/models";
import type {
  AuthorDoc,
  CategoryDoc,
  EditionDoc,
  OrderDoc,
  PublicationDoc,
  ServiceDoc,
  SiteSettingsDoc,
} from "@/models/types";
import type {
  Author as AuthorType,
  Category as CategoryType,
  Edition,
  EditionKind,
  Paginated,
  PublicationWithRelations,
  Service as ServiceType,
} from "@/types/content";

/**
 * Read layer for the public site.
 *
 * Pages call these and nothing else; the Mongoose models never reach a
 * component. Every document is mapped to the plain, serialisable shapes in
 * `@/types/content`, because ObjectId and Date-bearing Mongoose documents
 * cannot cross the server/client boundary intact.
 */

export const DEFAULT_PAGE_SIZE = 9;

/** Escapes user input before it reaches a $regex, so a search term cannot alter the query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Lean<T> = Omit<T, keyof object> & { _id: { toString(): string } };

const id = (value: { toString(): string }) => value.toString();

function toCategory(doc: Lean<CategoryDoc>): CategoryType {
  return {
    id: id(doc._id),
    name: doc.name,
    slug: doc.slug,
    ...(doc.description ? { description: doc.description } : {}),
  };
}

function toAuthor(doc: Lean<AuthorDoc>): AuthorType {
  return {
    id: id(doc._id),
    name: doc.name,
    slug: doc.slug,
    bio: doc.bio,
    featured: doc.featured,
    ...(doc.role ? { role: doc.role } : {}),
    ...(doc.photo ? { photo: doc.photo } : {}),
    ...(doc.socials?.length ? { socials: doc.socials.map((s) => ({ ...s })) } : {}),
  };
}

type JoinedPublication = Lean<Omit<PublicationDoc, "author" | "category">> & {
  author: Lean<AuthorDoc>;
  category: Lean<CategoryDoc>;
};

function toEdition(edition: EditionDoc | undefined): Edition {
  return {
    available: edition?.available ?? false,
    price: edition?.price ?? 0,
    stockQuantity: edition?.stockQuantity ?? 0,
  };
}

function toPublication(doc: JoinedPublication): PublicationWithRelations {
  return {
    id: id(doc._id),
    title: doc.title,
    slug: doc.slug,
    authorId: id(doc.author._id),
    categoryId: id(doc.category._id),
    isbn: doc.isbn,
    description: doc.description,
    excerpt: doc.excerpt,
    publicationDate: new Date(doc.publicationDate),
    pages: doc.pages,
    featured: doc.featured,
    status: doc.status,
    // Defensive defaults: a document written before editions existed has no
    // `editions` path at all, and a half-read title must not crash a listing.
    editions: {
      hardcopy: toEdition(doc.editions?.hardcopy),
      softcopy: toEdition(doc.editions?.softcopy),
    },
    currency: (doc.currency ?? "GHS").toUpperCase(),
    author: toAuthor(doc.author),
    category: toCategory(doc.category),
    ...(doc.coverImage ? { coverImage: doc.coverImage } : {}),
  };
}

function toService(doc: Lean<ServiceDoc>): ServiceType {
  return {
    id: id(doc._id),
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    body: doc.body,
    icon: doc.icon,
    order: doc.order,
    status: doc.status,
  };
}

/**
 * Joins author and category, then filters.
 *
 * Search has to match the author's name, which lives in another collection, so
 * a Mongo text index cannot cover it — a text index is single-collection. The
 * lookup runs first and the regex matches across the joined document. Regex
 * cannot use an index, so if the catalogue grows past a few thousand titles
 * this should move to Atlas Search or a denormalised `authorName` field.
 */
function publicationPipeline(filters: {
  q?: string;
  category?: string;
  edition?: string;
  slug?: string;
  featured?: boolean;
  authorId?: string;
  excludeId?: string;
  categoryId?: string;
}): PipelineStage[] {
  const match: Record<string, unknown> = { status: "published" };
  if (filters.slug) match.slug = filters.slug;
  // An edition filter asks "can I buy it this way", not "what is it" — so it
  // matches on the edition actually being on sale, not on a label.
  if (filters.edition === "hardcopy" || filters.edition === "softcopy") {
    match[`editions.${filters.edition}.available`] = true;
    match[`editions.${filters.edition}.price`] = { $gt: 0 };
  }
  if (filters.featured) match.featured = true;

  const stages: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: Author.collection.name,
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
  ];

  const postJoin: Record<string, unknown> = {};
  if (filters.category) postJoin["category.slug"] = filters.category;
  if (filters.q?.trim()) {
    const rx = { $regex: escapeRegex(filters.q.trim()), $options: "i" };
    postJoin.$or = [{ title: rx }, { excerpt: rx }, { isbn: rx }, { "author.name": rx }];
  }
  if (Object.keys(postJoin).length > 0) stages.push({ $match: postJoin });

  return stages;
}

// --- Categories -------------------------------------------------------------

export async function getCategories(): Promise<CategoryType[]> {
  await connectToDatabase();
  const docs = await Category.find().sort({ name: 1 }).lean<Lean<CategoryDoc>[]>();
  return docs.map(toCategory);
}

// --- Publications -----------------------------------------------------------

export type PublicationFilters = {
  q?: string;
  category?: string;
  edition?: string;
  page?: number;
  pageSize?: number;
};

export async function listPublications(
  filters: PublicationFilters = {},
): Promise<Paginated<PublicationWithRelations>> {
  const { q, category, edition, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;
  await connectToDatabase();

  const base = publicationPipeline({
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(edition ? { edition } : {}),
  });

  // One round trip: $facet returns the page and the total count together.
  const [result] = await Publication.aggregate<{
    items: JoinedPublication[];
    meta: { total: number }[];
  }>([
    ...base,
    {
      $facet: {
        items: [
          { $sort: { publicationDate: -1 } },
          { $skip: Math.max(0, (Math.max(1, page) - 1) * pageSize) },
          { $limit: pageSize },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const total = result?.meta[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: (result?.items ?? []).map(toPublication),
    total,
    page: Math.min(Math.max(1, page), pageCount),
    pageCount,
    pageSize,
  };
}

export async function getFeaturedPublications(limit = 4): Promise<PublicationWithRelations[]> {
  await connectToDatabase();
  const docs = await Publication.aggregate<JoinedPublication>([
    ...publicationPipeline({ featured: true }),
    { $sort: { publicationDate: -1 } },
    { $limit: limit },
  ]);
  return docs.map(toPublication);
}

export async function getPublicationBySlug(slug: string): Promise<PublicationWithRelations | null> {
  await connectToDatabase();
  const docs = await Publication.aggregate<JoinedPublication>([
    ...publicationPipeline({ slug }),
    { $limit: 1 },
  ]);
  const doc = docs[0];
  return doc ? toPublication(doc) : null;
}

export async function getRelatedPublications(
  publication: PublicationWithRelations,
  limit = 3,
): Promise<PublicationWithRelations[]> {
  await connectToDatabase();
  const docs = await Publication.aggregate<JoinedPublication>([
    ...publicationPipeline({ category: publication.category.slug }),
    { $match: { slug: { $ne: publication.slug } } },
    { $sort: { publicationDate: -1 } },
    { $limit: limit },
  ]);
  return docs.map(toPublication);
}

export async function getPublicationSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await Publication.find({ status: "published" }, { slug: 1 }).lean<
    { slug: string }[]
  >();
  return docs.map((doc) => doc.slug);
}

// --- Authors ----------------------------------------------------------------

export async function listAuthors(
  filters: { q?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<AuthorType>> {
  const { q, page = 1, pageSize = 12 } = filters;
  await connectToDatabase();

  const match: Record<string, unknown> = {};
  if (q?.trim()) {
    const rx = { $regex: escapeRegex(q.trim()), $options: "i" };
    match.$or = [{ name: rx }, { role: rx }, { bio: rx }];
  }

  const [total, docs] = await Promise.all([
    Author.countDocuments(match),
    Author.find(match)
      .sort({ name: 1 })
      .skip(Math.max(0, (Math.max(1, page) - 1) * pageSize))
      .limit(pageSize)
      .lean<Lean<AuthorDoc>[]>(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: docs.map(toAuthor),
    total,
    page: Math.min(Math.max(1, page), pageCount),
    pageCount,
    pageSize,
  };
}

/**
 * Authors for the home page: featured ones first, topped up with the most
 * recently added so the section is not empty just because nobody has been
 * marked Featured yet.
 */
export async function getFeaturedAuthors(limit = 4): Promise<AuthorType[]> {
  await connectToDatabase();
  const featured = await Author.find({ featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<Lean<AuthorDoc>[]>();
  const others =
    featured.length < limit
      ? await Author.find({ featured: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(limit - featured.length)
          .lean<Lean<AuthorDoc>[]>()
      : [];
  return [...featured, ...others].map(toAuthor);
}

export async function getAuthorBySlug(slug: string): Promise<AuthorType | null> {
  await connectToDatabase();
  const doc = await Author.findOne({ slug }).lean<Lean<AuthorDoc> | null>();
  return doc ? toAuthor(doc) : null;
}

export async function getPublicationsByAuthor(
  authorId: string,
): Promise<PublicationWithRelations[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(authorId)) return [];

  const docs = await Publication.aggregate<JoinedPublication>([
    { $match: { status: "published", author: Types.ObjectId.createFromHexString(authorId) } },
    {
      $lookup: {
        from: Author.collection.name,
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    { $sort: { publicationDate: -1 } },
  ]);
  return docs.map(toPublication);
}

export async function getAuthorSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await Author.find({}, { slug: 1 }).lean<{ slug: string }[]>();
  return docs.map((doc) => doc.slug);
}

// --- Services ---------------------------------------------------------------

export async function listServices(): Promise<ServiceType[]> {
  await connectToDatabase();
  const docs = await Service.find({ status: "published" })
    .sort({ order: 1 })
    .lean<Lean<ServiceDoc>[]>();
  return docs.map(toService);
}

// --- Filter option helpers --------------------------------------------------

/**
 * Edition kinds that at least one published title can actually be bought in.
 *
 * Asked of the data rather than hardcoded, so the filter never offers
 * "Softcopy" on a catalogue that has none priced.
 */
export async function getPurchasableEditionKinds(): Promise<EditionKind[]> {
  await connectToDatabase();
  const kinds: EditionKind[] = ["hardcopy", "softcopy"];
  const found = await Promise.all(
    kinds.map((kind) =>
      Publication.exists({
        status: "published",
        [`editions.${kind}.available`]: true,
        [`editions.${kind}.price`]: { $gt: 0 },
      }),
    ),
  );
  return kinds.filter((_, index) => found[index]);
}

// --- Site settings ----------------------------------------------------------

export type SiteSettingsValues = Pick<
  SiteSettingsDoc,
  "name" | "tagline" | "description" | "contact" | "socials" | "footerText"
>;

/** Returns null when settings have not been seeded; callers fall back to siteConfig. */
export async function getSiteSettings(): Promise<SiteSettingsValues | null> {
  await connectToDatabase();
  const doc = await SiteSettings.findOne({ key: "site" }).lean<Lean<SiteSettingsDoc> | null>();
  if (!doc) return null;
  return {
    name: doc.name,
    tagline: doc.tagline,
    description: doc.description,
    contact: doc.contact,
    socials: doc.socials,
    ...(doc.footerText ? { footerText: doc.footerText } : {}),
  };
}

// --- Customer account -------------------------------------------------------

export type CustomerOrderLine = {
  title: string;
  slug: string;
  edition: EditionKind;
  quantity: number;
  unitPrice: number;
  requiresShipping: boolean;
};

export type CustomerOrder = {
  reference: string;
  placedAt: Date;
  status: string;
  fulfilment: string;
  total: number;
  currency: string;
  requiresShipping: boolean;
  items: CustomerOrderLine[];
};

/** Which ways in an account has, for the account page. Never the hash itself. */
export async function getSignInMethods(
  userId: string,
): Promise<{ password: boolean; google: boolean }> {
  if (!Types.ObjectId.isValid(userId)) return { password: false, google: false };
  await connectToDatabase();
  const user = await User.findById(userId)
    .select("passwordHash googleId")
    .lean<{ passwordHash?: string; googleId?: string } | null>();
  return { password: Boolean(user?.passwordHash), google: Boolean(user?.googleId) };
}

/**
 * A reader's own orders.
 *
 * Matched by account *and* by verified email address. Google only ever gives
 * us an address it has verified, so an order placed as a guest with that same
 * address belongs to the person now signed in — and without this, signing up
 * after buying would show an empty history.
 *
 * The email match applies only once the address is verified — by a Google
 * link or an emailed reset link. A password sign-up alone verifies nothing, so
 * matching on it would let anyone register someone else's email and read
 * their guest orders.
 *
 * Only paid orders are listed. A `pending` row is an abandoned payment
 * attempt, and showing those as "orders" reads as having been charged twice.
 */
export async function getOrdersForCustomer(input: {
  userId: string;
  email: string;
}): Promise<CustomerOrder[]> {
  await connectToDatabase();

  const email = input.email.trim().toLowerCase();
  const or: Record<string, unknown>[] = [];
  if (Types.ObjectId.isValid(input.userId)) {
    or.push({ user: Types.ObjectId.createFromHexString(input.userId) });
  }
  if (email && Types.ObjectId.isValid(input.userId)) {
    const account = await User.findById(input.userId)
      .select("googleId emailVerifiedAt")
      .lean<{ googleId?: string; emailVerifiedAt?: Date } | null>();
    if (account?.googleId || account?.emailVerifiedAt) or.push({ email });
  }
  if (or.length === 0) return [];

  const docs = await Order.find({ $or: or, status: "paid" })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<Lean<OrderDoc>[]>();

  return docs.map((doc) => ({
    reference: doc.reference,
    placedAt: new Date(doc.paidAt ?? doc.createdAt),
    status: doc.status,
    fulfilment: doc.fulfilment,
    total: doc.total,
    currency: (doc.currency ?? "GHS").toUpperCase(),
    requiresShipping: doc.requiresShipping,
    items: doc.items.map((item) => ({
      title: item.title,
      slug: item.slug,
      edition: item.edition as EditionKind,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      requiresShipping: item.requiresShipping,
    })),
  }));
}
