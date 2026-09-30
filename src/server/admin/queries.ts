import "server-only";

import { connectToDatabase } from "@/lib/db";
import { toMajorUnits } from "@/lib/money";
import type { Currency } from "@/lib/validations/publication";
import type { PublicationDoc } from "@/models/types";
import {
  Article,
  Author,
  Category,
  ContactMessage,
  ManuscriptSubmission,
  Order,
  Publication,
  Service,
  SiteSettings,
} from "@/models";

/**
 * Admin reads.
 *
 * Kept separate from `@/server/queries` on purpose: the public layer filters to
 * `status: "published"` everywhere, and an admin must see drafts and archived
 * records. Mixing the two behind one function is how a draft ends up leaking
 * onto the public site.
 */

export type DashboardCounts = {
  publications: { total: number; published: number; draft: number };
  authors: number;
  categories: number;
  articles: { total: number; published: number; draft: number };
  services: number;
  manuscripts: { total: number; unread: number };
  messages: { total: number; unread: number };
};

export async function getDashboardCounts(): Promise<DashboardCounts> {
  await connectToDatabase();

  const [
    publications,
    publicationsPublished,
    publicationsDraft,
    authors,
    categories,
    articles,
    articlesPublished,
    articlesDraft,
    services,
    manuscripts,
    manuscriptsNew,
    messages,
    messagesUnread,
  ] = await Promise.all([
    Publication.countDocuments(),
    Publication.countDocuments({ status: "published" }),
    Publication.countDocuments({ status: "draft" }),
    Author.countDocuments(),
    Category.countDocuments(),
    Article.countDocuments(),
    Article.countDocuments({ status: "published" }),
    Article.countDocuments({ status: "draft" }),
    Service.countDocuments(),
    ManuscriptSubmission.countDocuments(),
    ManuscriptSubmission.countDocuments({ status: "new" }),
    ContactMessage.countDocuments({ archived: false }),
    ContactMessage.countDocuments({ archived: false, read: false }),
  ]);

  return {
    publications: {
      total: publications,
      published: publicationsPublished,
      draft: publicationsDraft,
    },
    authors,
    categories,
    articles: { total: articles, published: articlesPublished, draft: articlesDraft },
    services,
    manuscripts: { total: manuscripts, unread: manuscriptsNew },
    messages: { total: messages, unread: messagesUnread },
  };
}

export type RecentSubmission = {
  id: string;
  title: string;
  authorName: string;
  status: string;
  submittedAt: Date;
};

export async function getRecentSubmissions(limit = 5): Promise<RecentSubmission[]> {
  await connectToDatabase();
  const docs = await ManuscriptSubmission.find().sort({ submittedAt: -1 }).limit(limit).lean<
    {
      _id: { toString(): string };
      title: string;
      authorName: string;
      status: string;
      submittedAt: Date;
    }[]
  >();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    authorName: doc.authorName,
    status: doc.status,
    submittedAt: new Date(doc.submittedAt),
  }));
}

export type RecentMessage = {
  id: string;
  name: string;
  subject: string;
  read: boolean;
  createdAt: Date;
};

export async function getRecentMessages(limit = 5): Promise<RecentMessage[]> {
  await connectToDatabase();
  const docs = await ContactMessage.find({ archived: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<
      {
        _id: { toString(): string };
        name: string;
        subject: string;
        read: boolean;
        createdAt: Date;
      }[]
    >();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    subject: doc.subject,
    read: doc.read,
    createdAt: new Date(doc.createdAt),
  }));
}

// --- Publications -----------------------------------------------------------

export type AdminPublicationRow = {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  categoryName: string;
  /** Short human summary of what is on sale, e.g. "Hardcopy + Softcopy". */
  editions: string;
  status: string;
  featured: boolean;
  publicationDate: Date;
};

/**
 * One line for the admin list. A title can be sold two ways, so the column
 * has to say which — "—" means nothing is on sale, which is worth seeing at a
 * glance rather than discovering in the form.
 */
