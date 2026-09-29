import { z } from "zod";

import { PUBLICATION_FORMATS, PUBLICATION_STATUSES } from "@/types/content";

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

export const CURRENCIES = ["GHS", "NGN", "USD", "ZAR", "KES"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const publicationSchema = z.object({
  title: z.string().trim().min(2, "A title is required.").max(200),
  slug: slugSchema,
  author: objectIdSchema,
  category: objectIdSchema,
  isbn: z.string().trim().min(5, "An ISBN is required.").max(40),
  coverImage: imageRefSchema,
  excerpt: z.string().trim().min(10, "Write a short excerpt.").max(300),
  description: z.string().trim().min(30, "Write a fuller description.").max(5000),
  publicationDate: z.coerce.date({ message: "Choose a publication date." }),
  format: z.enum(PUBLICATION_FORMATS, { message: "Choose a format." }),
  pages: z.coerce
    .number({ message: "Enter the page count." })
    .int("Whole numbers only.")
    .min(1, "Must be at least 1.")
    .max(20000),
  /**
   * Entered in major units — what a person types — and converted to integer
   * minor units before storage. Two decimal places only; a third would be
   * silently rounded away at the currency boundary.
   */
  priceMajor: z.coerce
    .number({ message: "Enter a price, or 0 if it is not for sale." })
    .min(0, "A price cannot be negative.")
    .max(1_000_000)
    .refine(
      (v) =>
        Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
      {
        message: "Use at most two decimal places.",
      },
    )
    .default(0),
  currency: z.enum(CURRENCIES).default("GHS"),
  stockQuantity: z.coerce
    .number({ message: "Enter a stock count." })
    .int("Whole numbers only.")
    .min(0)
    .max(100000)
    .default(0),
  featured: z.boolean().default(false),
  status: z.enum(PUBLICATION_STATUSES).default("draft"),
});

export type PublicationInput = z.input<typeof publicationSchema>;
export type PublicationValues = z.output<typeof publicationSchema>;
