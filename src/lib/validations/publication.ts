import { z } from "zod";

import { PUBLICATION_STATUSES } from "@/types/content";

/** Lowercase, hyphenated, no leading/trailing hyphen. */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "A slug is required.")
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Select a valid option.");

/**
 * Either an uploaded image (a same-origin /api/images/... path) or an external
 * URL. Relative paths would fail a plain .url() check, so both are allowed
 * explicitly rather than loosening the validation to any string.
 */
export const imageRefSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      /^\/api\/images\/[a-f\d]{24}$/i.test(value) ||
      /^https?:\/\/\S+$/i.test(value),
    "Upload an image, or paste a valid http(s) URL.",
  )
  .optional()
  .default("");

/**
 * Softcopy files: 50 MB through Vercel Blob, where the browser uploads straight
 * to storage; 4 MB without it, when the file passes through our server and
 * Vercel's 4.5 MB request limit applies.
 */
export const SOFTCOPY_BLOB_MAX_BYTES = 50 * 1024 * 1024;
export const SOFTCOPY_DB_MAX_BYTES = 4 * 1024 * 1024;

export const CURRENCIES = ["GHS", "NGN", "USD", "ZAR", "KES"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * A price a person types, in major units. Shared by both editions so they
 * cannot drift apart in what they accept.
 */
const priceMajorSchema = z.coerce
  .number({ message: "Enter a price, or 0 if it is not for sale." })
  .min(0, "A price cannot be negative.")
  .max(1_000_000)
  .refine(
    (v) => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
    { message: "Use at most two decimal places." },
  )
  .default(0);

export const publicationSchema = z
  .object({
    title: z.string().trim().min(2, "A title is required.").max(200),
    slug: slugSchema,
    author: objectIdSchema,
    category: objectIdSchema,
    isbn: z.string().trim().min(5, "An ISBN is required.").max(40),
    coverImage: imageRefSchema,
    excerpt: z.string().trim().min(10, "Write a short excerpt.").max(300),
    description: z.string().trim().min(30, "Write a fuller description.").max(5000),
    publicationDate: z.coerce.date({ message: "Choose a publication date." }),
    pages: z.coerce
      .number({ message: "Enter the page count." })
      .int("Whole numbers only.")
      .min(1, "Must be at least 1.")
      .max(20000),
    currency: z.enum(CURRENCIES).default("GHS"),

    /**
     * Editions are entered in major units — what a person types — and converted
     * to integer minor units before storage. Two decimal places only; a third
     * would be silently rounded away at the currency boundary.
     */
    hardcopyAvailable: z.boolean().default(false),
    hardcopyPriceMajor: priceMajorSchema,
    hardcopyStock: z.coerce
      .number({ message: "Enter a stock count." })
      .int("Whole numbers only.")
      .min(0)
      .max(100000)
      .default(0),

    softcopyAvailable: z.boolean().default(false),
    softcopyPriceMajor: priceMajorSchema,
    /** The downloadable file, as a storage key from the upload routes. */
    softcopyFileKey: z
      .string()
      .trim()
      .refine((v) => v === "" || /^(blob|db):\S+$/.test(v), "Upload the file again.")
      .optional()
      .default(""),
    softcopyFileName: z.string().trim().max(200).optional().default(""),
    softcopyFileSize: z.coerce.number().int().min(0).optional().default(0),
    featured: z.boolean().default(false),
    status: z.enum(PUBLICATION_STATUSES).default("draft"),
  })
  .refine((v) => !v.hardcopyAvailable || v.hardcopyPriceMajor > 0, {
    message: "Set a hardcopy price, or turn the hardcopy off.",
    path: ["hardcopyPriceMajor"],
  })
  .refine((v) => !v.softcopyAvailable || v.softcopyPriceMajor > 0, {
    message: "Set a softcopy price, or turn the softcopy off.",
    path: ["softcopyPriceMajor"],
  })
  // Selling a download that does not exist would take money for nothing.
  .refine((v) => !v.softcopyAvailable || Boolean(v.softcopyFileKey), {
    message: "Upload the softcopy file, or turn the softcopy off.",
    path: ["softcopyFileKey"],
  });

export type PublicationInput = z.input<typeof publicationSchema>;
export type PublicationValues = z.output<typeof publicationSchema>;