function editionSummary(editions: PublicationDoc["editions"] | undefined): string {
  const offered: string[] = [];
  if (editions?.hardcopy?.available && (editions.hardcopy.price ?? 0) > 0) offered.push("Hardcopy");
  if (editions?.softcopy?.available && (editions.softcopy.price ?? 0) > 0) offered.push("Softcopy");
  return offered.join(" + ") || "—";
}

export async function listPublicationsAdmin(
  filters: { q?: string; status?: string } = {},
): Promise<AdminPublicationRow[]> {
  await connectToDatabase();

  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;

  const rows = await Publication.find(match)
    .sort({ updatedAt: -1 })
    .populate<{ author: { name: string } }>("author", "name")
    .populate<{ category: { name: string } }>("category", "name")
    .lean();

  const term = filters.q?.trim().toLowerCase();

  return rows
    .map((row) => ({
      id: row._id.toString(),
      title: row.title,
      slug: row.slug,
      authorName: row.author?.name ?? "—",
      categoryName: row.category?.name ?? "—",
      editions: editionSummary(row.editions),
      status: row.status,
      featured: row.featured,
      publicationDate: new Date(row.publicationDate),
    }))
    .filter((row) =>
      term
        ? [row.title, row.authorName, row.slug].some((v) => v.toLowerCase().includes(term))
        : true,
    );
}

export type PublicationFormValues = {
  id: string;
  currency: Currency;
  hardcopyAvailable: boolean;
  hardcopyPriceMajor: number;
  hardcopyStock: number;
  softcopyAvailable: boolean;
  softcopyPriceMajor: number;
  title: string;
  slug: string;
  author: string;
  category: string;
  isbn: string;
  coverImage: string;
  excerpt: string;
  description: string;
  publicationDate: string;
  pages: number;
  featured: boolean;
  status: string;
};

export async function getPublicationForEdit(id: string): Promise<PublicationFormValues | null> {
  await connectToDatabase();
  const doc = await Publication.findById(id).lean();
  if (!doc) return null;

  const currency = (doc.currency ?? "GHS") as Currency;

  return {
    id: doc._id.toString(),
    currency,
    // Converted back for the form, which works in major units.
    hardcopyAvailable: doc.editions?.hardcopy?.available ?? false,
    hardcopyPriceMajor: toMajorUnits(doc.editions?.hardcopy?.price ?? 0, currency),
    hardcopyStock: doc.editions?.hardcopy?.stockQuantity ?? 0,
    softcopyAvailable: doc.editions?.softcopy?.available ?? false,
    softcopyPriceMajor: toMajorUnits(doc.editions?.softcopy?.price ?? 0, currency),
    title: doc.title,
    slug: doc.slug,
    author: doc.author.toString(),
    category: doc.category.toString(),
    isbn: doc.isbn,
    coverImage: doc.coverImage ?? "",
    excerpt: doc.excerpt,
    description: doc.description,
    // <input type="date"> needs yyyy-MM-dd, not an ISO timestamp.
    publicationDate: new Date(doc.publicationDate).toISOString().slice(0, 10),
    pages: doc.pages,
    featured: doc.featured,
    status: doc.status,
  };
}

export type Option = { value: string; label: string };

/** Select options for the publication and article forms. */
export async function getFormOptions(): Promise<{ authors: Option[]; categories: Option[] }> {
  await connectToDatabase();
  const [authors, categories] = await Promise.all([
    Author.find({}, { name: 1 })
      .sort({ name: 1 })
      .lean<{ _id: { toString(): string }; name: string }[]>(),
    Category.find({}, { name: 1 })
      .sort({ name: 1 })
      .lean<{ _id: { toString(): string }; name: string }[]>(),
  ]);

  return {
    authors: authors.map((a) => ({ value: a._id.toString(), label: a.name })),
    categories: categories.map((c) => ({ value: c._id.toString(), label: c.name })),
  };
}

// --- Authors ----------------------------------------------------------------

export type AdminAuthorRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  featured: boolean;
  photo: string;
  titleCount: number;
};

