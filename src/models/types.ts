import type { Types } from "mongoose";

/**
 * Shared document shapes.
 *
 * These describe what Mongoose stores. The public-facing types in
 * `@/types/content` describe what pages consume; `@/server/queries` maps
 * between the two, so a schema change never reaches a component directly.
 */

export type WithTimestamps = {
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationStatusValue = "draft" | "published" | "archived";
export type PublicationFormatValue = "paperback" | "hardcover" | "ebook" | "audiobook";
export type EditionKindValue = "hardcopy" | "softcopy";
export type SubmissionStatusValue = "new" | "under_review" | "accepted" | "rejected" | "archived";
/**
 * `customer` is a reader with an account, not staff. It grants nothing beyond
 * seeing one's own orders, and no sign-in path can ever mint anything higher:
 * a role above customer is only ever set deliberately, by seed or by hand.
 */
export type UserRole = "admin" | "editor" | "customer";

export type UserDoc = WithTimestamps & {
  _id: Types.ObjectId;
  email: string;
  /** Absent for accounts that only ever sign in through a provider. */
  passwordHash?: string;
  name: string;
  role: UserRole;
  image?: string;
  /** Provider account ids, so a returning user matches even if they change name. */
  googleId?: string;
  /**
   * When the owner proved they read this mailbox by following an emailed link.
   * Google linking proves the same thing; either one makes the address trusted.
   */
  emailVerifiedAt?: Date;
  /**
   * Bumped when the password changes or is reset. Every session carries the
   * version it was issued under; one that no longer matches is signed out.
   */
  sessionVersion?: number;
};

export type CategoryDoc = WithTimestamps & {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
};

export type AuthorDoc = WithTimestamps & {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  role?: string;
  bio: string;
  photo?: string;
  featured: boolean;
  socials: { label: string; href: string }[];
};

export const ORDER_STATUSES = ["pending", "paid", "failed", "abandoned"] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const FULFILMENT_STATUSES = [
  "not_required",
  "pending",
  "packed",
  "shipped",
  "delivered",
] as const;
export type FulfilmentStatusValue = (typeof FULFILMENT_STATUSES)[number];

export type OrderItemDoc = {
  publication: Types.ObjectId;
  /** Snapshot: an order must not change when a title is later repriced or renamed. */
  title: string;
  slug: string;
  edition: EditionKindValue;
  unitPrice: number;
  quantity: number;
  requiresShipping: boolean;
};

export type OrderDoc = WithTimestamps & {
  _id: Types.ObjectId;
  /** Present when the buyer was signed in; guest orders have none. */
  user?: Types.ObjectId;
  /** Our reference, sent to Paystack and used to reconcile the callback. */
  reference: string;
  email: string;
  customerName: string;
  phone?: string;
  items: OrderItemDoc[];
  /** Integer minor units, recomputed server-side. Never taken from the client. */
  total: number;
  currency: string;
  requiresShipping: boolean;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode?: string;
    country: string;
    /** GhanaPost GPS digital address, e.g. GA-123-4567. Often more reliable than a street. */
    digitalAddress?: string;
    /** Landmarks, directions or a time to deliver — for the courier. */
    instructions?: string;
  };
  status: OrderStatusValue;
  fulfilment: FulfilmentStatusValue;
  paystackReference?: string;
  paidAt?: Date;
  /** Guards against a replayed or duplicated webhook fulfilling twice. */
  fulfilledAt?: Date;
  adminNotes?: string;
  /**
   * Set when a paid order could not take stock because it had run out — the
   * last copy sold twice while both buyers were paying. Shown to admins as a
   * warning until it is dealt with.
   */
  stockShortfall?: string;
};

export type PublicationDoc = WithTimestamps & {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  author: Types.ObjectId;
  category: Types.ObjectId;
  isbn: string;
  coverImage?: string;
  description: string;
  excerpt: string;
  publicationDate: Date;
  pages: number;
  featured: boolean;
  status: PublicationStatusValue;

  /**
   * One title, up to two things a buyer can pay for.
   *
   * Prices are integer minor units (pesewas for GHS), never floats. Storing
   * money as a decimal invites rounding errors that only surface once real
   * sums are being added together. 0 means not for sale, whichever way
   * `available` is set.
   */
  editions: Record<EditionKindValue, EditionDoc>;
  currency: string;
  /**
   * The softcopy file buyers download: a storage key (`blob:` or `db:`), never
   * a URL. Required while the softcopy is on sale.
   */
  digitalFileKey?: string;
  digitalFileName?: string;
  digitalFileSize?: number;
};

export type EditionDoc = {
  available: boolean;
  price: number;
  /** Hardcopy only; a download cannot run out, so it stays 0. */
  stockQuantity: number;
};

