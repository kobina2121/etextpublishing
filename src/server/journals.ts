import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import type { JournalInput } from "@/lib/validations/journal";
import { Journal } from "@/models";
import type { JournalDoc } from "@/models/types";

/** A journal entry as the public site shows it. */
export type PublicJournal = {
  id: string;
  title: string;
  slug: string;
  authors: string[];
  volume: string;
  issue: string;
  publishedAt: Date;
  abstract: string;
  keywords: string[];
  coverImage: string;
  hasPdf: boolean;
  pdfSize: number;
  links: { label: string; href: string }[];
};

function toPublic(doc: JournalDoc): PublicJournal {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    authors: doc.authors ?? [],
    volume: doc.volume ?? "",
    issue: doc.issue ?? "",
    publishedAt: new Date(doc.publishedAt),
    abstract: doc.abstract,
    keywords: doc.keywords ?? [],
    coverImage: doc.coverImage ?? "",
    hasPdf: Boolean(doc.pdfKey),
    pdfSize: doc.pdfSize ?? 0,
    links: (doc.links ?? []).map(({ label, href }) => ({ label, href })),
  };
}

/** "Vol. 3, No. 2" — whichever parts exist. */
export function volumeIssue(journal: Pick<PublicJournal, "volume" | "issue">): string {
  return [journal.volume && `Vol. ${journal.volume}`, journal.issue && `No. ${journal.issue}`]
    .filter(Boolean)
    .join(", ");
}

/** Published entries, newest first. Free text search over title, authors and keywords. */
export async function listJournals({
  q,
  limit = 200,
}: { q?: string; limit?: number } = {}): Promise<PublicJournal[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { status: "published" };
  const term = q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: pattern }, { authors: pattern }, { keywords: pattern }];
  }
  const docs = await Journal.find(filter)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean<JournalDoc[]>();
  return docs.map(toPublic);
}

/** A published entry by slug; drafts are not reachable from the site. */
export async function getJournalBySlug(slug: string): Promise<PublicJournal | null> {
  await connectToDatabase();
  const doc = await Journal.findOne({ slug, status: "published" }).lean<JournalDoc | null>();
  return doc ? toPublic(doc) : null;
}

/** Storage details for serving the PDF of a published entry. */
export async function getPublishedJournalPdf(
  slug: string,
): Promise<{ key: string; fileName: string } | null> {
  await connectToDatabase();
  const doc = await Journal.findOne({ slug, status: "published" })
    .select("pdfKey pdfName slug")
    .lean<Pick<JournalDoc, "pdfKey" | "pdfName" | "slug"> | null>();
  if (!doc?.pdfKey) return null;
  return { key: doc.pdfKey, fileName: doc.pdfName || `${doc.slug}.pdf` };
}

export async function getJournalSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await Journal.find({ status: "published" })
    .select("slug")
    .lean<{ slug: string }[]>();
  return docs.map((doc) => doc.slug);
}

// --- Admin -----------------------------------------------------------------

export type AdminJournalRow = {
  id: string;
  title: string;
  slug: string;
  authors: string;
  volumeIssue: string;
  publishedAt: Date;
  status: "draft" | "published";
  hasPdf: boolean;
};

export async function listJournalsAdmin({
  q,
  status,
}: { q?: string; status?: string } = {}): Promise<AdminJournalRow[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (status === "draft" || status === "published") filter.status = status;
  const term = q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: pattern }, { authors: pattern }, { slug: pattern }];
  }
  const docs = await Journal.find(filter).sort({ publishedAt: -1 }).limit(500).lean<JournalDoc[]>();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    authors: (doc.authors ?? []).join(", "),
    volumeIssue: volumeIssue({ volume: doc.volume ?? "", issue: doc.issue ?? "" }),
    publishedAt: new Date(doc.publishedAt),
    status: doc.status,
    hasPdf: Boolean(doc.pdfKey),
  }));
}

/** Form values for editing; lists back to comma-separated text. */
export async function getJournalForEdit(
  id: string,
): Promise<(JournalInput & { id: string; publishedAt: string }) | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  const doc = await Journal.findById(id).lean<JournalDoc | null>();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    authors: (doc.authors ?? []).join(", "),
    volume: doc.volume ?? "",
    issue: doc.issue ?? "",
    // The date input wants YYYY-MM-DD.
    publishedAt: new Date(doc.publishedAt).toISOString().slice(0, 10),
    abstract: doc.abstract,
    keywords: (doc.keywords ?? []).join(", "),
    coverImage: doc.coverImage ?? "",
    pdfKey: doc.pdfKey ?? "",
    pdfName: doc.pdfName ?? "",
    pdfSize: doc.pdfSize ?? 0,
    links: (doc.links ?? []).map(({ label, href }) => ({ label, href })),
    status: doc.status,
  };
}