export async function listAuthorsAdmin(filters: { q?: string } = {}): Promise<AdminAuthorRow[]> {
  await connectToDatabase();
  const docs = await Author.find().sort({ name: 1 }).lean();

  // One grouped count rather than a query per author.
  const counts = await Publication.aggregate<{ _id: unknown; n: number }>([
    { $group: { _id: "$author", n: { $sum: 1 } } },
  ]);
  const countBy = new Map(counts.map((c) => [String(c._id), c.n]));

  const term = filters.q?.trim().toLowerCase();
  return docs
    .map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      role: doc.role ?? "",
      featured: doc.featured,
      photo: doc.photo ?? "",
      titleCount: countBy.get(doc._id.toString()) ?? 0,
    }))
    .filter((row) =>
      term ? [row.name, row.role, row.slug].some((v) => v.toLowerCase().includes(term)) : true,
    );
}

export type AuthorFormValues = {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  photo: string;
  featured: boolean;
  socials: { label: string; href: string }[];
};

export async function getAuthorForEdit(id: string): Promise<AuthorFormValues | null> {
  await connectToDatabase();
  const doc = await Author.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    role: doc.role ?? "",
    bio: doc.bio,
    photo: doc.photo ?? "",
    featured: doc.featured,
    socials: (doc.socials ?? []).map((s) => ({ label: s.label, href: s.href })),
  };
}

// --- Categories -------------------------------------------------------------

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  publicationCount: number;
  articleCount: number;
};

export async function listCategoriesAdmin(): Promise<AdminCategoryRow[]> {
  await connectToDatabase();
  const [docs, pubCounts, artCounts] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Publication.aggregate<{ _id: unknown; n: number }>([
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]),
    Article.aggregate<{ _id: unknown; n: number }>([
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]),
  ]);

  const pubBy = new Map(pubCounts.map((c) => [String(c._id), c.n]));
  const artBy = new Map(artCounts.map((c) => [String(c._id), c.n]));

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    publicationCount: pubBy.get(doc._id.toString()) ?? 0,
    articleCount: artBy.get(doc._id.toString()) ?? 0,
  }));
}

export async function getCategoryForEdit(
  id: string,
): Promise<{ id: string; name: string; slug: string; description: string } | null> {
  await connectToDatabase();
  const doc = await Category.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
  };
}

// --- Articles ---------------------------------------------------------------

export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  authorName: string;
  status: string;
  featured: boolean;
  publishedAt: Date;
};

export async function listArticlesAdmin(
  filters: { q?: string; status?: string } = {},
): Promise<AdminArticleRow[]> {
  await connectToDatabase();
  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;

  const docs = await Article.find(match)
    .sort({ publishedAt: -1 })
    .populate<{ category: { name: string } }>("category", "name")
    .lean();

  const term = filters.q?.trim().toLowerCase();
  return docs
    .map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      slug: doc.slug,
      categoryName: doc.category?.name ?? "—",
      authorName: doc.authorName,
      status: doc.status,
      featured: doc.featured,
      publishedAt: new Date(doc.publishedAt),
    }))
    .filter((row) =>
      term
        ? [row.title, row.slug, row.authorName].some((v) => v.toLowerCase().includes(term))
        : true,
    );
}

export type ArticleFormValues = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  authorName: string;
  category: string;
  tags: string;
  publishedAt: string;
  status: string;
  featured: boolean;
};

export async function getArticleForEdit(id: string): Promise<ArticleFormValues | null> {
  await connectToDatabase();
  const doc = await Article.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    body: doc.body,
    coverImage: doc.coverImage ?? "",
    authorName: doc.authorName,
    category: doc.category.toString(),
    tags: (doc.tags ?? []).join(", "),
    publishedAt: new Date(doc.publishedAt).toISOString().slice(0, 10),
    status: doc.status,
    featured: doc.featured,
  };
}

// --- Services ---------------------------------------------------------------

export type AdminServiceRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  icon: string;
  order: number;
  status: string;
};

export async function listServicesAdmin(): Promise<AdminServiceRow[]> {
  await connectToDatabase();
  const docs = await Service.find().sort({ order: 1, title: 1 }).lean();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    icon: doc.icon,
    order: doc.order,
    status: doc.status,
  }));
}

