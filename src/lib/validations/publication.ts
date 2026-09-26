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

export const publicationSchema = z.object({
  title: z.string().trim().min(2, "A title is required.").max(200),
  slug: slugSchema,
  author: objectIdSchema,
  category: objectIdSchema,
  isbn: z.string().trim().min(5, "An ISBN is required.").max(40),
  coverImage: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
  excerpt: z.string().trim().min(10, "Write a short excerpt.").max(300),
  description: z.string().trim().min(30, "Write a fuller description.").max(5000),
  publicationDate: z.coerce.date({ message: "Choose a publication date." }),
  format: z.enum(PUBLICATION_FORMATS, { message: "Choose a format." }),
  pages: z.coerce
    .number({ message: "Enter the page count." })
    .int("Whole numbers only.")
    .min(1, "Must be at least 1.")
    .max(20000),
  featured: z.boolean().default(false),
  status: z.enum(PUBLICATION_STATUSES).default("draft"),
});

export type PublicationInput = z.input<typeof publicationSchema>;
export type PublicationValues = z.output<typeof publicationSchema>;
