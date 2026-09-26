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
  format: PublicationFormatValue;
  pages: number;
  featured: boolean;
  status: PublicationStatusValue;
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