export type ServiceFormValues = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  icon: string;
  order: number;
  status: string;
};

export async function getServiceForEdit(id: string): Promise<ServiceFormValues | null> {
  await connectToDatabase();
  const doc = await Service.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    body: doc.body,
    icon: doc.icon,
    order: doc.order,
    status: doc.status,
  };
}

// --- Manuscripts ------------------------------------------------------------

export type AdminSubmissionRow = {
  id: string;
  title: string;
  authorName: string;
  email: string;
  genre: string;
  wordCount: number;
  status: string;
  submittedAt: Date;
};

export async function listSubmissionsAdmin(
  filters: { q?: string; status?: string } = {},
): Promise<AdminSubmissionRow[]> {
  await connectToDatabase();
  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;

  const docs = await ManuscriptSubmission.find(match).sort({ submittedAt: -1 }).lean();
  const term = filters.q?.trim().toLowerCase();

  return docs
    .map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      authorName: doc.authorName,
      email: doc.email,
      genre: doc.genre,
      wordCount: doc.wordCount,
      status: doc.status,
      submittedAt: new Date(doc.submittedAt),
    }))
    .filter((row) =>
      term
        ? [row.title, row.authorName, row.email].some((v) => v.toLowerCase().includes(term))
        : true,
    );
}

export type SubmissionDetail = AdminSubmissionRow & {
  phone: string;
  preferredFormat: string;
  synopsis: string;
  fileName: string;
  fileSize: number;
  adminNotes: string;
};

export async function getSubmission(id: string): Promise<SubmissionDetail | null> {
  await connectToDatabase();
  const doc = await ManuscriptSubmission.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    authorName: doc.authorName,
    email: doc.email,
    phone: doc.phone ?? "",
    genre: doc.genre,
    preferredFormat: doc.preferredFormat ?? "",
    wordCount: doc.wordCount,
    synopsis: doc.synopsis,
    fileName: doc.fileName ?? "",
    fileSize: doc.fileSize ?? 0,
    status: doc.status,
    adminNotes: doc.adminNotes ?? "",
    submittedAt: new Date(doc.submittedAt),
  };
}

// --- Messages ---------------------------------------------------------------

export type AdminMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  read: boolean;
  archived: boolean;
  createdAt: Date;
};

export async function listMessagesAdmin(
  filters: { q?: string; status?: string } = {},
): Promise<AdminMessageRow[]> {
  await connectToDatabase();
  const match: Record<string, unknown> = {};
  if (filters.status === "archived") match.archived = true;
  else if (filters.status === "unread") Object.assign(match, { archived: false, read: false });
  else match.archived = false;

  const docs = await ContactMessage.find(match).sort({ createdAt: -1 }).lean();
  const term = filters.q?.trim().toLowerCase();

  return docs
    .map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      read: doc.read,
      archived: doc.archived,
      createdAt: new Date(doc.createdAt),
    }))
    .filter((row) =>
      term ? [row.name, row.email, row.subject].some((v) => v.toLowerCase().includes(term)) : true,
    );
}

export type MessageDetail = AdminMessageRow & { phone: string; message: string };

export async function getMessage(id: string): Promise<MessageDetail | null> {
  await connectToDatabase();
  const doc = await ContactMessage.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone ?? "",
    subject: doc.subject,
    message: doc.message,
    read: doc.read,
    archived: doc.archived,
    createdAt: new Date(doc.createdAt),
  };
}

// --- Site settings ----------------------------------------------------------

export type SettingsFormValues = {
  name: string;
  tagline: string;
  description: string;
  contact: {
    email: string;
    phone: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
  };
  socials: { label: string; href: string }[];
  footerText: string;
};

