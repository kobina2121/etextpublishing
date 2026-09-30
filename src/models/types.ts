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
export type UserRole = "admin" | "editor";

export type UserDoc = WithTimestamps & {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
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
  };
  status: OrderStatusValue;
  fulfilment: FulfilmentStatusValue;
  paystackReference?: string;
  paidAt?: Date;
  /** Guards against a replayed or duplicated webhook fulfilling twice. */
  fulfilledAt?: Date;
  adminNotes?: string;
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
  /** Softcopy only: object key for the purchasable file. Phase 7. */
  digitalFileKey?: string;
};

export type EditionDoc = {
  available: boolean;
  price: number;
  /** Hardcopy only; a download cannot run out, so it stays 0. */
  stockQuantity: number;
};

export type ArticleDoc = WithTimestamps & {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: string;
  authorName: string;
  category: Types.ObjectId;
  tags: string[];
  publishedAt: Date;
  status: PublicationStatusValue;
  featured: boolean;
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

export type MagicLinkTokenDoc = WithTimestamps & {
  _id: Types.ObjectId;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  requestedIp?: string;
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
