import "server-only";

import { connectToDatabase } from "@/lib/db";
import {
  Article,
  Author,
  Category,
  ContactMessage,
  ManuscriptSubmission,
  Publication,
  Service,
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
  format: string;
  status: string;
  featured: boolean;
  publicationDate: Date;
};

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
      format: row.format,
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
  title: string;
  slug: string;
  author: string;
  category: string;
  isbn: string;
  coverImage: string;
  excerpt: string;
  description: string;
  publicationDate: string;
  format: string;
  pages: number;
  featured: boolean;
  status: string;
};

export async function getPublicationForEdit(id: string): Promise<PublicationFormValues | null> {
  await connectToDatabase();
  const doc = await Publication.findById(id).lean();
  if (!doc) return null;

  return {
    id: doc._id.toString(),
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
    format: doc.format,
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