export async function getSettingsForEdit(): Promise<SettingsFormValues | null> {
  await connectToDatabase();
  const doc = await SiteSettings.findOne({ key: "site" }).lean();
  if (!doc) return null;
  return {
    name: doc.name,
    tagline: doc.tagline,
    description: doc.description,
    contact: {
      email: doc.contact.email,
      phone: doc.contact.phone,
      address: {
        line1: doc.contact.address.line1,
        line2: doc.contact.address.line2 ?? "",
        city: doc.contact.address.city,
        region: doc.contact.address.region,
        postalCode: doc.contact.address.postalCode,
        country: doc.contact.address.country,
      },
    },
    socials: (doc.socials ?? []).map((s) => ({ label: s.label, href: s.href })),
    footerText: doc.footerText ?? "",
  };
}

// --- Orders -----------------------------------------------------------------

export type AdminOrderRow = {
  id: string;
  reference: string;
  customerName: string;
  email: string;
  total: number;
  currency: string;
  status: string;
  fulfilment: string;
  requiresShipping: boolean;
  itemCount: number;
  createdAt: Date;
};

export async function listOrdersAdmin(
  filters: { q?: string; status?: string } = {},
): Promise<AdminOrderRow[]> {
  await connectToDatabase();

  const match: Record<string, unknown> = {};
  if (filters.status === "awaiting") {
    // What the admin actually has to act on: paid, physical, not yet sent.
    Object.assign(match, { status: "paid", fulfilment: { $in: ["pending", "packed"] } });
  } else if (filters.status) {
    match.status = filters.status;
  }

  const docs = await Order.find(match).sort({ createdAt: -1 }).limit(200).lean();
  const term = filters.q?.trim().toLowerCase();

  return docs
    .map((doc) => ({
      id: doc._id.toString(),
      reference: doc.reference,
      customerName: doc.customerName,
      email: doc.email,
      total: doc.total,
      currency: doc.currency,
      status: doc.status,
      fulfilment: doc.fulfilment,
      requiresShipping: doc.requiresShipping,
      itemCount: doc.items.reduce((n, i) => n + i.quantity, 0),
      createdAt: new Date(doc.createdAt),
    }))
    .filter((row) =>
      term
        ? [row.reference, row.customerName, row.email].some((v) => v.toLowerCase().includes(term))
        : true,
    );
}

export type AdminOrderDetail = AdminOrderRow & {
  phone: string;
  items: {
    title: string;
    slug: string;
    edition: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    requiresShipping: boolean;
  }[];
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode?: string;
    country: string;
  };
  paystackReference: string;
  paidAt: Date | null;
  adminNotes: string;
};

export async function getOrder(id: string): Promise<AdminOrderDetail | null> {
  await connectToDatabase();
  const doc = await Order.findById(id).lean();
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    reference: doc.reference,
    customerName: doc.customerName,
    email: doc.email,
    phone: doc.phone ?? "",
    total: doc.total,
    currency: doc.currency,
    status: doc.status,
    fulfilment: doc.fulfilment,
    requiresShipping: doc.requiresShipping,
    itemCount: doc.items.reduce((n, i) => n + i.quantity, 0),
    createdAt: new Date(doc.createdAt),
    items: doc.items.map((i) => ({
      title: i.title,
      slug: i.slug,
      edition: i.edition,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.unitPrice * i.quantity,
      requiresShipping: i.requiresShipping,
    })),
    ...(doc.shippingAddress?.line1
      ? {
          shippingAddress: {
            line1: doc.shippingAddress.line1,
            line2: doc.shippingAddress.line2 ?? undefined,
            city: doc.shippingAddress.city,
            region: doc.shippingAddress.region,
            postalCode: doc.shippingAddress.postalCode ?? undefined,
            country: doc.shippingAddress.country,
          },
        }
      : {}),
    paystackReference: doc.paystackReference ?? "",
    paidAt: doc.paidAt ? new Date(doc.paidAt) : null,
    adminNotes: doc.adminNotes ?? "",
  };
}

export async function getOrderCounts(): Promise<{ awaiting: number; paidTotal: number }> {
  await connectToDatabase();
  const [awaiting, paid] = await Promise.all([
    Order.countDocuments({ status: "paid", fulfilment: { $in: ["pending", "packed"] } }),
    Order.aggregate<{ total: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);
  return { awaiting, paidTotal: paid[0]?.total ?? 0 };
}
