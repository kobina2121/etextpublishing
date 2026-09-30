import { Schema, model, models, type Model } from "mongoose";

import type {
  ArticleDoc,
  ImageDoc,
  MagicLinkTokenDoc,
  OrderDoc,
  RateLimitDoc,
  AuthorDoc,
  CategoryDoc,
  ContactMessageDoc,
  ManuscriptSubmissionDoc,
  PublicationDoc,
  ServiceDoc,
  SiteSettingsDoc,
  UserDoc,
} from "@/models/types";

/**
 * Mongoose models.
 *
 * Each is registered through `defineModel`, which reuses an existing
 * compilation if one is present. Without that, a hot reload re-evaluates this
 * module and Mongoose throws OverwriteModelError on the second pass.
 */
function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

const STATUSES = ["draft", "published", "archived"] as const;
/** Manuscript-submission vocabulary only; what is for sale is EDITION_KINDS. */
const FORMATS = ["paperback", "hardcover", "ebook", "audiobook"] as const;
const EDITION_KINDS = ["hardcopy", "softcopy"] as const;

const linkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// --- User -------------------------------------------------------------------

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional: a Google account has no password here, and must not be given a
    // guessable placeholder one.
    passwordHash: { type: String },
    name: { type: String, required: true, trim: true },
    // `customer` is the floor, and the default: nothing in the sign-in path
    // may create an account with more than this.
    role: {
      type: String,
      enum: ["admin", "editor", "customer"],
      default: "customer",
      required: true,
    },
    image: { type: String, trim: true },
    googleId: { type: String, trim: true, index: true },
  },
  { timestamps: true },
);

// --- Category ---------------------------------------------------------------

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

// --- Author -----------------------------------------------------------------

const authorSchema = new Schema<AuthorDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, trim: true },
    bio: { type: String, required: true },
    photo: { type: String, trim: true },
    featured: { type: Boolean, default: false, index: true },
    socials: { type: [linkSchema], default: [] },
  },
  { timestamps: true },
);

// --- Publication ------------------------------------------------------------

/**
 * A buyable edition. Stored as a subdocument per kind rather than an array, so
 * "the hardcopy price" is a path (`editions.hardcopy.price`) that can be
 * queried and indexed, not a position in a list.
 */
const editionSchema = new Schema(
  {
    available: { type: Boolean, default: false, required: true },
    price: { type: Number, default: 0, min: 0, required: true },
    stockQuantity: { type: Number, default: 0, min: 0, required: true },
  },
  { _id: false },
);

const publicationSchema = new Schema<PublicationDoc>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "Author", required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    isbn: { type: String, required: true, trim: true },
    coverImage: { type: String, trim: true },
    description: { type: String, required: true },
    excerpt: { type: String, required: true },
    publicationDate: { type: Date, required: true },
    pages: { type: Number, required: true, min: 1 },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: STATUSES, default: "draft", required: true },

    // One title, up to two things a buyer can pay for. Both subdocuments
    // always exist; `available` is what an admin turns on and off. Prices are
    // integer minor units, and 0 means not for sale whatever `available` says.
    editions: {
      hardcopy: { type: editionSchema, default: () => ({}) },
      softcopy: { type: editionSchema, default: () => ({}) },
    },
    currency: { type: String, default: "GHS", uppercase: true, trim: true, required: true },
    digitalFileKey: { type: String, trim: true },
  },
  { timestamps: true },
);

// Drives the default listing: published titles, newest first.
publicationSchema.index({ status: 1, publicationDate: -1 });
publicationSchema.index({ status: 1, featured: 1, publicationDate: -1 });

// --- Article ----------------------------------------------------------------

const articleSchema = new Schema<ArticleDoc>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    coverImage: { type: String, trim: true },
    authorName: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    tags: { type: [String], default: [] },
    publishedAt: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "draft", required: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

articleSchema.index({ status: 1, publishedAt: -1 });

// --- Service ----------------------------------------------------------------

const serviceSchema = new Schema<ServiceDoc>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },
    icon: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: STATUSES, default: "draft", required: true },
  },
  { timestamps: true },
);

serviceSchema.index({ status: 1, order: 1 });

// --- ManuscriptSubmission ---------------------------------------------------