export type ServiceDoc = WithTimestamps & {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  body: string;
  icon: string;
  order: number;
  status: PublicationStatusValue;
};

export type ManuscriptSubmissionDoc = WithTimestamps & {
  _id: Types.ObjectId;
  authorName: string;
  email: string;
  phone?: string;
  title: string;
  genre: string;
  preferredFormat?: PublicationFormatValue;
  wordCount: number;
  synopsis: string;
  /** Object key in the private bucket prefix. Never a public URL. */
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  status: SubmissionStatusValue;
  adminNotes?: string;
  submittedAt: Date;
};

export type ContactMessageDoc = WithTimestamps & {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  read: boolean;
  archived: boolean;
};

/**
 * A single-use sign-in link.
 *
 * Only the SHA-256 hash of the token is stored, never the token itself: a leak
 * of this collection must not hand anyone a working sign-in link, for the same
 * reason passwords are hashed.
 */
/**
 * A counted attempt, used for rate limiting.
 *
 * Stored in Mongo rather than in memory because serverless instances do not
 * share memory: an in-process counter resets on every cold start and is
 * trivially evaded by spreading requests across instances.
 */
export type RateLimitDoc = {
  _id: Types.ObjectId;
  /** Scope plus subject, e.g. "login:someone@example.com". */
  key: string;
  createdAt: Date;
};

/**
 * A single-use password reset link.
 *
 * Only the SHA-256 hash of the token is stored: a leak of this collection must
 * not hand anyone a working reset link, for the same reason passwords are
 * hashed.
 */
export type PasswordResetTokenDoc = WithTimestamps & {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
};

export type ImageDoc = WithTimestamps & {
  _id: Types.ObjectId;
  /** Binary payload. Kept in Mongo so uploads work before object storage exists. */
  data: Buffer;
  contentType: string;
  size: number;
  /** Original filename, retained for display only — never used as a path. */
  filename: string;
  width?: number;
  height?: number;
};

/**
 * An uploaded manuscript.
 *
 * Kept apart from `ImageDoc` because it is private: images are served to
 * anyone, manuscripts only to an admin. Separate collections mean no route can
 * serve one by mistaking it for the other.
 */
export type ManuscriptFileDoc = WithTimestamps & {
  _id: Types.ObjectId;
  data: Buffer;
  /** Sniffed from the bytes on upload, never taken from the browser. */
  contentType: string;
  size: number;
  /** Original filename, retained for display only — never used as a path. */
  filename: string;
};

/**
 * A journal entry: an academic paper or issue, free for anyone to read.
 *
 * The full text is a PDF, read in the browser or downloaded. `pdfKey` is a
 * storage key, never a public URL: `blob:` for Vercel Blob, `db:` for the
 * MongoDB fallback. Only published entries are reachable from the site.
 */
export type JournalDoc = WithTimestamps & {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  authors: string[];
  volume?: string;
  issue?: string;
  publishedAt: Date;
  abstract: string;
  keywords: string[];
  coverImage?: string;
  pdfKey?: string;
  pdfName?: string;
  pdfSize?: number;
  /** Further reading shown under the article. */
  links?: { label: string; href: string }[];
  status: "draft" | "published";
};

/** A journal PDF kept in MongoDB, when Vercel Blob is not connected. */
export type JournalFileDoc = WithTimestamps & {
  _id: Types.ObjectId;
  data: Buffer;
  size: number;
  filename: string;
  contentType?: string;
};

/** A softcopy (PDF or EPUB) kept in MongoDB, when Vercel Blob is not connected. */
export type SoftcopyFileDoc = JournalFileDoc;

/**
 * The About page's words, edited from /admin/about.
 *
 * A singleton like SiteSettings. Until it is first saved, the page shows the
 * defaults in lib/about-defaults.ts — the text it shipped with.
 */
export type AboutPageDoc = WithTimestamps & {
  _id: Types.ObjectId;
  key: "about";
  heroTitle: string;
  heroDescription: string;
  /** Uploaded image URL or an external one; empty for the standard banner. */
  heroImage?: string;
  /** Plain text. A blank line starts a new paragraph. */
  intro: string;
  sectionTitle: string;
  sectionSubtitle?: string;
  pillars: { title: string; body: string }[];
};

export type SiteSettingsDoc = WithTimestamps & {
  _id: Types.ObjectId;
  /** Fixed discriminator that keeps this collection to a single document. */
  key: "site";
  name: string;
  tagline: string;
  description: string;
  logo?: string;
  contact: {
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
  };
  socials: { label: string; href: string }[];
  seo: { defaultTitle?: string; defaultDescription?: string };
  footerText?: string;
};