const manuscriptSubmissionSchema = new Schema<ManuscriptSubmissionDoc>(
  {
    authorName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    genre: { type: String, required: true, trim: true },
    preferredFormat: { type: String, enum: FORMATS },
    wordCount: { type: Number, required: true, min: 0 },
    synopsis: { type: String, required: true },
    fileKey: { type: String, trim: true },
    fileName: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["new", "under_review", "accepted", "rejected", "archived"],
      default: "new",
      required: true,
    },
    adminNotes: { type: String },
    submittedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

manuscriptSubmissionSchema.index({ status: 1, submittedAt: -1 });

// --- ContactMessage ---------------------------------------------------------

const contactMessageSchema = new Schema<ContactMessageDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

contactMessageSchema.index({ archived: 1, read: 1, createdAt: -1 });

// --- Order ------------------------------------------------------------------

const orderItemSchema = new Schema(
  {
    publication: { type: Schema.Types.ObjectId, ref: "Publication", required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    edition: { type: String, enum: EDITION_KINDS, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    requiresShipping: { type: Boolean, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    // Set when the buyer was signed in. Guest checkout stays supported, so an
    // order is matched back to an account by verified email as well.
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    requiresShipping: { type: Boolean, required: true, default: false },
    shippingAddress: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      region: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "abandoned"],
      default: "pending",
      required: true,
    },
    fulfilment: {
      type: String,
      enum: ["not_required", "pending", "packed", "shipped", "delivered"],
      default: "not_required",
      required: true,
    },
    paystackReference: { type: String, trim: true },
    paidAt: { type: Date },
    // Set once, inside a conditional update, so a replayed webhook cannot
    // fulfil the same order twice.
    fulfilledAt: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ fulfilment: 1, createdAt: -1 });
orderSchema.index({ email: 1, createdAt: -1 });

// --- RateLimit --------------------------------------------------------------

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    key: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

// Attempts age out after an hour, which is longer than any window we use, so
// the collection cannot grow without bound.
rateLimitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// --- MagicLinkToken ---------------------------------------------------------

const magicLinkTokenSchema = new Schema<MagicLinkTokenDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    requestedIp: { type: String, trim: true },
  },
  { timestamps: true },
);

// Mongo removes the document once it expires, so spent and stale links do not
// accumulate. This is cleanup, not security — expiry is still checked on use.
magicLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// --- Image ------------------------------------------------------------------

const imageSchema = new Schema<ImageDoc>(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    filename: { type: String, required: true, trim: true },
    width: { type: Number },
    height: { type: Number },
  },
  { timestamps: true },
);

// --- SiteSettings -----------------------------------------------------------

const siteSettingsSchema = new Schema<SiteSettingsDoc>(
  {
    // Unique constant: the collection is a singleton, enforced by the index
    // rather than by convention, so a second document cannot be created.
    key: { type: String, enum: ["site"], default: "site", unique: true, required: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    logo: { type: String, trim: true },
    contact: {
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: {
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
      },
    },
    socials: { type: [linkSchema], default: [] },
    seo: {
      defaultTitle: { type: String, trim: true },
      defaultDescription: { type: String, trim: true },
    },
    footerText: { type: String, trim: true },
  },
  { timestamps: true },
);

export const User = defineModel<UserDoc>("User", userSchema);
export const Category = defineModel<CategoryDoc>("Category", categorySchema);
export const Author = defineModel<AuthorDoc>("Author", authorSchema);
export const Publication = defineModel<PublicationDoc>("Publication", publicationSchema);
export const Article = defineModel<ArticleDoc>("Article", articleSchema);
export const Service = defineModel<ServiceDoc>("Service", serviceSchema);
export const ManuscriptSubmission = defineModel<ManuscriptSubmissionDoc>(
  "ManuscriptSubmission",
  manuscriptSubmissionSchema,
);
export const ContactMessage = defineModel<ContactMessageDoc>(
  "ContactMessage",
  contactMessageSchema,
);
export const Order = defineModel<OrderDoc>("Order", orderSchema);
export const RateLimit = defineModel<RateLimitDoc>("RateLimit", rateLimitSchema);
export const MagicLinkToken = defineModel<MagicLinkTokenDoc>(
  "MagicLinkToken",
  magicLinkTokenSchema,
);
export const Image = defineModel<ImageDoc>("Image", imageSchema);
export const SiteSettings = defineModel<SiteSettingsDoc>("SiteSettings", siteSettingsSchema);
